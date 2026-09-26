ALTER TABLE public.community_quiz_entries
ADD CONSTRAINT community_quiz_entries_user_unique UNIQUE (user_id);

CREATE OR REPLACE FUNCTION public.community_active_rotating_content()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); adm boolean; result jsonb;
BEGIN
  IF NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
  END IF;
  adm := public.has_role(uid, 'admin');
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'kind', c.kind,
      'tab_label', c.tab_label,
      'title', c.title,
      'body', c.body,
      'cover_image', c.cover_image,
      'starts_at', c.starts_at,
      'ends_at', c.ends_at,
      'post_id', c.post_id,
      'config', c.config,
      'post', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', p.id,
        'space', p.space,
        'title', p.title,
        'body', p.body,
        'created_at', p.created_at,
        'edited_at', p.edited_at,
        'last_activity_at', p.last_activity_at,
        'pinned', p.pinned,
        'author', public.community_author_json(p.author_id, p.as_nickname, uid),
        'mine', p.author_id = uid,
        'can_moderate', adm,
        'unread', false,
        'comment_count', (SELECT count(*) FROM public.community_comments cm WHERE cm.post_id=p.id AND cm.status='active'),
        'saved', EXISTS (SELECT 1 FROM public.community_saved_posts s WHERE s.post_id=p.id AND s.user_id=uid),
        'reactions', public.community_reactions_json('post', p.id, uid),
        'attachments', '[]'::jsonb,
        'participants', (
          SELECT coalesce(jsonb_agg(t.a ORDER BY t.ord DESC), '[]'::jsonb) FROM (
            SELECT public.community_author_json(x.author_id, x.as_nickname, uid) AS a, max(x.created_at) AS ord
            FROM (
              SELECT p.author_id, p.as_nickname, p.created_at
              UNION ALL
              SELECT cm.author_id, cm.as_nickname, cm.created_at
              FROM public.community_comments cm
              WHERE cm.post_id=p.id AND cm.status='active'
            ) x
            GROUP BY x.author_id, x.as_nickname
            ORDER BY max(x.created_at) DESC
            LIMIT 5
          ) t
        ),
        'participant_count', (
          SELECT count(*) FROM (
            SELECT p.author_id
            UNION
            SELECT cm.author_id FROM public.community_comments cm WHERE cm.post_id=p.id AND cm.status='active'
          ) participants
        )
      ) END
    ) ORDER BY c.starts_at DESC
  ), '[]'::jsonb)
  INTO result
  FROM public.community_rotating_content c
  LEFT JOIN public.community_posts p ON p.id = c.post_id
  WHERE c.status = 'published'
    AND c.starts_at <= now()
    AND c.ends_at > now();
  RETURN result;
END;
$$;