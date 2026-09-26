-- expose a stable member id for non-nickname activity so members can open her profile
CREATE OR REPLACE FUNCTION public.community_author_json(_author uuid, _as_nick boolean, _viewer uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'profile_id', CASE WHEN _as_nick THEN NULL ELSE _author::text END,
    'avatar_url', av,
    'seed', CASE WHEN _as_nick THEN coalesce(nick, label) ELSE _author::text END,
    'online', coalesce(visible_online, false)
  );
END;
$function$;

-- a public-safe profile card: only what she chose to share, plus her heart in Liba
CREATE OR REPLACE FUNCTION public.community_member_profile(_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v uuid := auth.uid(); r public.community_profiles;
BEGIN
  IF NOT public.community_is_member(v) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO r FROM public.community_profiles WHERE user_id = _uid;
  IF r.user_id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  RETURN jsonb_build_object(
    'user_id', r.user_id::text,
    'name', coalesce(r.display_name, 'חברה בקהילה'),
    'initials', public.community_initials(coalesce(r.display_name, 'חברה בקהילה')),
    'avatar_url', r.avatar_url,
    'seed', r.user_id::text,
    'online', coalesce(r.show_online, false) AND r.last_seen_at > now() - interval '5 minutes',
    'mine', r.user_id = v,
    'about_area', r.about_area,
    'about_work', r.about_work,
    'about_loves', r.about_loves,
    'about_help', r.about_help,
    'mastery_tags', to_jsonb(coalesce(r.mastery_tags, '{}')),
    'mastery_note', r.mastery_note,
    'contact_via_liba', coalesce(r.contact_via_liba, false),
    'contact_whatsapp', CASE WHEN coalesce(r.contact_show_whatsapp, false) THEN r.contact_whatsapp ELSE NULL END,
    'contact_email', CASE WHEN coalesce(r.contact_show_email, false) THEN r.contact_email ELSE NULL END,
    'hearts', public.community_hearts_json(_uid)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.community_member_profile(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.community_member_profile(uuid) TO authenticated;