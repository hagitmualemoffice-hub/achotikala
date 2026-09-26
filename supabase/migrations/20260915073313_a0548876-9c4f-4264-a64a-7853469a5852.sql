CREATE TABLE public.community_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  boy_name text NOT NULL,
  age integer,
  city text,
  yeshiva text,
  background text NOT NULL,
  info_types text[] NOT NULL DEFAULT '{}',
  details text,
  as_nickname boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  pinned boolean NOT NULL DEFAULT false,
  bumped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.community_inquiries TO service_role;
ALTER TABLE public.community_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inquiries service only" ON public.community_inquiries FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.community_inquiry_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.community_inquiries(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL,
  connection_type text NOT NULL,
  contact_mode text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inquiry_id, helper_id)
);
GRANT ALL ON public.community_inquiry_offers TO service_role;
ALTER TABLE public.community_inquiry_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inquiry offers service only" ON public.community_inquiry_offers FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.community_inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.community_inquiries(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.community_inquiry_offers(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.community_inquiry_messages TO service_role;
ALTER TABLE public.community_inquiry_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inquiry messages service only" ON public.community_inquiry_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX community_inquiries_status_activity_idx ON public.community_inquiries(status, pinned DESC, bumped_at DESC, created_at DESC);
CREATE INDEX community_inquiries_search_idx ON public.community_inquiries USING gin (to_tsvector('simple', coalesce(boy_name,'') || ' ' || coalesce(city,'') || ' ' || coalesce(yeshiva,'') || ' ' || coalesce(details,'')));
CREATE INDEX community_inquiry_offers_inquiry_idx ON public.community_inquiry_offers(inquiry_id, status);
CREATE INDEX community_inquiry_messages_offer_idx ON public.community_inquiry_messages(offer_id, created_at);

CREATE TRIGGER community_inquiries_updated BEFORE UPDATE ON public.community_inquiries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER community_inquiry_offers_updated BEFORE UPDATE ON public.community_inquiry_offers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.community_inquiry_author_json(_uid uuid, _as_nickname boolean, _viewer uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.community_profiles; adm boolean := public.has_role(_viewer, 'admin');
BEGIN
  SELECT * INTO p FROM public.community_profiles WHERE user_id = _uid;
  RETURN jsonb_build_object(
    'name', CASE WHEN _as_nickname THEN coalesce(p.nickname, 'חברה בליבה') ELSE p.display_name END,
    'initials', public.community_initials(CASE WHEN _as_nickname THEN coalesce(p.nickname, 'חברה') ELSE p.display_name END),
    'nickname', _as_nickname,
    'mine', _uid = _viewer,
    'real_name', CASE WHEN adm AND _as_nickname THEN p.display_name ELSE NULL END,
    'profile_id', CASE WHEN NOT _as_nickname THEN _uid ELSE NULL END,
    'avatar_url', CASE WHEN NOT _as_nickname OR p.avatar_in_nickname_mode THEN p.avatar_url ELSE NULL END,
    'seed', CASE WHEN _as_nickname THEN 'nick:' || _uid::text ELSE _uid::text END
  );
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
    'mine', q.author_id=_viewer, 'can_moderate', adm,
    'help_count', jsonb_array_length(helpers), 'helpers', helpers, 'my_offer', my_offer
  );
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_feed(_query text DEFAULT NULL, _background text DEFAULT NULL, _help_status text DEFAULT 'all', _limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); result jsonb;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(public.community_inquiry_json(s.id, uid)), '[]'::jsonb) INTO result
  FROM (
    SELECT q.id FROM public.community_inquiries q
    WHERE q.status <> 'removed'
      AND (_background IS NULL OR _background='all' OR q.background=_background)
      AND (_help_status='all' OR (_help_status='waiting' AND NOT EXISTS (SELECT 1 FROM public.community_inquiry_offers o WHERE o.inquiry_id=q.id AND o.status='active')) OR (_help_status='helped' AND EXISTS (SELECT 1 FROM public.community_inquiry_offers o WHERE o.inquiry_id=q.id AND o.status='active')))
      AND (_query IS NULL OR btrim(_query)='' OR lower(q.boy_name || ' ' || coalesce(q.city,'') || ' ' || coalesce(q.yeshiva,'') || ' ' || coalesce(q.details,'')) LIKE '%' || lower(btrim(_query)) || '%')
    ORDER BY q.pinned DESC,
      CASE WHEN q.status='open' AND q.created_at < now()-interval '24 hours' AND NOT EXISTS (SELECT 1 FROM public.community_inquiry_offers o WHERE o.inquiry_id=q.id AND o.status='active') THEN coalesce(q.bumped_at, q.created_at + interval '24 hours') ELSE q.created_at END DESC,
      q.created_at DESC LIMIT greatest(1,least(_limit,100)) OFFSET greatest(_offset,0)
  ) s;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_create(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); rid uuid; nm text := btrim(coalesce(_payload->>'boy_name','')); bg text := _payload->>'background'; age_n int; types text[];
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF char_length(nm) < 2 OR char_length(nm) > 100 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF bg NOT IN ('ashkenazi','sephardi') THEN RAISE EXCEPTION 'invalid_background'; END IF;
  IF (_payload->>'age') IS NOT NULL AND (_payload->>'age') <> '' THEN age_n := (_payload->>'age')::int; IF age_n < 18 OR age_n > 99 THEN RAISE EXCEPTION 'invalid_age'; END IF; END IF;
  SELECT coalesce(array_agg(x), '{}') INTO types FROM jsonb_array_elements_text(coalesce(_payload->'info_types','[]'::jsonb)) x WHERE x IN ('character','family','religious','health','work','friends','photo','other');
  IF coalesce(array_length(types,1),0)=0 THEN RAISE EXCEPTION 'missing_info_type'; END IF;
  INSERT INTO public.community_inquiries(author_id,boy_name,age,city,yeshiva,background,info_types,details,as_nickname)
  VALUES(uid,nm,age_n,nullif(left(btrim(coalesce(_payload->>'city','')),80),''),nullif(left(btrim(coalesce(_payload->>'yeshiva','')),120),''),bg,types,nullif(left(btrim(coalesce(_payload->>'details','')),1500),''),coalesce((_payload->>'as_nickname')::boolean,false)) RETURNING id INTO rid;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_offer(_inquiry_id uuid, _connection_type text, _contact_mode text, _visible boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q public.community_inquiries; oid uuid;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM public.community_inquiries WHERE id=_inquiry_id AND status='open';
  IF q.id IS NULL OR q.author_id=uid THEN RAISE EXCEPTION 'invalid_inquiry'; END IF;
  IF _connection_type NOT IN ('personal','family','heard','can_check','photo') THEN RAISE EXCEPTION 'invalid_connection'; END IF;
  IF _contact_mode NOT IN ('share_details','liba') THEN RAISE EXCEPTION 'invalid_contact_mode'; END IF;
  INSERT INTO public.community_inquiry_offers(inquiry_id,helper_id,connection_type,contact_mode,visible,status)
  VALUES(_inquiry_id,uid,_connection_type,_contact_mode,_visible,'active')
  ON CONFLICT(inquiry_id,helper_id) DO UPDATE SET connection_type=excluded.connection_type,contact_mode=excluded.contact_mode,visible=excluded.visible,status='active',updated_at=now()
  RETURNING id INTO oid;
  RETURN public.community_inquiry_json(_inquiry_id,uid);
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_cancel_offer(_inquiry_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.community_inquiry_offers SET status='cancelled' WHERE inquiry_id=_inquiry_id AND helper_id=uid;
  RETURN public.community_inquiry_json(_inquiry_id,uid);
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_threads(_inquiry_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q public.community_inquiries; adm boolean := public.has_role(uid,'admin'); result jsonb;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM public.community_inquiries WHERE id=_inquiry_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'offer_id',o.id,'mine',o.helper_id=uid,'helper',CASE WHEN o.visible OR q.author_id=uid OR adm THEN public.community_inquiry_author_json(o.helper_id,false,uid) ELSE NULL END,
    'connection_type',o.connection_type,'contact_mode',o.contact_mode,
    'shared_contact',CASE WHEN (q.author_id=uid OR adm) AND o.contact_mode='share_details' THEN jsonb_strip_nulls(jsonb_build_object('whatsapp',CASE WHEN p.contact_show_whatsapp THEN p.contact_whatsapp ELSE NULL END,'email',CASE WHEN p.contact_show_email THEN p.contact_email ELSE NULL END)) ELSE NULL END,
    'messages',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'mine',m.sender_id=uid,'body',m.body,'created_at',m.created_at) ORDER BY m.created_at) FROM public.community_inquiry_messages m WHERE m.offer_id=o.id),'[]'::jsonb)
  ) ORDER BY o.created_at), '[]'::jsonb) INTO result
  FROM public.community_inquiry_offers o LEFT JOIN public.community_profiles p ON p.user_id=o.helper_id
  WHERE o.inquiry_id=q.id AND o.status='active' AND (q.author_id=uid OR o.helper_id=uid OR adm);
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_message(_offer_id uuid, _body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); o public.community_inquiry_offers; q public.community_inquiries; clean text := btrim(coalesce(_body,''));
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF char_length(clean)<1 OR char_length(clean)>2000 THEN RAISE EXCEPTION 'invalid_body'; END IF;
  SELECT * INTO o FROM public.community_inquiry_offers WHERE id=_offer_id AND status='active'; SELECT * INTO q FROM public.community_inquiries WHERE id=o.inquiry_id;
  IF o.id IS NULL OR uid NOT IN (o.helper_id,q.author_id) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  INSERT INTO public.community_inquiry_messages(inquiry_id,offer_id,sender_id,body) VALUES(q.id,o.id,uid,clean);
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_set_status(_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q public.community_inquiries; adm boolean := public.has_role(uid,'admin');
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM public.community_inquiries WHERE id=_id;
  IF q.id IS NULL OR (q.author_id<>uid AND NOT adm) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF _status NOT IN ('open','closed','resolved') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  UPDATE public.community_inquiries SET status=_status WHERE id=_id;
  RETURN public.community_inquiry_json(_id,uid);
END $$;

CREATE OR REPLACE FUNCTION public.community_inquiry_admin_action(_id uuid, _action text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF _action='remove' THEN UPDATE public.community_inquiries SET status='removed' WHERE id=_id;
  ELSIF _action='pin' THEN UPDATE public.community_inquiries SET pinned=coalesce((_payload->>'value')::boolean,true) WHERE id=_id;
  ELSIF _action='bump' THEN UPDATE public.community_inquiries SET bumped_at=now() WHERE id=_id;
  ELSIF _action='edit' THEN UPDATE public.community_inquiries SET boy_name=coalesce(nullif(left(btrim(_payload->>'boy_name'),100),''),boy_name),age=coalesce((_payload->>'age')::int,age),city=coalesce(nullif(left(btrim(_payload->>'city'),80),''),city),yeshiva=coalesce(nullif(left(btrim(_payload->>'yeshiva'),120),''),yeshiva),details=coalesce(left(btrim(_payload->>'details'),1500),details) WHERE id=_id;
  ELSE RAISE EXCEPTION 'invalid_action'; END IF;
  RETURN public.community_inquiry_json(_id,uid);
END $$;

GRANT EXECUTE ON FUNCTION public.community_inquiry_author_json(uuid,boolean,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.community_inquiry_json(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.community_inquiry_feed(text,text,text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_inquiry_create(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_inquiry_offer(uuid,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_inquiry_cancel_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_inquiry_threads(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_inquiry_message(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_inquiry_set_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_inquiry_admin_action(uuid,text,jsonb) TO authenticated;