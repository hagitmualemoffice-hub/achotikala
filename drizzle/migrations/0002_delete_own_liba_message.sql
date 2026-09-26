CREATE OR REPLACE FUNCTION public.liba_message_delete(_message_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _thread_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT thread_id INTO _thread_id
  FROM public.community_messages
  WHERE id = _message_id
    AND sender_id = _uid;

  IF _thread_id IS NULL THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  DELETE FROM public.community_messages
  WHERE id = _message_id
    AND sender_id = _uid;

  UPDATE public.community_threads t
  SET last_message_at = COALESCE(
        (SELECT max(m.created_at) FROM public.community_messages m WHERE m.thread_id = _thread_id),
        t.created_at
      ),
      last_message_preview = (
        SELECT left(m.body, 160)
        FROM public.community_messages m
        WHERE m.thread_id = _thread_id
        ORDER BY m.created_at DESC
        LIMIT 1
      )
  WHERE t.id = _thread_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.liba_message_delete(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.liba_message_delete(uuid) TO authenticated;