CREATE OR REPLACE FUNCTION public.community_my_activity_items(_uid uuid, _seen timestamp with time zone, _limit integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH raw AS (
  SELECT c.id, 'comment'::text AS kind, c.created_at,
         public.community_author_json(c.author_id, c.as_nickname, _uid) AS actor,
         p.id AS post_id, coalesce(p.title, left(p.body, 60)) AS post_title,
         left(c.body, 180) AS excerpt, NULL::text AS extra
    FROM public.community_comments c
    JOIN public.community_posts p ON p.id = c.post_id
   WHERE c.status = 'active' AND p.status = 'active'
     AND p.author_id = _uid AND c.author_id <> _uid AND c.parent_id IS NULL
  UNION ALL
  SELECT c.id, 'reply', c.created_at,
         public.community_author_json(c.author_id, c.as_nickname, _uid),
         p.id, coalesce(p.title, left(p.body, 60)), left(c.body, 180), NULL
    FROM public.community_comments c
    JOIN public.community_comments parent ON parent.id = c.parent_id
    JOIN public.community_posts p ON p.id = c.post_id
   WHERE c.status = 'active' AND parent.author_id = _uid AND c.author_id <> _uid
  UNION ALL
  SELECT r.id, 'reaction_post', r.created_at,
         public.community_author_json(r.user_id, false, _uid),
         p.id, coalesce(p.title, left(p.body, 60)), left(p.body, 120), r.kind
    FROM public.community_reactions r
    JOIN public.community_posts p ON p.id = r.target_id
   WHERE r.target_type = 'post' AND p.author_id = _uid AND r.user_id <> _uid AND p.status = 'active'
  UNION ALL
  SELECT r.id, 'reaction_comment', r.created_at,
         public.community_author_json(r.user_id, false, _uid),
         c.post_id, coalesce(p.title, left(p.body, 60)), left(c.body, 120), r.kind
    FROM public.community_reactions r
    JOIN public.community_comments c ON c.id = r.target_id
    JOIN public.community_posts p ON p.id = c.post_id
   WHERE r.target_type = 'comment' AND c.author_id = _uid AND r.user_id <> _uid AND c.status = 'active'
  UNION ALL
  SELECT c.id, 'helpful', c.helpful_at,
         public.community_author_json(p.author_id, p.as_nickname, _uid),
         p.id, coalesce(p.title, left(p.body, 60)), left(c.body, 180), NULL
    FROM public.community_comments c
    JOIN public.community_posts p ON p.id = c.post_id
   WHERE c.author_id = _uid AND c.helpful_at IS NOT NULL
  UNION ALL
  SELECT m.id, 'baar_message', m.created_at,
         public.community_author_json(m.sender_id, false, _uid),
         NULL::uuid, b.full_name, left(m.body, 180), i.id::text
    FROM public.community_baar_inquiry_messages m
    JOIN public.community_baar_inquiries i ON i.id = m.inquiry_id
    JOIN public.community_baar_boys b ON b.id = i.boy_id
   WHERE m.sender_id <> _uid AND _uid IN (i.from_user, i.to_user)
  UNION ALL
  SELECT o.id, 'inquiry_offer', o.created_at,
         CASE WHEN o.visible THEN public.community_author_json(o.helper_id, false, _uid) ELSE NULL END,
         NULL::uuid, q.boy_name, NULL, q.id::text
    FROM public.community_inquiry_offers o
    JOIN public.community_inquiries q ON q.id = o.inquiry_id
   WHERE q.author_id = _uid AND o.helper_id <> _uid AND o.status <> 'cancelled'
  UNION ALL
  SELECT m.id, 'inquiry_message', m.created_at,
         public.community_author_json(m.sender_id, false, _uid),
         NULL::uuid, q.boy_name, left(m.body, 180), q.id::text
    FROM public.community_inquiry_messages m
    JOIN public.community_inquiries q ON q.id = m.inquiry_id
    LEFT JOIN public.community_inquiry_offers o ON o.id = m.offer_id
   WHERE m.sender_id <> _uid AND (q.author_id = _uid OR o.helper_id = _uid)
  UNION ALL
  -- private conversations inside ליבה: "רות כתבה לך"
  SELECT m.id, 'message', m.created_at,
         public.community_author_json(m.sender_id, coalesce(sp.as_nickname, false), _uid),
         NULL::uuid, t.context_title, left(m.body, 180), t.id::text
    FROM public.community_messages m
    JOIN public.community_threads t ON t.id = m.thread_id
    JOIN public.community_thread_participants me ON me.thread_id = t.id AND me.user_id = _uid
    LEFT JOIN public.community_thread_participants sp ON sp.thread_id = t.id AND sp.user_id = m.sender_id
   WHERE m.sender_id <> _uid
)
SELECT coalesce(jsonb_agg(x ORDER BY (x->>'created_at') DESC), '[]'::jsonb)
FROM (
  SELECT jsonb_build_object(
           'id', raw.id,
           'kind', raw.kind,
           'created_at', raw.created_at,
           'actor', raw.actor,
           'post_id', raw.post_id,
           'title', raw.post_title,
           'excerpt', raw.excerpt,
           'extra', raw.extra,
           'unread', raw.created_at > _seen
         ) AS x
    FROM raw
   WHERE raw.created_at IS NOT NULL
   ORDER BY raw.created_at DESC
   LIMIT greatest(1, coalesce(_limit, 40))
) s
$function$;