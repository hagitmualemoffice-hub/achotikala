ALTER TABLE public.community_profiles ADD COLUMN IF NOT EXISTS activity_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.community_activity_since(_uid uuid)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coalesce(p.activity_seen_at, p.last_visit_at, p.created_at, now() - interval '7 days')
  FROM public.community_profiles p WHERE p.user_id = _uid
$$;

CREATE OR REPLACE FUNCTION public.community_my_activity_items(_uid uuid, _seen timestamptz, _limit integer)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
WITH raw AS (
  -- comments on my posts
  SELECT c.id, 'comment'::text AS kind, c.created_at,
         public.community_author_json(c.author_id, c.as_nickname, _uid) AS actor,
         p.id AS post_id, coalesce(p.title, left(p.body, 60)) AS post_title,
         left(c.body, 180) AS excerpt, NULL::text AS extra
    FROM public.community_comments c
    JOIN public.community_posts p ON p.id = c.post_id
   WHERE c.status = 'active' AND p.status = 'active'
     AND p.author_id = _uid AND c.author_id <> _uid AND c.parent_id IS NULL
  UNION ALL
  -- replies to my comments
  SELECT c.id, 'reply', c.created_at,
         public.community_author_json(c.author_id, c.as_nickname, _uid),
         p.id, coalesce(p.title, left(p.body, 60)), left(c.body, 180), NULL
    FROM public.community_comments c
    JOIN public.community_comments parent ON parent.id = c.parent_id
    JOIN public.community_posts p ON p.id = c.post_id
   WHERE c.status = 'active' AND parent.author_id = _uid AND c.author_id <> _uid
  UNION ALL
  -- reactions on my posts
  SELECT r.id, 'reaction_post', r.created_at,
         public.community_author_json(r.user_id, false, _uid),
         p.id, coalesce(p.title, left(p.body, 60)), left(p.body, 120), r.kind
    FROM public.community_reactions r
    JOIN public.community_posts p ON p.id = r.target_id
   WHERE r.target_type = 'post' AND p.author_id = _uid AND r.user_id <> _uid AND p.status = 'active'
  UNION ALL
  -- reactions on my comments
  SELECT r.id, 'reaction_comment', r.created_at,
         public.community_author_json(r.user_id, false, _uid),
         c.post_id, coalesce(p.title, left(p.body, 60)), left(c.body, 120), r.kind
    FROM public.community_reactions r
    JOIN public.community_comments c ON c.id = r.target_id
    JOIN public.community_posts p ON p.id = c.post_id
   WHERE r.target_type = 'comment' AND c.author_id = _uid AND r.user_id <> _uid AND c.status = 'active'
  UNION ALL
  -- "עזרת לי" on my comment
  SELECT c.id, 'helpful', c.helpful_at,
         public.community_author_json(p.author_id, p.as_nickname, _uid),
         p.id, coalesce(p.title, left(p.body, 60)), left(c.body, 180), NULL
    FROM public.community_comments c
    JOIN public.community_posts p ON p.id = c.post_id
   WHERE c.author_id = _uid AND c.helpful_at IS NOT NULL
  UNION ALL
  -- messages in הבאר inquiries where I take part
  SELECT m.id, 'baar_message', m.created_at,
         public.community_author_json(m.sender_id, false, _uid),
         NULL::uuid, b.full_name, left(m.body, 180), i.id::text
    FROM public.community_baar_inquiry_messages m
    JOIN public.community_baar_inquiries i ON i.id = m.inquiry_id
    JOIN public.community_baar_boys b ON b.id = i.boy_id
   WHERE m.sender_id <> _uid AND _uid IN (i.from_user, i.to_user)
  UNION ALL
  -- someone offered help on my inquiry (קבוצת בירורים)
  SELECT o.id, 'inquiry_offer', o.created_at,
         CASE WHEN o.visible THEN public.community_author_json(o.helper_id, false, _uid) ELSE NULL END,
         NULL::uuid, q.boy_name, NULL, q.id::text
    FROM public.community_inquiry_offers o
    JOIN public.community_inquiries q ON q.id = o.inquiry_id
   WHERE q.author_id = _uid AND o.helper_id <> _uid AND o.status <> 'cancelled'
  UNION ALL
  -- messages inside an inquiry thread I take part in
  SELECT m.id, 'inquiry_message', m.created_at,
         public.community_author_json(m.sender_id, false, _uid),
         NULL::uuid, q.boy_name, left(m.body, 180), q.id::text
    FROM public.community_inquiry_messages m
    JOIN public.community_inquiries q ON q.id = m.inquiry_id
    LEFT JOIN public.community_inquiry_offers o ON o.id = m.offer_id
   WHERE m.sender_id <> _uid AND (q.author_id = _uid OR o.helper_id = _uid)
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
$$;

CREATE OR REPLACE FUNCTION public.community_my_activity_count()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); seen timestamptz; n integer;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('unread', 0);
  END IF;
  seen := public.community_activity_since(uid);
  SELECT count(*) INTO n
    FROM jsonb_array_elements(public.community_my_activity_items(uid, seen, 60)) e
   WHERE (e->>'unread')::boolean;
  RETURN jsonb_build_object('unread', coalesce(n, 0), 'seen_at', seen);
END;
$$;

CREATE OR REPLACE FUNCTION public.community_my_activity(_limit integer DEFAULT 40)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); seen timestamptz; items jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false, 'authorized', false);
  END IF;
  IF NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authenticated', true, 'authorized', false);
  END IF;
  seen := public.community_activity_since(uid);
  items := public.community_my_activity_items(uid, seen, _limit);

  RETURN jsonb_build_object(
    'authenticated', true,
    'authorized', true,
    'seen_at', seen,
    'unread', (SELECT count(*) FROM jsonb_array_elements(items) e WHERE (e->>'unread')::boolean),
    'hearts', public.community_hearts_json(uid),
    'items', items,
    'my_posts', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'id', p.id, 'space', p.space, 'title', p.title,
               'excerpt', left(p.body, 160), 'created_at', p.created_at,
               'nickname', p.as_nickname,
               'comment_count', (SELECT count(*) FROM public.community_comments c WHERE c.post_id = p.id AND c.status = 'active'),
               'reaction_count', (SELECT count(*) FROM public.community_reactions r WHERE r.target_type = 'post' AND r.target_id = p.id)
             ) ORDER BY p.created_at DESC), '[]'::jsonb)
        FROM public.community_posts p
       WHERE p.author_id = uid AND p.status = 'active'
    ),
    'baar_inquiries', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'id', i.id,
               'boy_id', i.boy_id,
               'boy_name', b.full_name,
               'incoming', i.to_user = uid,
               'status', i.status,
               'unread', CASE WHEN i.to_user = uid THEN i.to_unread ELSE i.from_unread END,
               'last_message_at', i.last_message_at,
               'other', public.community_author_json(CASE WHEN i.to_user = uid THEN i.from_user ELSE i.to_user END, false, uid)
             ) ORDER BY coalesce(i.last_message_at, i.created_at) DESC), '[]'::jsonb)
        FROM public.community_baar_inquiries i
        JOIN public.community_baar_boys b ON b.id = i.boy_id
       WHERE uid IN (i.from_user, i.to_user)
    ),
    'my_inquiries', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'id', q.id, 'boy_name', q.boy_name, 'status', q.status,
               'created_at', q.created_at,
               'help_count', (SELECT count(*) FROM public.community_inquiry_offers o
                               WHERE o.inquiry_id = q.id AND o.status <> 'cancelled')
             ) ORDER BY q.created_at DESC), '[]'::jsonb)
        FROM public.community_inquiries q
       WHERE q.author_id = uid AND q.status <> 'removed'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.community_mark_activity_seen()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  UPDATE public.community_profiles SET activity_seen_at = now(), updated_at = now()
   WHERE user_id = uid;
  RETURN jsonb_build_object('ok', true, 'seen_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.community_my_activity_items(uuid, timestamptz, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.community_activity_since(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_my_activity(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_my_activity_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_mark_activity_seen() TO authenticated;