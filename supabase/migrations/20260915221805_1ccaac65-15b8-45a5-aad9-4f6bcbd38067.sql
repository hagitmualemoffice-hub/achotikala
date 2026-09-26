CREATE TABLE public.community_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('bug','idea','improvement')),
  body text NOT NULL,
  screenshot text,
  route text,
  feature text,
  context_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_offline boolean NOT NULL DEFAULT false,
  app_version text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done','wontfix')),
  admin_note text,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX community_feedback_created_idx ON public.community_feedback (created_at DESC);
CREATE INDEX community_feedback_reporter_idx ON public.community_feedback (reporter_user_id);

GRANT ALL ON public.community_feedback TO service_role;
ALTER TABLE public.community_feedback ENABLE ROW LEVEL SECURITY;
-- no policies for anon/authenticated: the table is reachable only through the
-- security-definer functions below, which check membership / admin themselves.

CREATE OR REPLACE FUNCTION public.liba_feedback_send(
  _kind text,
  _body text,
  _screenshot text DEFAULT NULL,
  _route text DEFAULT NULL,
  _feature text DEFAULT NULL,
  _context_id text DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb,
  _is_offline boolean DEFAULT false,
  _app_version text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _clean text := btrim(coalesce(_body, ''));
  _id uuid;
BEGIN
  IF _uid IS NULL OR NOT public.community_is_member(_uid) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;
  IF _kind NOT IN ('bug','idea','improvement') THEN
    RAISE EXCEPTION 'bad_kind';
  END IF;
  IF length(_clean) < 3 THEN
    RAISE EXCEPTION 'empty_body';
  END IF;
  IF length(_clean) > 4000 THEN _clean := left(_clean, 4000); END IF;
  IF _screenshot IS NOT NULL AND length(_screenshot) > 900000 THEN
    RAISE EXCEPTION 'screenshot_too_large';
  END IF;

  INSERT INTO public.community_feedback
    (reporter_user_id, kind, body, screenshot, route, feature, context_id, meta, is_offline, app_version)
  VALUES
    (_uid, _kind, _clean, _screenshot, left(coalesce(_route,''), 300), left(coalesce(_feature,''), 120),
     left(coalesce(_context_id,''), 200), coalesce(_meta, '{}'::jsonb), coalesce(_is_offline,false),
     left(coalesce(_app_version,''), 80))
  RETURNING id INTO _id;

  RETURN jsonb_build_object('ok', true, 'id', _id);
END; $$;

CREATE OR REPLACE FUNCTION public.liba_feedback_mine(_limit integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.community_is_member(_uid) THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id, 'kind', f.kind, 'body', f.body, 'status', f.status,
      'route', f.route, 'created_at', f.created_at,
      'has_screenshot', f.screenshot IS NOT NULL
    ) ORDER BY f.created_at DESC), '[]'::jsonb)
    FROM (SELECT * FROM public.community_feedback
           WHERE reporter_user_id = _uid
           ORDER BY created_at DESC LIMIT greatest(1, least(coalesce(_limit,30), 100))) f
  );
END; $$;

CREATE OR REPLACE FUNCTION public.liba_feedback_admin_list(
  _kind text DEFAULT NULL,
  _status text DEFAULT NULL,
  _limit integer DEFAULT 100
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'counts', (SELECT jsonb_build_object(
        'all', count(*),
        'bug', count(*) FILTER (WHERE kind = 'bug'),
        'idea', count(*) FILTER (WHERE kind = 'idea'),
        'improvement', count(*) FILTER (WHERE kind = 'improvement'),
        'new', count(*) FILTER (WHERE status = 'new')
      ) FROM public.community_feedback),
    'items', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', f.id, 'kind', f.kind, 'body', f.body, 'screenshot', f.screenshot,
        'route', f.route, 'feature', f.feature, 'context_id', f.context_id,
        'meta', f.meta, 'is_offline', f.is_offline, 'app_version', f.app_version,
        'status', f.status, 'admin_note', f.admin_note, 'notified_at', f.notified_at,
        'created_at', f.created_at,
        'reporter', jsonb_build_object(
          'user_id', f.reporter_user_id,
          'name', coalesce((SELECT display_name FROM public.community_profiles p WHERE p.user_id = f.reporter_user_id), 'חברה בקהילה'),
          'email', (SELECT u.email FROM auth.users u WHERE u.id = f.reporter_user_id)
        )
      ) ORDER BY f.created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.community_feedback
             WHERE (_kind IS NULL OR kind = _kind)
               AND (_status IS NULL OR status = _status)
             ORDER BY created_at DESC
             LIMIT greatest(1, least(coalesce(_limit,100), 300))) f
    )
  );
END; $$;

CREATE OR REPLACE FUNCTION public.liba_feedback_admin_update(
  _id uuid,
  _status text DEFAULT NULL,
  _admin_note text DEFAULT NULL,
  _notify boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.community_feedback;
  _tid uuid;
  _msg text;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _status IS NOT NULL AND _status NOT IN ('new','in_progress','done','wontfix') THEN
    RAISE EXCEPTION 'bad_status';
  END IF;

  UPDATE public.community_feedback
     SET status = coalesce(_status, status),
         admin_note = coalesce(_admin_note, admin_note),
         updated_at = now()
   WHERE id = _id
   RETURNING * INTO _row;

  IF _row.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;

  -- close the loop only for fixed bugs, only once, and never for internal steps
  IF _notify AND _status = 'done' AND _row.kind = 'bug'
     AND _row.notified_at IS NULL AND _row.reporter_user_id <> _uid
     AND public.community_is_member(_row.reporter_user_id) THEN

    SELECT t.id INTO _tid
    FROM public.community_threads t
    WHERE t.source_type = 'liba_team'
      AND EXISTS (SELECT 1 FROM public.community_thread_participants p WHERE p.thread_id = t.id AND p.user_id = _uid)
      AND EXISTS (SELECT 1 FROM public.community_thread_participants p WHERE p.thread_id = t.id AND p.user_id = _row.reporter_user_id)
    ORDER BY t.created_at LIMIT 1;

    IF _tid IS NULL THEN
      INSERT INTO public.community_threads (source_type, context_title, context_subtitle, context_link, created_by)
      VALUES ('liba_team', 'היי, ליבה', 'עדכון על הדיווח שלך', _row.route, _uid)
      RETURNING id INTO _tid;
      INSERT INTO public.community_thread_participants (thread_id, user_id)
      VALUES (_tid, _uid), (_tid, _row.reporter_user_id);
    END IF;

    _msg := 'הבאג שדיווחת עליו תוקן 💗' || chr(10) || 'תודה שעזרת לנו למצוא אותו.';

    INSERT INTO public.community_messages (thread_id, sender_id, body, ref_title, ref_subtitle, ref_link)
    VALUES (_tid, _uid, _msg, 'היי, ליבה', left(_row.body, 120), nullif(_row.route, ''));

    UPDATE public.community_threads
       SET last_message_at = now(), last_message_preview = left(_msg, 160)
     WHERE id = _tid;

    UPDATE public.community_thread_participants
       SET unread = unread + 1, archived = false
     WHERE thread_id = _tid AND user_id = _row.reporter_user_id;

    UPDATE public.community_feedback SET notified_at = now() WHERE id = _row.id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.liba_feedback_send(text, text, text, text, text, text, jsonb, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liba_feedback_mine(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liba_feedback_admin_list(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.liba_feedback_admin_update(uuid, text, text, boolean) TO authenticated;