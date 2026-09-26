-- 1. per-helper thank-you tracking
ALTER TABLE public.community_inquiry_offers
  ADD COLUMN IF NOT EXISTS thanked_at timestamp with time zone;

-- 2. threads now expose the helper's email (only when she consented) and thank state
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
    'thanked_at',o.thanked_at,
    'shared_contact',CASE WHEN (q.author_id=uid OR adm) AND o.contact_mode='share_details' THEN jsonb_strip_nulls(jsonb_build_object('whatsapp',CASE WHEN p.contact_show_whatsapp THEN p.contact_whatsapp ELSE NULL END,'email',CASE WHEN p.contact_show_email THEN p.contact_email ELSE NULL END)) ELSE NULL END,
    'messages',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'mine',m.sender_id=uid,'body',m.body,'created_at',m.created_at) ORDER BY m.created_at) FROM public.community_inquiry_messages m WHERE m.offer_id=o.id),'[]'::jsonb)
  ) ORDER BY o.created_at), '[]'::jsonb) INTO result
  FROM public.community_inquiry_offers o LEFT JOIN public.community_profiles p ON p.user_id=o.helper_id
  WHERE o.inquiry_id=q.id AND o.status='active' AND (q.author_id=uid OR o.helper_id=uid OR adm);
  RETURN result;
END $$;

-- 3. thank one helper: writes a thank-you message in her thread and marks it
CREATE OR REPLACE FUNCTION public.community_inquiry_thank_offer(_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); o public.community_inquiry_offers; q public.community_inquiries;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO o FROM public.community_inquiry_offers WHERE id=_offer_id AND status='active';
  IF o.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT * INTO q FROM public.community_inquiries WHERE id=o.inquiry_id;
  IF q.id IS NULL OR q.author_id<>uid THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF o.thanked_at IS NULL THEN
    INSERT INTO public.community_inquiry_messages(inquiry_id,offer_id,sender_id,body)
    VALUES(q.id,o.id,uid,'תודה רבה שעזרת לי בבירור על ' || q.boy_name || ' 💗');
    UPDATE public.community_inquiry_offers SET thanked_at=now() WHERE id=o.id;
  END IF;
  RETURN jsonb_build_object('offer_id',o.id,'helper_id',o.helper_id,'inquiry_id',q.id,'boy_name',q.boy_name);
END $$;

-- 4. "how many new" counters for the ליבה top bar
CREATE OR REPLACE FUNCTION public.liba_new_counts(
  _baar_since timestamp with time zone DEFAULT NULL,
  _birurim_since timestamp with time zone DEFAULT NULL,
  _dirot_since timestamp with time zone DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); baar integer := 0; birurim integer := 0; dirot integer := 0;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('baar',0,'birurim',0,'dirot',0);
  END IF;
  IF public.baar_has_access(uid) THEN
    SELECT count(*) INTO baar FROM public.community_baar_boys
    WHERE is_active AND created_at > coalesce(_baar_since, now() - interval '7 days');
  END IF;
  SELECT count(*) INTO birurim FROM public.community_inquiries
  WHERE status='open' AND author_id<>uid AND created_at > coalesce(_birurim_since, now() - interval '7 days');
  SELECT count(*) INTO dirot FROM public.apartment_listings
  WHERE status='active' AND author_id<>uid AND created_at > coalesce(_dirot_since, now() - interval '7 days');
  RETURN jsonb_build_object('baar',least(baar,99),'birurim',least(birurim,99),'dirot',least(dirot,99));
END $$;

REVOKE ALL ON FUNCTION public.community_inquiry_thank_offer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.liba_new_counts(timestamp with time zone,timestamp with time zone,timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_inquiry_thank_offer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.liba_new_counts(timestamp with time zone,timestamp with time zone,timestamp with time zone) TO authenticated, service_role;