CREATE TABLE public.community_identity_settings (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id=1),
 allow_nickname_posting boolean NOT NULL DEFAULT true,
 announcement_active boolean NOT NULL DEFAULT false,
 experiment_version integer NOT NULL DEFAULT 1,
 activated_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_identity_settings TO authenticated;
GRANT ALL ON public.community_identity_settings TO service_role;
ALTER TABLE public.community_identity_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read identity settings" ON public.community_identity_settings FOR SELECT TO authenticated USING (public.community_is_member(auth.uid()));
CREATE TABLE public.community_identity_acknowledgements (
 user_id uuid NOT NULL,
 experiment_version integer NOT NULL,
 shown_at timestamptz NOT NULL DEFAULT now(),
 response text CHECK (response IN ('love','try')),
 responded_at timestamptz,
 dismissed_at timestamptz,
 PRIMARY KEY (user_id, experiment_version)
);
GRANT SELECT ON public.community_identity_acknowledgements TO authenticated;
GRANT ALL ON public.community_identity_acknowledgements TO service_role;
ALTER TABLE public.community_identity_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own identity acknowledgement or admin" ON public.community_identity_acknowledgements FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
ALTER TABLE public.community_posts ADD COLUMN identity_experiment_version integer;
ALTER TABLE public.community_comments ADD COLUMN identity_experiment_version integer;
CREATE OR REPLACE FUNCTION public.community_identity_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.community_identity_settings; a public.community_identity_acknowledgements; p public.community_profiles;
BEGIN
 IF auth.uid() IS NULL OR NOT public.community_is_member(auth.uid()) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 INSERT INTO public.community_identity_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
 SELECT * INTO s FROM public.community_identity_settings WHERE id=1;
 SELECT * INTO a FROM public.community_identity_acknowledgements WHERE user_id=auth.uid() AND experiment_version=s.experiment_version;
 SELECT * INTO p FROM public.community_profiles WHERE user_id=auth.uid();
 RETURN jsonb_build_object('allow_nickname_posting',s.allow_nickname_posting,'announcement_active',s.announcement_active,'version',s.experiment_version,'needs_popup',NOT s.allow_nickname_posting AND s.announcement_active AND a.user_id IS NULL,'full_name',p.display_name,'has_full_name',nullif(btrim(p.first_name),'') IS NOT NULL AND nullif(btrim(p.last_name),'') IS NOT NULL AND p.display_name=btrim(concat_ws(' ',p.first_name,p.last_name)));
END $$;
CREATE OR REPLACE FUNCTION public.community_identity_admin(_allow_nickname boolean DEFAULT NULL, _announcement_active boolean DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.community_identity_settings; stats jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 INSERT INTO public.community_identity_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
 UPDATE public.community_identity_settings SET allow_nickname_posting=coalesce(_allow_nickname,allow_nickname_posting),announcement_active=coalesce(_announcement_active,announcement_active),activated_at=CASE WHEN _allow_nickname=false AND activated_at IS NULL THEN now() ELSE activated_at END,updated_at=now() WHERE id=1 AND (_allow_nickname IS NOT NULL OR _announcement_active IS NOT NULL);
 SELECT * INTO s FROM public.community_identity_settings WHERE id=1;
 SELECT jsonb_build_object('shown',count(*),'responded',count(*) FILTER(WHERE response IS NOT NULL),'love',count(*) FILTER(WHERE response='love'),'try',count(*) FILTER(WHERE response='try'),'unanswered',count(*) FILTER(WHERE response IS NULL),'dismissed',count(*) FILTER(WHERE dismissed_at IS NOT NULL AND response IS NULL)) INTO stats FROM public.community_identity_acknowledgements WHERE experiment_version=s.experiment_version;
 RETURN public.community_identity_state() || jsonb_build_object('stats',stats);
END $$;
CREATE OR REPLACE FUNCTION public.community_identity_ack(_version integer,_event text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.community_identity_settings;
BEGIN
 IF auth.uid() IS NULL OR NOT public.community_is_member(auth.uid()) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM public.community_identity_settings WHERE id=1;
 IF _event NOT IN ('shown','love','try','dismiss') OR _version IS DISTINCT FROM s.experiment_version THEN RAISE EXCEPTION 'invalid_experiment_event'; END IF;
 IF _event='shown' THEN
  IF s.allow_nickname_posting OR NOT s.announcement_active THEN RAISE EXCEPTION 'announcement_inactive'; END IF;
  INSERT INTO public.community_identity_acknowledgements(user_id,experiment_version) VALUES(auth.uid(),_version) ON CONFLICT DO NOTHING;
 ELSE
  UPDATE public.community_identity_acknowledgements SET response=CASE WHEN _event IN ('love','try') THEN _event ELSE NULL END,responded_at=CASE WHEN _event IN ('love','try') THEN now() ELSE NULL END,dismissed_at=CASE WHEN _event='dismiss' THEN now() ELSE NULL END WHERE user_id=auth.uid() AND experiment_version=_version AND response IS NULL AND dismissed_at IS NULL;
 END IF;
 RETURN public.community_identity_state();
END $$;
CREATE OR REPLACE FUNCTION public.community_enforce_identity_experiment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.community_identity_settings; p public.community_profiles;
BEGIN
 SELECT * INTO s FROM public.community_identity_settings WHERE id=1;
 IF s.allow_nickname_posting IS DISTINCT FROM false THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.identity_experiment_version IS NULL THEN RETURN NEW; END IF;
  IF NEW.as_nickname THEN RAISE EXCEPTION 'nickname_posting_disabled: בתקופת הניסוי ניתן לפרסם בשם המלא בלבד. הפרסום לא נשמר.' USING ERRCODE='42501'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.as_nickname THEN RAISE EXCEPTION 'nickname_posting_disabled: בתקופת הניסוי ניתן לפרסם בשם המלא בלבד. הפרסום לא נשמר.' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.community_profiles WHERE user_id=NEW.author_id;
 IF nullif(btrim(p.first_name),'') IS NULL OR nullif(btrim(p.last_name),'') IS NULL OR p.display_name IS DISTINCT FROM btrim(concat_ws(' ',p.first_name,p.last_name)) THEN RAISE EXCEPTION 'full_name_required: יש להשלים שם פרטי ושם משפחה בהגדרות החשבון לפני הפרסום.'; END IF;
 NEW.identity_experiment_version:=s.experiment_version;
 RETURN NEW;
END $$;
CREATE TRIGGER community_post_identity_experiment BEFORE INSERT OR UPDATE OF as_nickname ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.community_enforce_identity_experiment();
CREATE TRIGGER community_comment_identity_experiment BEFORE INSERT OR UPDATE OF as_nickname ON public.community_comments FOR EACH ROW EXECUTE FUNCTION public.community_enforce_identity_experiment();
REVOKE ALL ON FUNCTION public.community_identity_state(),public.community_identity_admin(boolean,boolean),public.community_identity_ack(integer,text),public.community_enforce_identity_experiment() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.community_identity_state(),public.community_identity_admin(boolean,boolean),public.community_identity_ack(integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_identity_state(),public.community_identity_admin(boolean,boolean),public.community_identity_ack(integer,text),public.community_enforce_identity_experiment() TO service_role;