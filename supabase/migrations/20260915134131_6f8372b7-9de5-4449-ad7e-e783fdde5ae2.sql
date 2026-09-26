-- ============ Inquiries between members about a boy ============
CREATE TABLE public.community_baar_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boy_id uuid NOT NULL REFERENCES public.community_baar_boys(id) ON DELETE CASCADE,
  from_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  from_unread integer NOT NULL DEFAULT 0,
  to_unread integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT baar_inq_status_chk CHECK (status IN ('pending','answered','closed')),
  CONSTRAINT baar_inq_not_self CHECK (from_user <> to_user),
  CONSTRAINT baar_inq_unique UNIQUE (boy_id, from_user, to_user)
);

CREATE TABLE public.community_baar_inquiry_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id uuid NOT NULL REFERENCES public.community_baar_inquiries(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX baar_inq_from_idx ON public.community_baar_inquiries (from_user, last_message_at DESC);
CREATE INDEX baar_inq_to_idx ON public.community_baar_inquiries (to_user, last_message_at DESC);
CREATE INDEX baar_inq_msg_idx ON public.community_baar_inquiry_messages (inquiry_id, created_at);

-- Reads: participants only. Writes: no privilege at all (RPC-only, defense in depth).
GRANT SELECT ON public.community_baar_inquiries TO authenticated;
GRANT SELECT ON public.community_baar_inquiry_messages TO authenticated;
GRANT ALL ON public.community_baar_inquiries TO service_role;
GRANT ALL ON public.community_baar_inquiry_messages TO service_role;

ALTER TABLE public.community_baar_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_baar_inquiry_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read own inquiries"
ON public.community_baar_inquiries FOR SELECT TO authenticated
USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "participants read own inquiry messages"
ON public.community_baar_inquiry_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.community_baar_inquiries i
  WHERE i.id = inquiry_id AND (auth.uid() = i.from_user OR auth.uid() = i.to_user)
));

CREATE TRIGGER baar_inq_updated_at BEFORE UPDATE ON public.community_baar_inquiries
FOR EACH ROW EXECUTE FUNCTION public.baar_set_updated_at();

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.baar_inquiry_create(_boy_id uuid, _to_user uuid, _body text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inq_id uuid;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _to_user = uid THEN
    RAISE EXCEPTION 'invalid_target' USING ERRCODE = '22023';
  END IF;
  IF coalesce(btrim(_body), '') = '' THEN
    RAISE EXCEPTION 'empty_body' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_baar_recommendations r
    JOIN public.community_baar_boys b ON b.id = r.boy_id AND b.is_active = true
    WHERE r.boy_id = _boy_id AND r.user_id = _to_user AND r.visible = true
      AND coalesce(r.contact_mode, 'liba') IN ('liba','both')
  ) THEN
    RAISE EXCEPTION 'contact_not_allowed' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.community_baar_inquiries (boy_id, from_user, to_user, to_unread, last_message_at)
  VALUES (_boy_id, uid, _to_user, 1, now())
  ON CONFLICT (boy_id, from_user, to_user) DO UPDATE
    SET to_unread = public.community_baar_inquiries.to_unread + 1,
        last_message_at = now(),
        status = CASE WHEN public.community_baar_inquiries.status = 'closed' THEN 'pending' ELSE public.community_baar_inquiries.status END
  RETURNING id INTO inq_id;

  INSERT INTO public.community_baar_inquiry_messages (inquiry_id, sender_id, body)
  VALUES (inq_id, uid, btrim(_body));

  RETURN inq_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.baar_inquiry_reply(_inquiry_id uuid, _body text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inq public.community_baar_inquiries%ROWTYPE;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO inq FROM public.community_baar_inquiries WHERE id = _inquiry_id;
  IF NOT FOUND OR (uid <> inq.from_user AND uid <> inq.to_user) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(_body), '') = '' THEN
    RAISE EXCEPTION 'empty_body' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.community_baar_inquiry_messages (inquiry_id, sender_id, body)
  VALUES (_inquiry_id, uid, btrim(_body));

  UPDATE public.community_baar_inquiries
  SET last_message_at = now(),
      status = CASE WHEN uid = to_user THEN 'answered' ELSE status END,
      to_unread = CASE WHEN uid = from_user THEN to_unread + 1 ELSE to_unread END,
      from_unread = CASE WHEN uid = to_user THEN from_unread + 1 ELSE from_unread END
  WHERE id = _inquiry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.baar_inquiry_threads()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(t ORDER BY t->>'last_message_at' DESC)
    FROM (
      SELECT jsonb_build_object(
        'id', i.id,
        'boy_id', i.boy_id,
        'boy_name', b.full_name,
        'direction', CASE WHEN i.from_user = uid THEN 'sent' ELSE 'received' END,
        'status', i.status,
        'unread', CASE WHEN i.from_user = uid THEN i.from_unread ELSE i.to_unread END,
        'last_message_at', i.last_message_at,
        'created_at', i.created_at,
        'other', public.community_author_json(CASE WHEN i.from_user = uid THEN i.to_user ELSE i.from_user END, false, uid),
        'last_message', (
          SELECT m.body FROM public.community_baar_inquiry_messages m
          WHERE m.inquiry_id = i.id ORDER BY m.created_at DESC LIMIT 1
        )
      ) AS t
      FROM public.community_baar_inquiries i
      JOIN public.community_baar_boys b ON b.id = i.boy_id
      WHERE i.from_user = uid OR i.to_user = uid
    ) s
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.baar_inquiry_thread(_inquiry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inq public.community_baar_inquiries%ROWTYPE;
  boy_name text;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO inq FROM public.community_baar_inquiries WHERE id = _inquiry_id;
  IF NOT FOUND OR (uid <> inq.from_user AND uid <> inq.to_user) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT full_name INTO boy_name FROM public.community_baar_boys WHERE id = inq.boy_id;

  UPDATE public.community_baar_inquiries
  SET from_unread = CASE WHEN uid = from_user THEN 0 ELSE from_unread END,
      to_unread = CASE WHEN uid = to_user THEN 0 ELSE to_unread END
  WHERE id = _inquiry_id;

  RETURN jsonb_build_object(
    'id', inq.id,
    'boy_id', inq.boy_id,
    'boy_name', boy_name,
    'status', inq.status,
    'direction', CASE WHEN inq.from_user = uid THEN 'sent' ELSE 'received' END,
    'other', public.community_author_json(CASE WHEN inq.from_user = uid THEN inq.to_user ELSE inq.from_user END, false, uid),
    'messages', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'body', m.body,
        'created_at', m.created_at,
        'mine', m.sender_id = uid,
        'author', public.community_author_json(m.sender_id, false, uid)
      ) ORDER BY m.created_at)
      FROM public.community_baar_inquiry_messages m WHERE m.inquiry_id = inq.id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.baar_inquiry_set_status(_inquiry_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR _status NOT IN ('pending','answered','closed') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.community_baar_inquiries
  SET status = _status
  WHERE id = _inquiry_id AND (from_user = uid OR to_user = uid);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ============ Legacy / manual access preservation ============
CREATE OR REPLACE FUNCTION public.baar_admin_grant_access(_user_id uuid, _source text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.baar_is_admin(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF coalesce(_source, 'manual') NOT IN ('manual','legacy','admin_grant') THEN
    RAISE EXCEPTION 'invalid_source' USING ERRCODE = '22023';
  END IF;
  UPDATE public.community_profiles
  SET baar_access = true,
      baar_access_granted_at = coalesce(baar_access_granted_at, now()),
      baar_access_source = coalesce(baar_access_source, coalesce(_source, 'manual'))
  WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.baar_grant_legacy_access(_emails text[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  matched integer := 0;
  missing text[] := '{}';
  e text;
  target uuid;
BEGIN
  IF uid IS NULL OR NOT public.baar_is_admin(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  FOREACH e IN ARRAY coalesce(_emails, '{}') LOOP
    SELECT u.id INTO target FROM auth.users u WHERE lower(u.email) = lower(btrim(e)) LIMIT 1;
    IF target IS NULL THEN
      missing := missing || btrim(e);
    ELSE
      UPDATE public.community_profiles
      SET baar_access = true,
          baar_access_granted_at = coalesce(baar_access_granted_at, now()),
          baar_access_source = coalesce(baar_access_source, 'legacy')
      WHERE user_id = target;
      IF FOUND THEN matched := matched + 1; ELSE missing := missing || btrim(e); END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('granted', matched, 'missing', to_jsonb(missing));
END;
$$;
