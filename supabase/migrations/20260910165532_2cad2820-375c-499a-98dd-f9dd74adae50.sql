ALTER TABLE public.community_pulse_responses
  ADD COLUMN IF NOT EXISTS as_anonymous boolean NOT NULL DEFAULT true;

ALTER TABLE public.community_reactions DROP CONSTRAINT IF EXISTS community_reactions_target_chk;
ALTER TABLE public.community_reactions ADD CONSTRAINT community_reactions_target_chk
  CHECK (target_type = ANY (ARRAY['post'::text, 'comment'::text, 'pulse_response'::text]));

DROP FUNCTION IF EXISTS public.community_pulse_respond(uuid, text);

CREATE OR REPLACE FUNCTION public.community_pulse_respond(_id uuid, _body text, _anonymous boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  INSERT INTO public.community_pulse_responses (pulse_id, user_id, body, as_anonymous)
  VALUES (_id, uid, btrim(_body), coalesce(_anonymous, true));
  RETURN public.community_pulse_json(_id, uid);
END
$$;

CREATE OR REPLACE FUNCTION public.community_pulse_json(_id uuid, _viewer uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
             'mine', r.user_id = _viewer,
             'anonymous', r.as_anonymous,
             'author', CASE WHEN r.as_anonymous THEN NULL
                            ELSE public.community_author_json(r.user_id, false, _viewer) END,
             'reactions', public.community_reactions_json('pulse_response', r.id, _viewer)
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
    'my_response_anonymous', (SELECT r.as_anonymous FROM public.community_pulse_responses r
                    WHERE r.pulse_id = _id AND r.user_id = _viewer AND r.status='visible'
                    ORDER BY r.created_at DESC LIMIT 1),
    'can_moderate', adm,
    'created_at', p.created_at
  );
END
$$;