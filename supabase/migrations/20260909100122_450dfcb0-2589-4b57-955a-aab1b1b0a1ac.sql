CREATE OR REPLACE FUNCTION public.community_profile_json(_uid uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  ) FROM public.community_profiles WHERE user_id = _uid
$function$;

REVOKE EXECUTE ON FUNCTION public.community_profile_json(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.community_bootstrap()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); prev timestamptz; res jsonb; adm boolean; needs_agreement boolean;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('authenticated', false, 'authorized', false); END IF;
  IF NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authenticated', true, 'authorized', false);
  END IF;
  PERFORM public.community_ensure_profile();
  adm := public.has_role(uid, 'admin');
  SELECT last_visit_at INTO prev FROM public.community_profiles WHERE user_id = uid;
  SELECT (
    p.accepted_agreement_at IS NULL OR p.accepted_advertising_at IS NULL
  ) INTO needs_agreement FROM public.community_profiles p WHERE p.user_id = uid;

  res := jsonb_build_object(
    'authenticated', true,
    'authorized', true,
    'is_admin', adm,
    'requires_agreement', coalesce(needs_agreement, true),
    'profile', public.community_profile_json(uid),
    'since', jsonb_build_object(
      'first_visit', prev IS NULL,
      'new_posts', (SELECT count(*) FROM public.community_posts p WHERE p.status='active' AND p.author_id <> uid AND (prev IS NULL OR p.created_at > prev)),
      'replies_to_me', (SELECT count(*) FROM public.community_comments c JOIN public.community_posts p ON p.id=c.post_id
                        WHERE c.status='active' AND p.author_id = uid AND c.author_id <> uid AND (prev IS NULL OR c.created_at > prev)),
      'in_my_threads', (SELECT count(DISTINCT c.post_id) FROM public.community_comments c
                        WHERE c.status='active' AND c.author_id <> uid AND (prev IS NULL OR c.created_at > prev)
                          AND EXISTS (SELECT 1 FROM public.community_comments mine WHERE mine.post_id=c.post_id AND mine.author_id=uid)),
      'new_tools', (SELECT count(*) FROM public.community_tools t WHERE t.status='approved' AND (prev IS NULL OR t.reviewed_at > prev)),
      'hearts_on_my_posts', (SELECT count(*) FROM public.community_reactions r JOIN public.community_posts p ON p.id=r.target_id
                             WHERE r.target_type='post' AND p.author_id=uid AND r.user_id<>uid AND (prev IS NULL OR r.created_at > prev)),
      'me_too_on_my_posts', (SELECT count(*) FROM public.community_reactions r JOIN public.community_posts p ON p.id=r.target_id
                             WHERE r.target_type='post' AND r.kind='me_too' AND p.author_id=uid AND r.user_id<>uid AND (prev IS NULL OR r.created_at > prev))
    ),
    'notices', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'note',note) ORDER BY sort_order, created_at DESC), '[]'::jsonb)
                FROM public.community_notices WHERE active),
    'events', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'date',date_label,'place',place,'url',url) ORDER BY coalesce(starts_at, created_at)), '[]'::jsonb)
               FROM public.community_events WHERE active AND (starts_at IS NULL OR starts_at > now() - interval '1 day')),
    'tools', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'kind',kind,'space',space,'by',credited_name,'url',url,'has_file',storage_path IS NOT NULL,'attachment_id',source_attachment_id) ORDER BY reviewed_at DESC NULLS LAST), '[]'::jsonb)
              FROM public.community_tools WHERE status='approved'),
    'talking_now', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'recent')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', p.id, 'space', p.space, 'title', coalesce(nullif(p.title,''), left(p.body, 60)),
          'recent', (SELECT count(*) FROM public.community_comments c WHERE c.post_id=p.id AND c.status='active' AND c.created_at > now() - interval '2 days')) AS x
        FROM public.community_posts p WHERE p.status='active'
          AND (SELECT count(*) FROM public.community_comments c WHERE c.post_id=p.id AND c.status='active' AND c.created_at > now() - interval '2 days') > 0
        LIMIT 5) t),
    'admin_pending', CASE WHEN adm THEN jsonb_build_object(
        'tools', (SELECT count(*) FROM public.community_tools WHERE status='pending'),
        'reports', (SELECT count(*) FROM public.community_reports WHERE status='pending')) ELSE NULL END
  );

  UPDATE public.community_profiles SET previous_visit_at = last_visit_at, last_visit_at = now() WHERE user_id = uid;
  RETURN res;
END $function$;