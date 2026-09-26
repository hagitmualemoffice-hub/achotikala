CREATE OR REPLACE FUNCTION public.community_inquiry_create(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); rid uuid; nm text := btrim(coalesce(_payload->>'boy_name','')); bg text := _payload->>'background'; types text[]; clean_details text := btrim(coalesce(_payload->>'details',''));
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF char_length(nm) < 2 OR char_length(nm) > 100 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF bg NOT IN ('ashkenazi','sephardi') THEN RAISE EXCEPTION 'invalid_background'; END IF;
  IF char_length(clean_details) > 1500 THEN RAISE EXCEPTION 'invalid_details'; END IF;
  SELECT coalesce(array_agg(DISTINCT x), '{}') INTO types
  FROM jsonb_array_elements_text(coalesce(_payload->'info_types','[]'::jsonb)) x
  WHERE x IN ('all_info','quality_info','photo','character','family','religious','health','work','friends','other');
  IF coalesce(array_length(types,1),0)=0 THEN RAISE EXCEPTION 'missing_info_type'; END IF;
  INSERT INTO public.community_inquiries(author_id,boy_name,background,info_types,details,as_nickname)
  VALUES(uid,nm,bg,types,NULLIF(clean_details,''),coalesce((_payload->>'as_nickname')::boolean,false)) RETURNING id INTO rid;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_admin_action(_id uuid, _action text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q public.community_inquiries; nm text; bg text; types text[]; clean_details text;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM public.community_inquiries WHERE id=_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _action='edit' THEN
    IF q.author_id<>uid AND NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
    nm := btrim(coalesce(_payload->>'boy_name',''));
    bg := _payload->>'background';
    clean_details := btrim(coalesce(_payload->>'details',''));
    IF char_length(nm) < 2 OR char_length(nm) > 100 THEN RAISE EXCEPTION 'invalid_name'; END IF;
    IF bg NOT IN ('ashkenazi','sephardi') THEN RAISE EXCEPTION 'invalid_background'; END IF;
    IF char_length(clean_details) > 1500 THEN RAISE EXCEPTION 'invalid_details'; END IF;
    SELECT coalesce(array_agg(DISTINCT x), '{}') INTO types
    FROM jsonb_array_elements_text(coalesce(_payload->'info_types','[]'::jsonb)) x
    WHERE x IN ('all_info','quality_info','photo','character','family','religious','health','work','friends','other');
    IF coalesce(array_length(types,1),0)=0 THEN RAISE EXCEPTION 'missing_info_type'; END IF;
    UPDATE public.community_inquiries SET boy_name=nm, background=bg, info_types=types, details=NULLIF(clean_details,''),
      as_nickname=coalesce((_payload->>'as_nickname')::boolean,false), age=NULL, city=NULL, yeshiva=NULL
    WHERE id=_id;
  ELSE
    IF NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
    IF _action='remove' THEN UPDATE public.community_inquiries SET status='removed' WHERE id=_id;
    ELSIF _action='pin' THEN UPDATE public.community_inquiries SET pinned=coalesce((_payload->>'value')::boolean,true) WHERE id=_id;
    ELSIF _action='bump' THEN UPDATE public.community_inquiries SET bumped_at=now() WHERE id=_id;
    ELSE RAISE EXCEPTION 'invalid_action'; END IF;
  END IF;
  RETURN public.community_inquiry_json(_id,uid);
END $$;