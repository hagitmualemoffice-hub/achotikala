CREATE OR REPLACE FUNCTION public.community_feed(_space text DEFAULT NULL::text, _query text DEFAULT NULL::text, _sort text DEFAULT 'new'::text, _saved boolean DEFAULT false, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); adm boolean; res jsonb; q text := btrim(coalesce(_query,''));
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  adm := public.has_role(uid,'admin');
  SELECT coalesce(jsonb_agg(j ORDER BY pinned DESC, ord DESC), '[]'::jsonb) INTO res FROM (
    SELECT p.pinned AS pinned,
      CASE WHEN _sort='active' THEN p.last_activity_at ELSE p.created_at END AS ord,
      jsonb_build_object(
        'id', p.id, 'space', p.space, 'title', p.title, 'body', p.body,
        'created_at', p.created_at, 'edited_at', p.edited_at, 'pinned', p.pinned,
        'last_activity_at', p.last_activity_at,
        'author', public.community_author_json(p.author_id, p.as_nickname, uid),
        'mine', p.author_id = uid,
        'can_moderate', adm,
        'unread', (SELECT previous_visit_at FROM public.community_profiles pr WHERE pr.user_id=uid) IS NOT NULL
                  AND p.created_at > (SELECT previous_visit_at FROM public.community_profiles pr WHERE pr.user_id=uid)
                  AND p.author_id <> uid,
        'comment_count', (SELECT count(*) FROM public.community_comments c WHERE c.post_id=p.id AND c.status='active'),
        'saved', EXISTS (SELECT 1 FROM public.community_saved_posts s WHERE s.post_id=p.id AND s.user_id=uid),
        'reactions', public.community_reactions_json('post', p.id, uid),
        'attachments', public.community_attachments_json(p.id, NULL),
        'participants', (
          SELECT coalesce(jsonb_agg(t.a ORDER BY t.ord DESC), '[]'::jsonb) FROM (
            SELECT public.community_author_json(x.author_id, x.as_nickname, uid) AS a, max(x.created_at) AS ord
            FROM (
              SELECT p.author_id AS author_id, p.as_nickname AS as_nickname, p.created_at AS created_at
              UNION ALL
              SELECT c.author_id, c.as_nickname, c.created_at
                FROM public.community_comments c
                WHERE c.post_id = p.id AND c.status='active'
            ) x
            GROUP BY x.author_id, x.as_nickname
            ORDER BY max(x.created_at) DESC
            LIMIT 5
          ) t
        ),
        'participant_count', (
          SELECT count(*) FROM (
            SELECT p.author_id AS author_id
            UNION
            SELECT c.author_id FROM public.community_comments c WHERE c.post_id=p.id AND c.status='active'
          ) u
        )
      ) AS j
    FROM public.community_posts p
    WHERE p.status='active'
      AND (_space IS NULL OR p.space = _space)
      AND (q = '' OR p.body ILIKE '%'||q||'%' OR coalesce(p.title,'') ILIKE '%'||q||'%'
           OR EXISTS (SELECT 1 FROM public.community_comments c2 WHERE c2.post_id=p.id AND c2.status='active' AND c2.body ILIKE '%'||q||'%'))
      AND (NOT _saved OR EXISTS (SELECT 1 FROM public.community_saved_posts s2 WHERE s2.post_id=p.id AND s2.user_id=uid))
    ORDER BY p.pinned DESC, ord DESC
    LIMIT greatest(1, least(coalesce(_limit,20), 50)) OFFSET greatest(0, coalesce(_offset,0))
  ) sub;
  RETURN res;
END $function$;

CREATE OR REPLACE FUNCTION public.community_reaction_actors(_target_type text, _target_id uuid, _kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); res jsonb;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(a ORDER BY ord), '[]'::jsonb) INTO res FROM (
    SELECT public.community_author_json(r.user_id, coalesce(pr.nickname IS NOT NULL AND pr.display_name IS NULL, false), uid) AS a,
           r.created_at AS ord
    FROM public.community_reactions r
    LEFT JOIN public.community_profiles pr ON pr.user_id = r.user_id
    WHERE r.target_type = _target_type AND r.target_id = _target_id AND r.kind = _kind
    ORDER BY r.created_at
    LIMIT 60
  ) t;
  RETURN res;
END $function$;