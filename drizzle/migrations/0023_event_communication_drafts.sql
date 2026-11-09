CREATE TABLE public.event_communications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.events_db(id) ON DELETE CASCADE,
 subject text NOT NULL DEFAULT '',
 title text NOT NULL DEFAULT '',
 body text NOT NULL DEFAULT '',
 registration_url text NOT NULL DEFAULT '',
 brand_logo_url text NOT NULL DEFAULT '',
 show_brand_logo boolean NOT NULL DEFAULT true,
 extra_logos jsonb NOT NULL DEFAULT '[]'::jsonb,
 audience text NOT NULL DEFAULT 'website',
 google_label text NOT NULL DEFAULT '',
 message_kind text NOT NULL DEFAULT 'announcement',
 planned_at timestamptz,
 status text NOT NULL DEFAULT 'draft',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_communications TO authenticated;
GRANT ALL ON public.event_communications TO service_role;
ALTER TABLE public.event_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage event communication drafts" ON public.event_communications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX event_communications_event_idx ON public.event_communications(event_id);
CREATE OR REPLACE FUNCTION public.validate_event_communication_draft() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.status <> 'draft' THEN RAISE EXCEPTION 'Only drafts are supported until audience eligibility and scheduling are activated'; END IF;
 IF NEW.audience NOT IN ('website','google','both') THEN RAISE EXCEPTION 'Invalid audience'; END IF;
 IF NEW.message_kind NOT IN ('announcement','early_end','update') THEN RAISE EXCEPTION 'Invalid message kind'; END IF;
 IF length(NEW.subject)>255 OR length(NEW.title)>500 OR length(NEW.body)>20000 THEN RAISE EXCEPTION 'Message too long'; END IF;
 NEW.updated_at := now();
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_event_communication_draft BEFORE INSERT OR UPDATE ON public.event_communications FOR EACH ROW EXECUTE FUNCTION public.validate_event_communication_draft();