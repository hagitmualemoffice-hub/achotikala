ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS show_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.community_touch_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
  END IF;
  UPDATE public.community_profiles
  SET last_seen_at = now()
  WHERE user_id = uid;
END;
$$;
REVOKE ALL ON FUNCTION public.community_touch_presence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_touch_presence() TO authenticated;

CREATE OR REPLACE FUNCTION public.community_author_json(_author uuid, _as_nick boolean, _viewer uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE nm text; nick text; label text; adm boolean; av text; nick_av boolean; visible_online boolean;
BEGIN
  SELECT display_name, nickname, avatar_url, coalesce(avatar_in_nickname_mode, false),
         coalesce(show_online, false) AND last_seen_at > now() - interval '5 minutes'
    INTO nm, nick, av, nick_av, visible_online
    FROM public.community_profiles WHERE user_id = _author;
  adm := public.has_role(_viewer, 'admin');
  IF _as_nick THEN label := coalesce(nick, 'חברה בקהילה');
  ELSE label := coalesce(nm, 'חברה בקהילה');
  END IF;
  IF _as_nick AND NOT coalesce(nick_av, false) THEN av := NULL; END IF;
  RETURN jsonb_build_object(
    'name', label,
    'initials', public.community_initials(label),
    'nickname', _as_nick,
    'mine', _author = _viewer,
    'real_name', CASE WHEN adm AND _as_nick THEN nm ELSE NULL END,
    'user_id', CASE WHEN adm THEN _author::text ELSE NULL END,
    'avatar_url', av,
    'seed', CASE WHEN _as_nick THEN coalesce(nick, label) ELSE _author::text END,
    'online', coalesce(visible_online, false)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.community_profile_json(_uid uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'display_name', display_name,
    'initials', public.community_initials(display_name),
    'first_name', first_name,
    'last_name', last_name,
    'nickname', nickname,
    'avatar_url', avatar_url,
    'avatar_in_nickname_mode', avatar_in_nickname_mode,
    'notify_prefs', notify_prefs,
    'show_online', show_online,
    'needs_name', first_name IS NULL
  ) FROM public.community_profiles WHERE user_id = _uid
$$;

CREATE OR REPLACE FUNCTION public.community_update_profile(
  _first text DEFAULT NULL,
  _last text DEFAULT NULL,
  _nick text DEFAULT NULL,
  _avatar text DEFAULT NULL,
  _clear_avatar boolean DEFAULT false,
  _avatar_in_nickname_mode boolean DEFAULT NULL,
  _notify_prefs jsonb DEFAULT NULL,
  _show_online boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    last_name = CASE WHEN l IS NOT NULL THEN l ELSE last_name END,
    display_name = CASE WHEN f IS NOT NULL THEN btrim(concat_ws(' ', f, coalesce(l, last_name))) ELSE display_name END,
    name_confirmed_at = CASE WHEN f IS NOT NULL THEN now() ELSE name_confirmed_at END,
    nickname = coalesce(n, nickname),
    avatar_url = CASE WHEN _clear_avatar THEN NULL WHEN _avatar IS NOT NULL THEN _avatar ELSE avatar_url END,
    avatar_in_nickname_mode = coalesce(_avatar_in_nickname_mode, avatar_in_nickname_mode),
    notify_prefs = CASE WHEN _notify_prefs IS NULL THEN notify_prefs ELSE notify_prefs || _notify_prefs END,
    show_online = coalesce(_show_online, show_online),
    last_seen_at = CASE WHEN coalesce(_show_online, show_online) THEN now() ELSE last_seen_at END,
    updated_at = now()
  WHERE user_id = uid;
  SELECT public.community_profile_json(uid) INTO res;
  RETURN res;
END;
$$;