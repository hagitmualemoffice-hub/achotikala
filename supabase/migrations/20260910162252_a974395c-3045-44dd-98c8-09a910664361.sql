CREATE OR REPLACE FUNCTION public.community_pulse_vote(_id uuid, _options text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p public.community_pulse_checks; o text; valid boolean; cnt int;
BEGIN
  IF NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO p FROM public.community_pulse_checks WHERE id = _id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF p.status <> 'open' OR (p.closes_at IS NOT NULL AND p.closes_at <= now()) THEN
    RAISE EXCEPTION 'pulse_closed';
  END IF;

  cnt := coalesce(array_length(_options, 1), 0);
  IF NOT p.multi AND cnt > 1 THEN RAISE EXCEPTION 'single_choice'; END IF;

  IF cnt > 0 THEN
    FOREACH o IN ARRAY _options LOOP
      SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(p.options) x WHERE x->>'id' = o) INTO valid;
      IF NOT valid THEN RAISE EXCEPTION 'bad_option'; END IF;
    END LOOP;
  END IF;

  DELETE FROM public.community_pulse_votes WHERE pulse_id = _id AND user_id = uid;

  IF cnt = 0 THEN
    -- withdrawing her voice: her written words leave with it
    DELETE FROM public.community_pulse_responses WHERE pulse_id = _id AND user_id = uid;
    RETURN public.community_pulse_json(_id, uid);
  END IF;

  FOREACH o IN ARRAY _options LOOP
    INSERT INTO public.community_pulse_votes (pulse_id, user_id, option_id) VALUES (_id, uid, o);
  END LOOP;

  PERFORM public.community_award_hearts(uid, 'react_me_too', 'pulse:'||_id::text||':'||uid::text, 'post', _id);
  RETURN public.community_pulse_json(_id, uid);
END $$;