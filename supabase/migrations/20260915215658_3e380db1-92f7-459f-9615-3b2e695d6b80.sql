-- ============ per-space update preferences + "מאסטרית" role ============
CREATE TABLE IF NOT EXISTS public.community_space_prefs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space text NOT NULL,
  in_app boolean NOT NULL DEFAULT false,
  email_freq text NOT NULL DEFAULT 'none' CHECK (email_freq IN ('each','daily','weekly','none')),
  masterit boolean NOT NULL DEFAULT false,
  masterit_in_app boolean NOT NULL DEFAULT true,
  masterit_email_freq text NOT NULL DEFAULT 'none' CHECK (masterit_email_freq IN ('each','daily','weekly','none')),
  masterit_since timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, space)
);

CREATE INDEX IF NOT EXISTS community_space_prefs_space_idx ON public.community_space_prefs (space);

GRANT ALL ON public.community_space_prefs TO service_role;
ALTER TABLE public.community_space_prefs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.community_digest_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_at timestamptz,
  weekly_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.community_digest_state TO service_role;
ALTER TABLE public.community_digest_state ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS community_space_prefs_touch ON public.community_space_prefs;
CREATE TRIGGER community_space_prefs_touch BEFORE UPDATE ON public.community_space_prefs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS community_digest_state_touch ON public.community_digest_state;
CREATE TRIGGER community_digest_state_touch BEFORE UPDATE ON public.community_digest_state
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------------------------------------------------------------- read prefs
CREATE OR REPLACE FUNCTION public.community_space_prefs()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authorized', false, 'spaces', '[]'::jsonb);
  END IF;
  RETURN jsonb_build_object(
    'authorized', true,
    'spaces', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'space', s.space,
               'in_app', coalesce(p.in_app, false),
               'email_freq', coalesce(p.email_freq, 'none'),
               'masterit', coalesce(p.masterit, false),
               'masterit_in_app', coalesce(p.masterit_in_app, true),
               'masterit_email_freq', coalesce(p.masterit_email_freq, 'none'),
               'masterit_since', p.masterit_since,
               'masterit_count', (
                 SELECT count(*) FROM public.community_space_prefs mp
                  WHERE mp.space = s.space AND mp.masterit
               )
             )), '[]'::jsonb)
        FROM (
          SELECT DISTINCT space FROM (
            SELECT space FROM public.community_posts WHERE status = 'active'
            UNION SELECT space FROM public.community_space_prefs
          ) u WHERE space IS NOT NULL
        ) s
        LEFT JOIN public.community_space_prefs p ON p.space = s.space AND p.user_id = uid
    )
  );
END;
$$;

-- ------------------------------------------------------------- write follow
CREATE OR REPLACE FUNCTION public.community_set_space_pref(
  _space text, _in_app boolean DEFAULT NULL, _email_freq text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _space IS NULL OR length(trim(_space)) = 0 THEN
    RAISE EXCEPTION 'space is required';
  END IF;
  IF _email_freq IS NOT NULL AND _email_freq NOT IN ('each','daily','weekly','none') THEN
    RAISE EXCEPTION 'bad frequency';
  END IF;

  INSERT INTO public.community_space_prefs (user_id, space, in_app, email_freq)
  VALUES (uid, _space, coalesce(_in_app, false), coalesce(_email_freq, 'none'))
  ON CONFLICT (user_id, space) DO UPDATE
     SET in_app = coalesce(_in_app, public.community_space_prefs.in_app),
         email_freq = coalesce(_email_freq, public.community_space_prefs.email_freq),
         updated_at = now();

  RETURN public.community_space_prefs();
END;
$$;

-- ----------------------------------------------------------- masterit toggle
CREATE OR REPLACE FUNCTION public.community_set_masterit(
  _space text, _on boolean, _mode text DEFAULT 'each_app')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); in_app boolean := true; freq text := 'none';
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _space IS NULL OR length(trim(_space)) = 0 THEN
    RAISE EXCEPTION 'space is required';
  END IF;

  CASE coalesce(_mode, 'each_app')
    WHEN 'each_both' THEN in_app := true;  freq := 'each';
    WHEN 'each_app'  THEN in_app := true;  freq := 'none';
    WHEN 'daily'     THEN in_app := true;  freq := 'daily';
    WHEN 'weekly'    THEN in_app := true;  freq := 'weekly';
    ELSE RAISE EXCEPTION 'bad mode';
  END CASE;

  INSERT INTO public.community_space_prefs (user_id, space, masterit, masterit_in_app, masterit_email_freq, masterit_since)
  VALUES (uid, _space, coalesce(_on, false), in_app, freq, CASE WHEN _on THEN now() ELSE NULL END)
  ON CONFLICT (user_id, space) DO UPDATE
     SET masterit = coalesce(_on, false),
         masterit_in_app = in_app,
         masterit_email_freq = freq,
         masterit_since = CASE
                            WHEN _on AND public.community_space_prefs.masterit_since IS NOT NULL
                              THEN public.community_space_prefs.masterit_since
                            WHEN _on THEN now()
                            ELSE NULL
                          END,
         updated_at = now();

  RETURN public.community_space_prefs();
END;
$$;

-- ------------------- new posts in followed / masterit spaces in the feed ----
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
  SELECT m.id, 'message', m.created_at,
         public.community_author_json(m.sender_id, coalesce(sp.as_nickname, false), _uid),
         NULL::uuid, t.context_title, left(m.body, 180), t.id::text
    FROM public.community_messages m
    JOIN public.community_threads t ON t.id = m.thread_id
    JOIN public.community_thread_participants me ON me.thread_id = t.id AND me.user_id = _uid
    LEFT JOIN public.community_thread_participants sp ON sp.thread_id = t.id AND sp.user_id = m.sender_id
   WHERE m.sender_id <> _uid
  UNION ALL
  -- content she chose to follow / is a מאסטרית of: quiet, lowest priority
  SELECT p.id, 'space_post', p.created_at,
         public.community_author_json(p.author_id, p.as_nickname, _uid),
         p.id, coalesce(p.title, left(p.body, 60)), left(p.body, 180), p.space
    FROM public.community_posts p
    JOIN public.community_space_prefs sp ON sp.space = p.space AND sp.user_id = _uid
   WHERE p.status = 'active' AND p.author_id <> _uid
     AND ((sp.masterit AND sp.masterit_in_app) OR sp.in_app)
     AND p.created_at > greatest(coalesce(sp.masterit_since, sp.created_at), now() - interval '14 days')
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

-- the bell counts personal events only — followed content never hides them
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
   WHERE (e->>'unread')::boolean AND e->>'kind' <> 'space_post';
  RETURN jsonb_build_object('unread', coalesce(n, 0), 'seen_at', seen);
END;
$$;

REVOKE ALL ON FUNCTION public.community_my_activity_items(uuid, timestamptz, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.community_space_prefs() FROM anon;
REVOKE ALL ON FUNCTION public.community_set_space_pref(text, boolean, text) FROM anon;
REVOKE ALL ON FUNCTION public.community_set_masterit(text, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.community_space_prefs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_set_space_pref(text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_set_masterit(text, boolean, text) TO authenticated;