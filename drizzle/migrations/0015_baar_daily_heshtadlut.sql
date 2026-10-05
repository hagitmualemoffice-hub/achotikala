-- =============================================================
-- ההשתדלות היומית בבאר — daily baar exposure / send / settings
-- All access goes through security-definer RPCs; tables stay locked.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.baar_daily_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_daily_exposures_per_boy integer NOT NULL DEFAULT 5 CHECK (max_daily_exposures_per_boy BETWEEN 1 AND 500),
  max_sends_per_boy integer NOT NULL DEFAULT 3 CHECK (max_sends_per_boy BETWEEN 1 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.baar_daily_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.baar_daily_exposures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boy_id uuid NOT NULL REFERENCES public.community_baar_boys(id) ON DELETE CASCADE,
  israeli_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jerusalem')::date,
  shown_at timestamptz NOT NULL DEFAULT now(),
  response text CHECK (response IN ('maybe','friend','info','contact','not_now')),
  responded_at timestamptz,
  UNIQUE (user_id, israeli_date)
);
CREATE INDEX IF NOT EXISTS baar_daily_exposures_boy_idx ON public.baar_daily_exposures (boy_id);
CREATE INDEX IF NOT EXISTS baar_daily_exposures_day_idx ON public.baar_daily_exposures (boy_id, israeli_date);

CREATE TABLE IF NOT EXISTS public.baar_daily_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boy_id uuid NOT NULL REFERENCES public.community_baar_boys(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('chat','email')),
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email text,
  invite_code text NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS baar_daily_sends_sender_boy_idx ON public.baar_daily_sends (sender_id, boy_id);

CREATE TABLE IF NOT EXISTS public.baar_daily_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  filter_kind text CHECK (filter_kind IN ('status','orientation','ethnicity')),
  filter_value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.baar_daily_config TO service_role;
GRANT ALL ON public.baar_daily_exposures TO service_role;
GRANT ALL ON public.baar_daily_sends TO service_role;
GRANT ALL ON public.baar_daily_settings TO service_role;

ALTER TABLE public.baar_daily_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baar_daily_exposures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baar_daily_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baar_daily_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to daily config" ON public.baar_daily_config FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "No direct client access to daily exposures" ON public.baar_daily_exposures FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "No direct client access to daily sends" ON public.baar_daily_sends FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "No direct client access to daily settings" ON public.baar_daily_settings FOR ALL USING (false) WITH CHECK (false);

-- =============================================================
-- state: settings + today's exposure (with the full boy card)
-- =============================================================
CREATE OR REPLACE FUNCTION public.baar_daily_state()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  s public.baar_daily_settings%ROWTYPE;
  exp public.baar_daily_exposures%ROWTYPE;
  today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  boy jsonb;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;

  SELECT * INTO s FROM public.baar_daily_settings WHERE user_id = uid;
  SELECT * INTO exp FROM public.baar_daily_exposures WHERE user_id = uid AND israeli_date = today;

  boy := NULL;
  IF exp.id IS NOT NULL THEN
    BEGIN
      boy := public.baar_profile(exp.boy_id);
    EXCEPTION WHEN OTHERS THEN
      boy := NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'authorized', true,
    'active', coalesce(s.active, true),
    'filter_kind', s.filter_kind,
    'filter_value', s.filter_value,
    'today', CASE
      WHEN exp.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'exposure_id', exp.id,
        'boy_id', exp.boy_id,
        'response', exp.response,
        'unavailable', boy IS NULL,
        'boy', boy)
    END
  );
END;
$$;

-- =============================================================
-- pick: server-side choice of today's boy (idempotent per day)
-- =============================================================
CREATE OR REPLACE FUNCTION public.baar_daily_pick(_ignore_filter boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  s public.baar_daily_settings%ROWTYPE;
  cfg public.baar_daily_config%ROWTYPE;
  exp public.baar_daily_exposures%ROWTYPE;
  _boy_id uuid;
  _boy jsonb;
  used_filter boolean;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO cfg FROM public.baar_daily_config WHERE id = 1;
  SELECT * INTO s FROM public.baar_daily_settings WHERE user_id = uid;

  IF coalesce(s.active, true) = false THEN
    RAISE EXCEPTION 'paused';
  END IF;

  -- already chosen today — same boy, never re-rolled
  SELECT * INTO exp FROM public.baar_daily_exposures WHERE user_id = uid AND israeli_date = today;
  IF exp.id IS NOT NULL THEN
    BEGIN
      _boy := public.baar_profile(exp.boy_id);
    EXCEPTION WHEN OTHERS THEN
      _boy := NULL;
    END;
    RETURN jsonb_build_object(
      'status', CASE WHEN _boy IS NULL THEN 'unavailable' ELSE 'ok' END,
      'exposure_id', exp.id,
      'boy', _boy
    );
  END IF;

  used_filter := NOT coalesce(_ignore_filter, false)
    AND s.filter_kind IS NOT NULL AND coalesce(s.filter_value, '') <> '';

  SELECT b.id INTO _boy_id
  FROM public.community_baar_boys b
  WHERE b.is_active
    AND (b.created_by IS NULL OR b.created_by <> uid)
    AND NOT EXISTS (
      SELECT 1 FROM public.baar_daily_exposures x
      WHERE x.user_id = uid AND x.boy_id = b.id
    )
    AND (
      NOT used_filter
      OR (s.filter_kind = 'status' AND b.status = s.filter_value)
      OR (s.filter_kind = 'orientation' AND b.orientation = s.filter_value)
      OR (s.filter_kind = 'ethnicity' AND b.ethnicity = s.filter_value)
    )
    AND (
      SELECT count(*) FROM public.baar_daily_exposures x2
      WHERE x2.boy_id = b.id AND x2.israeli_date = today
    ) < cfg.max_daily_exposures_per_boy
  ORDER BY
    (SELECT count(*) FROM public.baar_daily_exposures x3 WHERE x3.boy_id = b.id) ASC,
    random()
  LIMIT 1;

  IF _boy_id IS NULL THEN
    RETURN jsonb_build_object('status', CASE WHEN used_filter THEN 'filter_empty' ELSE 'empty' END);
  END IF;

  INSERT INTO public.baar_daily_exposures (user_id, boy_id, israeli_date)
  VALUES (uid, _boy_id, today)
  ON CONFLICT (user_id, israeli_date) DO NOTHING
  RETURNING * INTO exp;

  IF exp.id IS NULL THEN
    SELECT * INTO exp FROM public.baar_daily_exposures WHERE user_id = uid AND israeli_date = today;
  END IF;

  _boy := public.baar_profile(_boy_id);
  RETURN jsonb_build_object('status', 'ok', 'exposure_id', exp.id, 'boy', _boy);
END;
$$;

-- =============================================================
-- respond: she answers today's card
-- =============================================================
CREATE OR REPLACE FUNCTION public.baar_daily_respond(_exposure_id uuid, _response text)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _response NOT IN ('maybe','friend','info','contact','not_now') THEN
    RAISE EXCEPTION 'bad_response';
  END IF;

  UPDATE public.baar_daily_exposures
     SET response = _response, responded_at = now()
   WHERE id = _exposure_id AND user_id = uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
END;
$$;

-- =============================================================
-- settings: pause/resume + one personal filter
-- =============================================================
CREATE OR REPLACE FUNCTION public.baar_daily_settings_set(
  _active boolean,
  _filter_kind text DEFAULT NULL,
  _filter_value text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _filter_kind IS NOT NULL AND _filter_kind NOT IN ('status','orientation','ethnicity') THEN
    RAISE EXCEPTION 'bad_filter';
  END IF;

  INSERT INTO public.baar_daily_settings (user_id, active, filter_kind, filter_value)
  VALUES (uid, coalesce(_active, true),
          CASE WHEN coalesce(btrim(coalesce(_filter_value, '')), '') = '' THEN NULL ELSE _filter_kind END,
          CASE WHEN coalesce(btrim(coalesce(_filter_value, '')), '') = '' THEN NULL ELSE btrim(_filter_value) END)
  ON CONFLICT (user_id) DO UPDATE
    SET active = EXCLUDED.active,
        filter_kind = EXCLUDED.filter_kind,
        filter_value = EXCLUDED.filter_value,
        updated_at = now();
END;
$$;

-- =============================================================
-- send today's card to a friend in chat
-- =============================================================
CREATE OR REPLACE FUNCTION public.baar_daily_send_chat(_boy_id uuid, _to_user uuid, _body text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  cfg public.baar_daily_config%ROWTYPE;
  boy record;
  _tid uuid;
  _mid uuid;
  _clean text := btrim(coalesce(_body, ''));
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _to_user IS NULL OR _to_user = uid OR NOT public.community_is_member(_to_user) THEN
    RAISE EXCEPTION 'invalid_recipient';
  END IF;
  IF _clean = '' THEN
    RAISE EXCEPTION 'empty_message';
  END IF;
  IF length(_clean) > 2000 THEN
    _clean := left(_clean, 2000);
  END IF;

  -- the card must be today's daily card, hers
  IF NOT EXISTS (
    SELECT 1 FROM public.baar_daily_exposures
    WHERE user_id = uid AND boy_id = _boy_id AND israeli_date = today
  ) THEN
    RAISE EXCEPTION 'not_today_card';
  END IF;

  SELECT * INTO boy FROM public.community_baar_boys WHERE id = _boy_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO cfg FROM public.baar_daily_config WHERE id = 1;
  IF (SELECT count(*) FROM public.baar_daily_sends WHERE sender_id = uid AND boy_id = _boy_id)
     >= cfg.max_sends_per_boy THEN
    RAISE EXCEPTION 'limit_reached';
  END IF;

  _tid := public.liba_thread_open(
    _to_user, 'baar', _boy_id,
    boy.full_name, 'ההשתדלות היומית · כרטיס בבאר', '/liba/baar?boy=' || _boy_id::text
  );

  INSERT INTO public.community_messages (thread_id, sender_id, body, reply_to, ref_title, ref_subtitle, ref_link)
  VALUES (
    _tid, uid, _clean, NULL,
    boy.full_name,
    'כרטיס בבאר — לצפייה בכרטיס בבאר',
    '/liba/baar?boy=' || _boy_id::text
  )
  RETURNING id INTO _mid;

  UPDATE public.community_threads
     SET last_message_at = now(), last_message_preview = left(_clean, 160)
   WHERE id = _tid;

  UPDATE public.community_thread_participants
     SET unread = unread + 1, archived = false
   WHERE thread_id = _tid AND user_id <> uid;

  UPDATE public.community_thread_participants
     SET unread = 0, last_read_at = now()
   WHERE thread_id = _tid AND user_id = uid;

  INSERT INTO public.baar_daily_sends (sender_id, boy_id, channel, recipient_user_id)
  VALUES (uid, _boy_id, 'chat', _to_user);

  RETURN jsonb_build_object('ok', true, 'thread_id', _tid, 'message_id', _mid);
END;
$$;

REVOKE ALL ON FUNCTION public.baar_daily_state() FROM anon, public;
REVOKE ALL ON FUNCTION public.baar_daily_pick(boolean) FROM anon, public;
REVOKE ALL ON FUNCTION public.baar_daily_respond(uuid, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.baar_daily_settings_set(boolean, text, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.baar_daily_send_chat(uuid, uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.baar_daily_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.baar_daily_pick(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.baar_daily_respond(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.baar_daily_settings_set(boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.baar_daily_send_chat(uuid, uuid, text) TO authenticated;
