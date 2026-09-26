-- בירורים: store the asker's full name (first + last) when she posts non-anonymously,
-- so helpers can see who is asking.

ALTER TABLE public.community_inquiries ADD COLUMN IF NOT EXISTS author_full_name text;

CREATE OR REPLACE FUNCTION public.community_inquiry_create(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid(); rid uuid;
  nm text := btrim(coalesce(_payload->>'boy_name',''));
  bg text := _payload->>'background';
  types text[];
  clean_details text := btrim(coalesce(_payload->>'details',''));
  anon boolean := coalesce((_payload->>'as_nickname')::boolean,false);
  full_nm text := btrim(coalesce(_payload->>'author_full_name',''));
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF char_length(nm) < 2 OR char_length(nm) > 100 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF bg NOT IN ('ashkenazi','sephardi') THEN RAISE EXCEPTION 'invalid_background'; END IF;
  IF char_length(clean_details) < 2 OR char_length(clean_details) > 1500 THEN RAISE EXCEPTION 'invalid_details'; END IF;
  IF NOT anon AND (char_length(full_nm) < 2 OR char_length(full_nm) > 100) THEN RAISE EXCEPTION 'invalid_author_name'; END IF;
  SELECT coalesce(array_agg(DISTINCT x), '{}') INTO types
  FROM jsonb_array_elements_text(coalesce(_payload->'info_types','[]'::jsonb)) x
  WHERE x IN ('all_info','quality_info','photo','character','family','religious','health','work','friends','other');
  IF coalesce(array_length(types,1),0)=0 THEN RAISE EXCEPTION 'missing_info_type'; END IF;
  INSERT INTO public.community_inquiries(author_id,boy_name,background,info_types,details,as_nickname,author_full_name)
  VALUES(uid,nm,bg,types,clean_details,anon,CASE WHEN anon THEN NULL ELSE full_nm END) RETURNING id INTO rid;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_admin_action(_id uuid, _action text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid(); q public.community_inquiries; nm text; bg text; types text[]; clean_details text;
  anon boolean; full_nm text;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM public.community_inquiries WHERE id=_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _action='edit' THEN
    IF q.author_id<>uid AND NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
    nm := btrim(coalesce(_payload->>'boy_name',''));
    bg := _payload->>'background';
    clean_details := btrim(coalesce(_payload->>'details',''));
    anon := coalesce((_payload->>'as_nickname')::boolean,false);
    full_nm := btrim(coalesce(_payload->>'author_full_name',''));
    IF char_length(nm) < 2 OR char_length(nm) > 100 THEN RAISE EXCEPTION 'invalid_name'; END IF;
    IF bg NOT IN ('ashkenazi','sephardi') THEN RAISE EXCEPTION 'invalid_background'; END IF;
    IF char_length(clean_details) > 1500 THEN RAISE EXCEPTION 'invalid_details'; END IF;
    IF NOT anon AND full_nm <> '' AND (char_length(full_nm) < 2 OR char_length(full_nm) > 100) THEN RAISE EXCEPTION 'invalid_author_name'; END IF;
    SELECT coalesce(array_agg(DISTINCT x), '{}') INTO types
    FROM jsonb_array_elements_text(coalesce(_payload->'info_types','[]'::jsonb)) x
    WHERE x IN ('all_info','quality_info','photo','character','family','religious','health','work','friends','other');
    IF coalesce(array_length(types,1),0)=0 THEN RAISE EXCEPTION 'missing_info_type'; END IF;
    UPDATE public.community_inquiries SET boy_name=nm, background=bg, info_types=types, details=NULLIF(clean_details,''),
      as_nickname=anon, age=NULL, city=NULL, yeshiva=NULL,
      author_full_name = CASE WHEN anon THEN NULL WHEN full_nm <> '' THEN full_nm ELSE author_full_name END
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

CREATE OR REPLACE FUNCTION public.community_inquiry_json(_id uuid, _viewer uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.community_inquiries; helpers jsonb; my_offer jsonb; adm boolean := public.has_role(_viewer, 'admin');
BEGIN
  SELECT * INTO q FROM public.community_inquiries WHERE id = _id;
  IF q.id IS NULL THEN RETURN NULL; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'name', CASE WHEN o.visible THEN coalesce(CASE WHEN p.nickname IS NOT NULL THEN p.nickname ELSE p.display_name END, 'חברה בליבה') ELSE NULL END,
    'avatar_url', CASE WHEN o.visible AND (p.nickname IS NULL OR p.avatar_in_nickname_mode) THEN p.avatar_url ELSE NULL END,
    'seed', CASE WHEN o.visible THEN o.helper_id::text ELSE NULL END,
    'anonymous', NOT o.visible,
    'connection_type', CASE WHEN q.author_id = _viewer OR o.helper_id = _viewer OR adm THEN o.connection_type ELSE NULL END
  ) ORDER BY o.created_at), '[]'::jsonb) INTO helpers
  FROM public.community_inquiry_offers o LEFT JOIN public.community_profiles p ON p.user_id = o.helper_id
  WHERE o.inquiry_id = q.id AND o.status = 'active';
  SELECT jsonb_build_object('id',o.id,'connection_type',o.connection_type,'contact_mode',o.contact_mode,'visible',o.visible)
    INTO my_offer FROM public.community_inquiry_offers o WHERE o.inquiry_id=q.id AND o.helper_id=_viewer AND o.status='active';
  RETURN jsonb_build_object(
    'id', q.id, 'boy_name', q.boy_name, 'age', q.age, 'city', q.city, 'yeshiva', q.yeshiva,
    'background', q.background, 'info_types', q.info_types, 'details', q.details,
    'status', q.status, 'pinned', q.pinned, 'created_at', q.created_at,
    'needs_help', q.status='open' AND NOT EXISTS (SELECT 1 FROM public.community_inquiry_offers x WHERE x.inquiry_id=q.id AND x.status='active') AND q.created_at < now() - interval '24 hours',
    'author', public.community_inquiry_author_json(q.author_id, q.as_nickname, _viewer),
    'author_full_name', CASE WHEN q.as_nickname THEN NULL ELSE q.author_full_name END,
    'mine', q.author_id=_viewer, 'can_moderate', adm,
    'help_count', jsonb_array_length(helpers), 'helpers', helpers, 'my_offer', my_offer
  );
END $$;