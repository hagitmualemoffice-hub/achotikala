-- one conversation per pair of members, whatever it started from
CREATE OR REPLACE FUNCTION public.liba_thread_open(
  _other uuid,
  _source_type text DEFAULT 'direct',
  _source_id uuid DEFAULT NULL,
  _context_title text DEFAULT NULL,
  _context_subtitle text DEFAULT NULL,
  _context_link text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _tid uuid;
BEGIN
  IF _uid IS NULL OR NOT public.community_is_member(_uid) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;
  IF _other IS NULL OR _other = _uid OR NOT public.community_is_member(_other) THEN
    RAISE EXCEPTION 'invalid_recipient';
  END IF;

  -- any existing conversation between exactly the two of us
  SELECT t.id INTO _tid
  FROM public.community_threads t
  WHERE EXISTS (SELECT 1 FROM public.community_thread_participants p WHERE p.thread_id = t.id AND p.user_id = _uid)
    AND EXISTS (SELECT 1 FROM public.community_thread_participants p WHERE p.thread_id = t.id AND p.user_id = _other)
    AND (SELECT count(*) FROM public.community_thread_participants p WHERE p.thread_id = t.id) = 2
  ORDER BY t.created_at
  LIMIT 1;

  IF _tid IS NOT NULL THEN
    UPDATE public.community_thread_participants
       SET archived = false
     WHERE thread_id = _tid AND user_id = _uid;
    RETURN _tid;
  END IF;

  INSERT INTO public.community_threads (source_type, source_id, context_title, context_subtitle, context_link, created_by)
  VALUES (COALESCE(_source_type, 'direct'), _source_id, _context_title, _context_subtitle, _context_link, _uid)
  RETURNING id INTO _tid;

  INSERT INTO public.community_thread_participants (thread_id, user_id)
  VALUES (_tid, _uid), (_tid, _other);

  RETURN _tid;
END;
$$;

-- merge conversations that already got split between the same two members
DO $$
DECLARE
  r record;
  keep uuid;
BEGIN
  FOR r IN
    SELECT pair, array_agg(tid ORDER BY created_at) AS tids
    FROM (
      SELECT t.id AS tid, t.created_at,
             (SELECT array_agg(p.user_id ORDER BY p.user_id) FROM public.community_thread_participants p WHERE p.thread_id = t.id) AS pair
      FROM public.community_threads t
    ) x
    WHERE array_length(pair, 1) = 2
    GROUP BY pair
    HAVING count(*) > 1
  LOOP
    keep := r.tids[1];
    UPDATE public.community_messages SET thread_id = keep
      WHERE thread_id = ANY(r.tids) AND thread_id <> keep;
    DELETE FROM public.community_thread_participants WHERE thread_id = ANY(r.tids) AND thread_id <> keep;
    DELETE FROM public.community_threads WHERE id = ANY(r.tids) AND id <> keep;
    UPDATE public.community_thread_participants p
       SET unread = (
             SELECT count(*) FROM public.community_messages m
             WHERE m.thread_id = keep
               AND m.sender_id <> p.user_id
               AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
           )
     WHERE p.thread_id = keep;
    UPDATE public.community_threads t
       SET last_message_at = COALESCE((SELECT max(created_at) FROM public.community_messages m WHERE m.thread_id = keep), t.last_message_at)
     WHERE t.id = keep;
  END LOOP;
END $$;