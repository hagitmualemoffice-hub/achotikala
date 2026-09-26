CREATE TABLE public.community_pulse_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space text NOT NULL DEFAULT 'discussions',
  title text NOT NULL,
  intro text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  anonymous boolean NOT NULL DEFAULT true,
  multi boolean NOT NULL DEFAULT false,
  hide_results boolean NOT NULL DEFAULT true,
  followup_question text,
  followup_placeholder text,
  followup_anonymous boolean NOT NULL DEFAULT true,
  followup_visible boolean NOT NULL DEFAULT true,
  pinned boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'open',
  closes_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_pulse_status_chk CHECK (status IN ('open','closed','archived'))
);

CREATE TABLE public.community_pulse_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pulse_id uuid NOT NULL REFERENCES public.community_pulse_checks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pulse_id, user_id, option_id)
);
CREATE INDEX community_pulse_votes_pulse_idx ON public.community_pulse_votes (pulse_id);

CREATE TABLE public.community_pulse_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pulse_id uuid NOT NULL REFERENCES public.community_pulse_checks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'visible',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX community_pulse_responses_pulse_idx ON public.community_pulse_responses (pulse_id);

GRANT ALL ON public.community_pulse_checks TO service_role;
GRANT ALL ON public.community_pulse_votes TO service_role;
GRANT ALL ON public.community_pulse_responses TO service_role;

ALTER TABLE public.community_pulse_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pulse_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_pulse_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse admins manage" ON public.community_pulse_checks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER community_pulse_checks_updated
  BEFORE UPDATE ON public.community_pulse_checks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

/* ---------------- one shared shape for the UI, privacy first --------------- */
CREATE OR REPLACE FUNCTION public.community_pulse_json(_id uuid, _viewer uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.community_pulse_checks;
  adm boolean := public.has_role(_viewer, 'admin');
  mine text[];
  total int;
  reveal boolean;
  opts jsonb;
  resp jsonb;
  is_open boolean;
BEGIN
  SELECT * INTO p FROM public.community_pulse_checks WHERE id = _id;
  IF p.id IS NULL THEN RETURN NULL; END IF;

  is_open := p.status = 'open' AND (p.closes_at IS NULL OR p.closes_at > now());

  SELECT coalesce(array_agg(option_id), '{}') INTO mine
  FROM public.community_pulse_votes WHERE pulse_id = _id AND user_id = _viewer;

  SELECT count(DISTINCT user_id) INTO total
  FROM public.community_pulse_votes WHERE pulse_id = _id;

  reveal := adm OR array_length(mine, 1) > 0 OR NOT p.hide_results OR NOT is_open;

  SELECT jsonb_agg(
           jsonb_build_object(
             'id', o->>'id',
             'label', o->>'label',
             'note', o->>'note',
             'votes', CASE WHEN reveal THEN (
               SELECT count(*) FROM public.community_pulse_votes v
               WHERE v.pulse_id = _id AND v.option_id = o->>'id')
             ELSE NULL END
           ) ORDER BY ord)
    INTO opts
  FROM jsonb_array_elements(p.options) WITH ORDINALITY AS t(o, ord);

  IF reveal AND (p.followup_visible OR adm) THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id', r.id, 'body', r.body, 'created_at', r.created_at,
             'mine', r.user_id = _viewer
           ) ORDER BY r.created_at DESC), '[]'::jsonb)
      INTO resp
    FROM public.community_pulse_responses r
    WHERE r.pulse_id = _id AND r.status = 'visible';
  ELSE
    resp := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'id', p.id, 'space', p.space, 'title', p.title, 'intro', p.intro,
    'options', coalesce(opts, '[]'::jsonb),
    'anonymous', p.anonymous, 'multi', p.multi, 'hide_results', p.hide_results,
    'followup_question', p.followup_question,
    'followup_placeholder', p.followup_placeholder,
    'followup_anonymous', p.followup_anonymous,
    'followup_visible', p.followup_visible,
    'pinned', p.pinned, 'featured', p.featured,
    'status', p.status, 'closes_at', p.closes_at, 'is_open', is_open,
    'my_options', to_jsonb(mine),
    'voted', array_length(mine, 1) > 0,
    'results_visible', reveal,
    'total_voters', total,
    'responses', resp,
    'my_response', (SELECT r.body FROM public.community_pulse_responses r
                    WHERE r.pulse_id = _id AND r.user_id = _viewer AND r.status='visible'
                    ORDER BY r.created_at DESC LIMIT 1),
    'can_moderate', adm,
    'created_at', p.created_at
  );
END $$;

CREATE OR REPLACE FUNCTION public.community_pulse_list(_space text DEFAULT NULL, _all boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); adm boolean; res jsonb;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  adm := public.has_role(uid, 'admin');
  SELECT coalesce(jsonb_agg(public.community_pulse_json(t.id, uid) ORDER BY t.pinned DESC, t.created_at DESC), '[]'::jsonb)
    INTO res
  FROM public.community_pulse_checks t
  WHERE (_all AND adm OR t.status <> 'archived')
    AND (_space IS NULL OR t.space = _space OR (_space = 'all' AND t.featured));
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.community_pulse_vote(_id uuid, _options text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p public.community_pulse_checks; o text; valid boolean;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO p FROM public.community_pulse_checks WHERE id = _id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF p.status <> 'open' OR (p.closes_at IS NOT NULL AND p.closes_at <= now()) THEN
    RAISE EXCEPTION 'pulse_closed';
  END IF;
  IF _options IS NULL OR array_length(_options, 1) IS NULL THEN RAISE EXCEPTION 'no_option'; END IF;
  IF NOT p.multi AND array_length(_options, 1) > 1 THEN RAISE EXCEPTION 'single_choice'; END IF;

  FOREACH o IN ARRAY _options LOOP
    SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(p.options) x WHERE x->>'id' = o) INTO valid;
    IF NOT valid THEN RAISE EXCEPTION 'bad_option'; END IF;
  END LOOP;

  DELETE FROM public.community_pulse_votes WHERE pulse_id = _id AND user_id = uid;
  FOREACH o IN ARRAY _options LOOP
    INSERT INTO public.community_pulse_votes (pulse_id, user_id, option_id) VALUES (_id, uid, o);
  END LOOP;

  PERFORM public.community_award_hearts(uid, 'react_me_too', 'pulse:'||_id::text||':'||uid::text, 'post', _id);
  RETURN public.community_pulse_json(_id, uid);
END $$;

CREATE OR REPLACE FUNCTION public.community_pulse_respond(_id uuid, _body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); voted boolean; p public.community_pulse_checks;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO p FROM public.community_pulse_checks WHERE id = _id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF p.status <> 'open' OR (p.closes_at IS NOT NULL AND p.closes_at <= now()) THEN
    RAISE EXCEPTION 'pulse_closed';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.community_pulse_votes WHERE pulse_id=_id AND user_id=uid) INTO voted;
  IF NOT voted THEN RAISE EXCEPTION 'vote_first'; END IF;
  IF length(btrim(coalesce(_body,''))) < 2 THEN RAISE EXCEPTION 'empty_body'; END IF;

  DELETE FROM public.community_pulse_responses WHERE pulse_id=_id AND user_id=uid;
  INSERT INTO public.community_pulse_responses (pulse_id, user_id, body)
  VALUES (_id, uid, btrim(_body));
  RETURN public.community_pulse_json(_id, uid);
END $$;

CREATE OR REPLACE FUNCTION public.community_pulse_upsert(_id uuid, _payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); nid uuid;
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.community_pulse_checks (
      space, title, intro, options, anonymous, multi, hide_results,
      followup_question, followup_placeholder, followup_anonymous, followup_visible,
      pinned, featured, status, closes_at, created_by)
    VALUES (
      coalesce(_payload->>'space','discussions'),
      _payload->>'title',
      nullif(btrim(coalesce(_payload->>'intro','')),''),
      coalesce(_payload->'options','[]'::jsonb),
      coalesce((_payload->>'anonymous')::boolean, true),
      coalesce((_payload->>'multi')::boolean, false),
      coalesce((_payload->>'hide_results')::boolean, true),
      nullif(btrim(coalesce(_payload->>'followup_question','')),''),
      nullif(btrim(coalesce(_payload->>'followup_placeholder','')),''),
      coalesce((_payload->>'followup_anonymous')::boolean, true),
      coalesce((_payload->>'followup_visible')::boolean, true),
      coalesce((_payload->>'pinned')::boolean, true),
      coalesce((_payload->>'featured')::boolean, true),
      coalesce(_payload->>'status','open'),
      nullif(_payload->>'closes_at','')::timestamptz,
      uid)
    RETURNING id INTO nid;
  ELSE
    UPDATE public.community_pulse_checks SET
      space = coalesce(_payload->>'space', space),
      title = coalesce(_payload->>'title', title),
      intro = nullif(btrim(coalesce(_payload->>'intro','')),''),
      options = coalesce(_payload->'options', options),
      anonymous = coalesce((_payload->>'anonymous')::boolean, anonymous),
      multi = coalesce((_payload->>'multi')::boolean, multi),
      hide_results = coalesce((_payload->>'hide_results')::boolean, hide_results),
      followup_question = nullif(btrim(coalesce(_payload->>'followup_question','')),''),
      followup_placeholder = nullif(btrim(coalesce(_payload->>'followup_placeholder','')),''),
      followup_anonymous = coalesce((_payload->>'followup_anonymous')::boolean, followup_anonymous),
      followup_visible = coalesce((_payload->>'followup_visible')::boolean, followup_visible),
      pinned = coalesce((_payload->>'pinned')::boolean, pinned),
      featured = coalesce((_payload->>'featured')::boolean, featured),
      status = coalesce(_payload->>'status', status),
      closes_at = nullif(_payload->>'closes_at','')::timestamptz
    WHERE id = _id
    RETURNING id INTO nid;
  END IF;
  RETURN public.community_pulse_json(nid, uid);
END $$;

CREATE OR REPLACE FUNCTION public.community_pulse_admin_set(_id uuid, _pinned boolean DEFAULT NULL, _featured boolean DEFAULT NULL, _status text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.community_pulse_checks SET
    pinned = coalesce(_pinned, pinned),
    featured = coalesce(_featured, featured),
    status = coalesce(_status, status)
  WHERE id = _id;
  RETURN public.community_pulse_json(_id, uid);
END $$;

CREATE OR REPLACE FUNCTION public.community_pulse_remove_response(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.community_pulse_responses SET status = 'removed' WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.community_pulse_delete(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  DELETE FROM public.community_pulse_checks WHERE id = _id;
END $$;

REVOKE ALL ON FUNCTION public.community_pulse_json(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_pulse_list(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_pulse_vote(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_pulse_respond(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_pulse_upsert(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_pulse_admin_set(uuid, boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_pulse_remove_response(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_pulse_delete(uuid) TO authenticated;