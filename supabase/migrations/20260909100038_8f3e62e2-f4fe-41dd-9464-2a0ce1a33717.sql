-- 1. profile fields: real name, avatar, privacy + notification preferences
ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS avatar_in_nickname_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_prefs jsonb NOT NULL DEFAULT '{"comment_on_my_post": true, "reply_to_my_comment": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS name_confirmed_at timestamptz;

-- 2. never guess a name out of an email address again
CREATE OR REPLACE FUNCTION public.community_ensure_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); nm text; gn text; fn text;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  SELECT nullif(btrim(coalesce(u.raw_user_meta_data->>'given_name','')), ''),
         nullif(btrim(coalesce(u.raw_user_meta_data->>'family_name','')), ''),
         nullif(btrim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name','')), '')
    INTO gn, fn, nm
    FROM auth.users u WHERE u.id = uid;

  INSERT INTO public.community_profiles (user_id, display_name, first_name, last_name, name_confirmed_at)
  VALUES (
    uid,
    coalesce(nullif(btrim(concat_ws(' ', gn, fn)), ''), nm, 'חברה בקהילה'),
    gn,
    fn,
    CASE WHEN gn IS NOT NULL OR nm IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;
END $function$;

-- 3. author payload: avatar + privacy-safe seed
CREATE OR REPLACE FUNCTION public.community_author_json(_author uuid, _as_nick boolean, _viewer uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE nm text; nick text; label text; adm boolean; av text; nick_av boolean;
BEGIN
  SELECT display_name, nickname, avatar_url, coalesce(avatar_in_nickname_mode, false)
    INTO nm, nick, av, nick_av
    FROM public.community_profiles WHERE user_id = _author;
  adm := public.has_role(_viewer, 'admin');
  IF _as_nick THEN label := coalesce(nick, 'חברה בקהילה');
  ELSE label := coalesce(nm, 'חברה בקהילה');
  END IF;
  -- a personal photo is never shown behind a nickname without explicit consent
  IF _as_nick AND NOT coalesce(nick_av, false) THEN av := NULL; END IF;
  RETURN jsonb_build_object(
    'name', label,
    'initials', public.community_initials(label),
    'nickname', _as_nick,
    'mine', _author = _viewer,
    'real_name', CASE WHEN adm AND _as_nick THEN nm ELSE NULL END,
    'user_id', CASE WHEN adm THEN _author::text ELSE NULL END,
    'avatar_url', av,
    'seed', CASE WHEN _as_nick THEN coalesce(nick, label) ELSE _author::text END
  );
END $function$;

-- 4. one call the settings panel uses for everything it owns
CREATE OR REPLACE FUNCTION public.community_update_profile(
  _first text DEFAULT NULL,
  _last text DEFAULT NULL,
  _nick text DEFAULT NULL,
  _avatar text DEFAULT NULL,
  _clear_avatar boolean DEFAULT false,
  _avatar_in_nickname_mode boolean DEFAULT NULL,
  _notify_prefs jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); f text := nullif(btrim(coalesce(_first,'')),''); l text := nullif(btrim(coalesce(_last,'')),'');
        n text := nullif(btrim(coalesce(_nick,'')),''); res jsonb;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  PERFORM public.community_ensure_profile();

  IF f IS NOT NULL AND length(f) < 2 THEN RAISE EXCEPTION 'first_name_length'; END IF;
  IF f IS NOT NULL AND position('@' in f) > 0 THEN RAISE EXCEPTION 'name_is_email'; END IF;

  IF n IS NOT NULL THEN
    IF length(n) < 2 OR length(n) > 18 THEN RAISE EXCEPTION 'nickname_length'; END IF;
    IF EXISTS (SELECT 1 FROM public.community_profiles WHERE lower(nickname) = lower(n) AND user_id <> uid) THEN
      RAISE EXCEPTION 'nickname_taken';
    END IF;
  END IF;

  IF _avatar IS NOT NULL AND length(_avatar) > 400000 THEN RAISE EXCEPTION 'avatar_too_large'; END IF;

  UPDATE public.community_profiles SET
    first_name = coalesce(f, first_name),
    last_name  = CASE WHEN l IS NOT NULL THEN l ELSE last_name END,
    display_name = CASE
      WHEN f IS NOT NULL THEN btrim(concat_ws(' ', f, coalesce(l, last_name)))
      ELSE display_name END,
    name_confirmed_at = CASE WHEN f IS NOT NULL THEN now() ELSE name_confirmed_at END,
    nickname = coalesce(n, nickname),
    avatar_url = CASE WHEN _clear_avatar THEN NULL WHEN _avatar IS NOT NULL THEN _avatar ELSE avatar_url END,
    avatar_in_nickname_mode = coalesce(_avatar_in_nickname_mode, avatar_in_nickname_mode),
    notify_prefs = CASE WHEN _notify_prefs IS NULL THEN notify_prefs ELSE notify_prefs || _notify_prefs END,
    updated_at = now()
  WHERE user_id = uid;

  SELECT jsonb_build_object(
    'display_name', display_name,
    'initials', public.community_initials(display_name),
    'first_name', first_name,
    'last_name', last_name,
    'nickname', nickname,
    'avatar_url', avatar_url,
    'avatar_in_nickname_mode', avatar_in_nickname_mode,
    'notify_prefs', notify_prefs,
    'needs_name', first_name IS NULL
  ) INTO res FROM public.community_profiles WHERE user_id = uid;
  RETURN res;
END $function$;

GRANT EXECUTE ON FUNCTION public.community_update_profile(text, text, text, text, boolean, boolean, jsonb) TO authenticated;