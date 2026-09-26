ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS ref_title text,
  ADD COLUMN IF NOT EXISTS ref_subtitle text,
  ADD COLUMN IF NOT EXISTS ref_link text;

DROP FUNCTION IF EXISTS public.liba_send(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.liba_send(
  _thread_id uuid,
  _body text,
  _reply_to uuid DEFAULT NULL::uuid,
  _ref_title text DEFAULT NULL::text,
  _ref_subtitle text DEFAULT NULL::text,
  _ref_link text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.community_messages (thread_id, sender_id, body, reply_to, ref_title, ref_subtitle, ref_link)
  VALUES (
    _thread_id, _uid, _clean, _reply_to,
    NULLIF(btrim(COALESCE(_ref_title, '')), ''),
    NULLIF(btrim(COALESCE(_ref_subtitle, '')), ''),
    NULLIF(btrim(COALESCE(_ref_link, '')), '')
  )
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
$function$;

CREATE OR REPLACE FUNCTION public.liba_thread(_thread_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        'reply_preview', (SELECT left(r.body, 140) FROM public.community_messages r WHERE r.id = m.reply_to),
        'ref_title', m.ref_title,
        'ref_subtitle', m.ref_subtitle,
        'ref_link', m.ref_link
      ) ORDER BY m.created_at)
      FROM public.community_messages m
      WHERE m.thread_id = _thread_id
    ), '[]'::jsonb)
  );
END;
$function$;