-- ============================ tables ============================
CREATE TABLE public.community_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type text NOT NULL DEFAULT 'direct',
  source_id uuid,
  context_title text,
  context_subtitle text,
  context_link text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.community_thread_participants (
  thread_id uuid NOT NULL REFERENCES public.community_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  as_nickname boolean NOT NULL DEFAULT false,
  unread integer NOT NULL DEFAULT 0,
  last_read_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE public.community_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.community_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  reply_to uuid REFERENCES public.community_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX community_threads_last_msg_idx ON public.community_threads (last_message_at DESC);
CREATE INDEX community_thread_participants_user_idx ON public.community_thread_participants (user_id);
CREATE INDEX community_messages_thread_idx ON public.community_messages (thread_id, created_at);

-- ============================ grants ============================
GRANT SELECT ON public.community_threads TO authenticated;
GRANT SELECT ON public.community_thread_participants TO authenticated;
GRANT SELECT ON public.community_messages TO authenticated;
GRANT ALL ON public.community_threads TO service_role;
GRANT ALL ON public.community_thread_participants TO service_role;
GRANT ALL ON public.community_messages TO service_role;

-- ============================ rls ============================
ALTER TABLE public.community_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.liba_in_thread(_thread_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_thread_participants p
    WHERE p.thread_id = _thread_id AND p.user_id = _uid
  );
$$;

CREATE POLICY "own threads readable" ON public.community_threads
  FOR SELECT TO authenticated USING (public.liba_in_thread(id, auth.uid()));

CREATE POLICY "own participation readable" ON public.community_thread_participants
  FOR SELECT TO authenticated USING (public.liba_in_thread(thread_id, auth.uid()));

CREATE POLICY "own thread messages readable" ON public.community_messages
  FOR SELECT TO authenticated USING (public.liba_in_thread(thread_id, auth.uid()));

CREATE TRIGGER community_threads_touch BEFORE UPDATE ON public.community_threads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================ rpcs ============================
-- open (or reuse) a conversation with another member, carrying its context
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

  SELECT t.id INTO _tid
  FROM public.community_threads t
  WHERE t.source_type = COALESCE(_source_type, 'direct')
    AND COALESCE(t.source_id::text, '') = COALESCE(_source_id::text, '')
    AND EXISTS (SELECT 1 FROM public.community_thread_participants p WHERE p.thread_id = t.id AND p.user_id = _uid)
    AND EXISTS (SELECT 1 FROM public.community_thread_participants p WHERE p.thread_id = t.id AND p.user_id = _other)
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

-- list my conversations
CREATE OR REPLACE FUNCTION public.liba_threads(_limit integer DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.community_is_member(_uid) THEN
    RETURN jsonb_build_object('authorized', false, 'items', '[]'::jsonb, 'unread', 0);
  END IF;

  RETURN jsonb_build_object(
    'authorized', true,
    'unread', COALESCE((SELECT sum(unread) FROM public.community_thread_participants WHERE user_id = _uid AND NOT archived), 0),
    'items', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'last_message_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', t.id,
          'source_type', t.source_type,
          'source_id', t.source_id,
          'context_title', t.context_title,
          'context_subtitle', t.context_subtitle,
          'context_link', t.context_link,
          'last_message_at', t.last_message_at,
          'preview', t.last_message_preview,
          'unread', me.unread,
          'other', public.community_author_json(other.user_id, other.as_nickname, _uid)
        ) AS x
        FROM public.community_threads t
        JOIN public.community_thread_participants me ON me.thread_id = t.id AND me.user_id = _uid
        JOIN public.community_thread_participants other ON other.thread_id = t.id AND other.user_id <> _uid
        WHERE NOT me.archived
        ORDER BY t.last_message_at DESC
        LIMIT GREATEST(COALESCE(_limit, 60), 1)
      ) s
    ), '[]'::jsonb)
  );
END;
$$;

-- one conversation with its messages
CREATE OR REPLACE FUNCTION public.liba_thread(_thread_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.liba_in_thread(_thread_id, _uid) THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;

  RETURN jsonb_build_object(
    'authorized', true,
    'thread', (
      SELECT jsonb_build_object(
        'id', t.id,
        'source_type', t.source_type,
        'source_id', t.source_id,
        'context_title', t.context_title,
        'context_subtitle', t.context_subtitle,
        'context_link', t.context_link,
        'last_message_at', t.last_message_at,
        'unread', me.unread,
        'last_read_at', me.last_read_at,
        'other', public.community_author_json(other.user_id, other.as_nickname, _uid)
      )
      FROM public.community_threads t
      JOIN public.community_thread_participants me ON me.thread_id = t.id AND me.user_id = _uid
      JOIN public.community_thread_participants other ON other.thread_id = t.id AND other.user_id <> _uid
      WHERE t.id = _thread_id
    ),
    'messages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'body', m.body,
        'created_at', m.created_at,
        'mine', m.sender_id = _uid,
        'reply_to', m.reply_to,
        'reply_preview', (SELECT left(r.body, 140) FROM public.community_messages r WHERE r.id = m.reply_to)
      ) ORDER BY m.created_at)
      FROM public.community_messages m
      WHERE m.thread_id = _thread_id
    ), '[]'::jsonb)
  );
END;
$$;

-- send a message
CREATE OR REPLACE FUNCTION public.liba_send(_thread_id uuid, _body text, _reply_to uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _clean text := btrim(COALESCE(_body, ''));
BEGIN
  IF _uid IS NULL OR NOT public.liba_in_thread(_thread_id, _uid) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  IF _clean = '' THEN
    RAISE EXCEPTION 'empty_message';
  END IF;
  IF length(_clean) > 5000 THEN
    _clean := left(_clean, 5000);
  END IF;

  IF _reply_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.community_messages WHERE id = _reply_to AND thread_id = _thread_id
  ) THEN
    _reply_to := NULL;
  END IF;

  INSERT INTO public.community_messages (thread_id, sender_id, body, reply_to)
  VALUES (_thread_id, _uid, _clean, _reply_to)
  RETURNING id INTO _id;

  UPDATE public.community_threads
     SET last_message_at = now(), last_message_preview = left(_clean, 160)
   WHERE id = _thread_id;

  UPDATE public.community_thread_participants
     SET unread = unread + 1, archived = false
   WHERE thread_id = _thread_id AND user_id <> _uid;

  UPDATE public.community_thread_participants
     SET unread = 0, last_read_at = now()
   WHERE thread_id = _thread_id AND user_id = _uid;

  RETURN jsonb_build_object('ok', true, 'id', _id);
END;
$$;

CREATE OR REPLACE FUNCTION public.liba_thread_mark_read(_thread_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.liba_in_thread(_thread_id, _uid) THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  UPDATE public.community_thread_participants
     SET unread = 0, last_read_at = now()
   WHERE thread_id = _thread_id AND user_id = _uid;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.liba_messages_unread()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('unread', 0); END IF;
  RETURN jsonb_build_object('unread', COALESCE((
    SELECT sum(unread) FROM public.community_thread_participants WHERE user_id = _uid AND NOT archived
  ), 0));
END;
$$;

REVOKE ALL ON FUNCTION public.liba_in_thread(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.liba_thread_open(uuid, text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liba_threads(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liba_thread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liba_send(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liba_thread_mark_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liba_messages_unread() TO authenticated;