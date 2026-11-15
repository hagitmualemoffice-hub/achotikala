CREATE TABLE public.medicine_catalog (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hebrew_name text NOT NULL, brand_name text NOT NULL DEFAULT '', aliases text[] NOT NULL DEFAULT '{}', generic_name text NOT NULL DEFAULT '', drug_type text NOT NULL DEFAULT 'supplies', needs_review boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(hebrew_name));
GRANT SELECT ON public.medicine_catalog TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medicine_catalog TO authenticated;
GRANT ALL ON public.medicine_catalog TO service_role;
ALTER TABLE public.medicine_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY medicine_catalog_read ON public.medicine_catalog FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY medicine_catalog_admin ON public.medicine_catalog FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TABLE public.medicine_listings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), catalog_id uuid REFERENCES public.medicine_catalog(id), drug_name text NOT NULL, dose text NOT NULL DEFAULT '', quantity text NOT NULL, expiry_month date NOT NULL, sealed boolean NOT NULL, area text NOT NULL, city text NOT NULL DEFAULT '', volunteer_transfer boolean NOT NULL DEFAULT false, nickname text NOT NULL, contact_mode text NOT NULL DEFAULT 'mediator' CHECK(contact_mode IN ('mediator','direct')), status text NOT NULL DEFAULT 'available' CHECK(status IN ('available','reserved','delivered','removed')), created_at timestamptz NOT NULL DEFAULT now(), CHECK(char_length(nickname) BETWEEN 1 AND 20));
GRANT SELECT ON public.medicine_listings TO anon, authenticated;
GRANT UPDATE ON public.medicine_listings TO authenticated;
GRANT ALL ON public.medicine_listings TO service_role;
ALTER TABLE public.medicine_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY medicine_listings_read ON public.medicine_listings FOR SELECT TO anon, authenticated USING ((status IN ('available','reserved') AND expiry_month >= date_trunc('month',current_date)::date) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY medicine_listings_admin_update ON public.medicine_listings FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.medicine_contacts (listing_id uuid PRIMARY KEY REFERENCES public.medicine_listings(id) ON DELETE CASCADE, phone text NOT NULL, name text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', opened_on date, opened_note text NOT NULL DEFAULT '', refrigerated text NOT NULL CHECK(refrigerated IN ('yes','no','unsure')), manage_hash text NOT NULL UNIQUE);
GRANT SELECT ON public.medicine_contacts TO authenticated;
GRANT ALL ON public.medicine_contacts TO service_role;
ALTER TABLE public.medicine_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY medicine_contacts_admin_read ON public.medicine_contacts FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.medicine_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid NOT NULL REFERENCES public.medicine_listings(id) ON DELETE CASCADE, name text NOT NULL DEFAULT '', phone text NOT NULL, note text NOT NULL DEFAULT '', handled boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, UPDATE ON public.medicine_requests TO authenticated;
GRANT ALL ON public.medicine_requests TO service_role;
ALTER TABLE public.medicine_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY medicine_requests_admin_read ON public.medicine_requests FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY medicine_requests_admin_update ON public.medicine_requests FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.medicine_abuse_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ip_hash text NOT NULL, phone_hash text NOT NULL, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.medicine_abuse_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.medicine_abuse_events_id_seq TO service_role;
ALTER TABLE public.medicine_abuse_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX medicine_abuse_lookup ON public.medicine_abuse_events(action,created_at);
CREATE FUNCTION public.medicine_submit(p jsonb, ip_key text, phone_key text, token_hash text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result_id uuid; cat_id uuid; act text := p->>'action'; phone_limit int; ip_limit int;
BEGIN
 IF act NOT IN ('create','request') THEN RAISE EXCEPTION 'invalid'; END IF;
 phone_limit := CASE WHEN act='create' THEN 5 ELSE 10 END; ip_limit := CASE WHEN act='create' THEN 10 ELSE 20 END;
 PERFORM pg_advisory_xact_lock(hashtextextended(act||ip_key,0));
 PERFORM pg_advisory_xact_lock(hashtextextended(act||phone_key,1));
 IF (SELECT count(*) FROM public.medicine_abuse_events WHERE action=act AND ip_hash=ip_key AND created_at>now()-interval '1 hour')>=ip_limit OR (SELECT count(*) FROM public.medicine_abuse_events WHERE action=act AND phone_hash=phone_key AND created_at>now()-interval '1 hour')>=phone_limit THEN RAISE EXCEPTION 'invalid'; END IF;
 INSERT INTO public.medicine_abuse_events(ip_hash,phone_hash,action) VALUES(ip_key,phone_key,act);
 IF act='request' THEN
  PERFORM 1 FROM public.medicine_listings WHERE id=(p->>'listing_id')::uuid AND status='available' AND expiry_month>=date_trunc('month',current_date)::date FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid'; END IF;
  INSERT INTO public.medicine_requests(listing_id,name,phone,note) VALUES((p->>'listing_id')::uuid,p->>'name',p->>'phone',p->>'note') RETURNING id INTO result_id;
 ELSE
  IF (p->>'expiry_month')::date<date_trunc('month',current_date)::date THEN RAISE EXCEPTION 'invalid'; END IF;
  INSERT INTO public.medicine_catalog(hebrew_name) VALUES(p->>'drug_name') ON CONFLICT(hebrew_name) DO NOTHING;
  SELECT id INTO cat_id FROM public.medicine_catalog WHERE hebrew_name=p->>'drug_name';
  INSERT INTO public.medicine_listings(catalog_id,drug_name,dose,quantity,expiry_month,sealed,area,city,volunteer_transfer,nickname,contact_mode) VALUES(cat_id,p->>'drug_name',p->>'dose',p->>'quantity',(p->>'expiry_month')::date,(p->>'sealed')::boolean,p->>'area',p->>'city',(p->>'volunteer_transfer')::boolean,p->>'nickname',p->>'contact_mode') RETURNING id INTO result_id;
  INSERT INTO public.medicine_contacts(listing_id,phone,name,email,opened_on,opened_note,refrigerated,manage_hash) VALUES(result_id,p->>'phone',p->>'name',p->>'email',nullif(p->>'opened_on','')::date,p->>'opened_note',p->>'refrigerated',token_hash);
 END IF;
 RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.medicine_submit(jsonb,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.medicine_submit(jsonb,text,text,text) TO service_role;
CREATE FUNCTION public.medicine_manage(token_hash text, next_status text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid;
BEGIN
 IF next_status NOT IN ('delivered','removed') THEN RETURN false; END IF;
 SELECT listing_id INTO target FROM public.medicine_contacts WHERE manage_hash=token_hash;
 IF target IS NULL THEN RETURN false; END IF;
 UPDATE public.medicine_listings SET status=next_status WHERE id=target;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.medicine_manage(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.medicine_manage(text,text) TO service_role;