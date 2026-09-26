CREATE OR REPLACE FUNCTION public.community_inquiry_author_json(_uid uuid, _as_nickname boolean, _viewer uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.community_profiles; adm boolean := public.has_role(_viewer, 'admin');
BEGIN
  SELECT * INTO p FROM public.community_profiles WHERE user_id = _uid;
  RETURN jsonb_build_object(
    'name', CASE WHEN _as_nickname AND _uid <> _viewer AND NOT adm THEN 'אנונימית' ELSE p.display_name END,
    'initials', public.community_initials(CASE WHEN _as_nickname AND _uid <> _viewer AND NOT adm THEN 'אנונימית' ELSE p.display_name END),
    'nickname', _as_nickname,
    'mine', _uid = _viewer,
    'real_name', CASE WHEN adm AND _as_nickname THEN p.display_name ELSE NULL END,
    'profile_id', CASE WHEN NOT _as_nickname THEN _uid ELSE NULL END,
    'avatar_url', CASE WHEN NOT _as_nickname OR _uid = _viewer OR adm THEN p.avatar_url ELSE NULL END,
    'seed', CASE WHEN _as_nickname THEN 'anonymous:' || _uid::text ELSE _uid::text END
  );
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_create(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); rid uuid; nm text := btrim(coalesce(_payload->>'boy_name','')); bg text := _payload->>'background'; types text[]; clean_details text := btrim(coalesce(_payload->>'details',''));
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF char_length(nm) < 2 OR char_length(nm) > 100 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF bg NOT IN ('ashkenazi','sephardi') THEN RAISE EXCEPTION 'invalid_background'; END IF;
  IF char_length(clean_details) < 2 OR char_length(clean_details) > 1500 THEN RAISE EXCEPTION 'invalid_details'; END IF;
  SELECT coalesce(array_agg(DISTINCT x), '{}') INTO types
  FROM jsonb_array_elements_text(coalesce(_payload->'info_types','[]'::jsonb)) x
  WHERE x IN ('all_info','quality_info','photo','character','family','religious','health','work','friends','other');
  IF coalesce(array_length(types,1),0)=0 THEN RAISE EXCEPTION 'missing_info_type'; END IF;
  INSERT INTO public.community_inquiries(author_id,boy_name,background,info_types,details,as_nickname)
  VALUES(uid,nm,bg,types,clean_details,coalesce((_payload->>'as_nickname')::boolean,false)) RETURNING id INTO rid;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_update(_id uuid, _payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q public.community_inquiries; nm text := btrim(coalesce(_payload->>'boy_name','')); bg text := _payload->>'background'; types text[]; clean_details text := btrim(coalesce(_payload->>'details',''));
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM public.community_inquiries WHERE id=_id;
  IF q.id IS NULL OR (q.author_id<>uid AND NOT public.has_role(uid,'admin')) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF char_length(nm) < 2 OR char_length(nm) > 100 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF bg NOT IN ('ashkenazi','sephardi') THEN RAISE EXCEPTION 'invalid_background'; END IF;
  IF char_length(clean_details) < 2 OR char_length(clean_details) > 1500 THEN RAISE EXCEPTION 'invalid_details'; END IF;
  SELECT coalesce(array_agg(DISTINCT x), '{}') INTO types
  FROM jsonb_array_elements_text(coalesce(_payload->'info_types','[]'::jsonb)) x
  WHERE x IN ('all_info','quality_info','photo','character','family','religious','health','work','friends','other');
  IF coalesce(array_length(types,1),0)=0 THEN RAISE EXCEPTION 'missing_info_type'; END IF;
  UPDATE public.community_inquiries SET boy_name=nm, background=bg, info_types=types, details=clean_details,
    as_nickname=coalesce((_payload->>'as_nickname')::boolean,false), age=NULL, city=NULL, yeshiva=NULL
  WHERE id=_id;
  RETURN public.community_inquiry_json(_id,uid);
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_set_status(_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q public.community_inquiries; adm boolean := public.has_role(uid,'admin');
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM public.community_inquiries WHERE id=_id;
  IF q.id IS NULL OR (q.author_id<>uid AND NOT adm) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('open','closed','resolved','removed') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  UPDATE public.community_inquiries SET status=_status WHERE id=_id;
  RETURN public.community_inquiry_json(_id,uid);
END $$;

REVOKE ALL ON FUNCTION public.community_inquiry_update(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_inquiry_update(uuid,jsonb) TO authenticated, service_role;