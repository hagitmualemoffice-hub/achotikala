-- Manual, website-access-only authorizations (never synced to Google Contacts / mailing lists)
CREATE TABLE IF NOT EXISTS public.manual_authorized_emails (
  email text PRIMARY KEY,
  authorized boolean NOT NULL DEFAULT true,
  note text,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_authorized_emails TO authenticated;
GRANT ALL ON public.manual_authorized_emails TO service_role;

ALTER TABLE public.manual_authorized_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage manual authorizations"
ON public.manual_authorized_emails FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_manual_authorized_emails_updated_at
BEFORE UPDATE ON public.manual_authorized_emails
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Access requests (admin approval required)
CREATE TABLE IF NOT EXISTS public.apartment_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  connection text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apartment_access_requests_status_chk CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX IF NOT EXISTS apartment_access_requests_status_idx
  ON public.apartment_access_requests (status, created_at DESC);

GRANT INSERT ON public.apartment_access_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.apartment_access_requests TO authenticated;
GRANT ALL ON public.apartment_access_requests TO service_role;

ALTER TABLE public.apartment_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone may submit an access request"
ON public.apartment_access_requests FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND length(trim(full_name)) BETWEEN 2 AND 120
  AND email = lower(trim(email))
  AND email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  AND length(trim(phone)) BETWEEN 6 AND 30
  AND connection IN ('קבוצת וואטסאפ','השתתפתי בפעילות / אירוע','דרך חברה בקהילה','אחר')
  AND (note IS NULL OR length(note) <= 1000)
);

CREATE POLICY "Admins read access requests"
ON public.apartment_access_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update access requests"
ON public.apartment_access_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Manual approvals grant board access too, and are immune to Google reconciliation
CREATE OR REPLACE FUNCTION public.has_apartment_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'admin'::app_role)
     OR EXISTS (
       SELECT 1
       FROM auth.users u
       JOIN public.authorized_emails ae ON ae.email = lower(u.email)
       WHERE u.id = _user_id AND ae.authorized
     )
     OR EXISTS (
       SELECT 1
       FROM auth.users u
       JOIN public.manual_authorized_emails m ON m.email = lower(u.email)
       WHERE u.id = _user_id AND m.authorized
     )
$function$;