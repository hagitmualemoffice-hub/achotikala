CREATE TABLE public.authorized_emails (
  email text PRIMARY KEY,
  authorized boolean NOT NULL DEFAULT true,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.authorized_emails TO authenticated;
GRANT ALL ON public.authorized_emails TO service_role;

ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read authorized emails"
  ON public.authorized_emails FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_authorized_emails_updated_at
  BEFORE UPDATE ON public.authorized_emails
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.apartment_access_sync (
  id integer PRIMARY KEY DEFAULT 1,
  last_synced_at timestamptz,
  last_status text,
  last_error text,
  authorized_count integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apartment_access_sync_single_row CHECK (id = 1)
);

GRANT SELECT ON public.apartment_access_sync TO authenticated;
GRANT ALL ON public.apartment_access_sync TO service_role;

ALTER TABLE public.apartment_access_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read apartment access sync"
  ON public.apartment_access_sync FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.apartment_access_sync (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_apartment_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
     OR EXISTS (
       SELECT 1
       FROM auth.users u
       JOIN public.authorized_emails ae ON ae.email = lower(u.email)
       WHERE u.id = _user_id AND ae.authorized
     )
$$;

CREATE OR REPLACE FUNCTION public.my_apartment_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_apartment_access(auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.my_apartment_access() TO authenticated;

DROP POLICY IF EXISTS "Anyone reads active listings" ON public.apartment_listings;
DROP POLICY IF EXISTS "Signed in users create own listings" ON public.apartment_listings;

CREATE POLICY "Authorized members read active listings"
  ON public.apartment_listings FOR SELECT TO authenticated
  USING (status = 'active' AND expires_at > now() AND public.has_apartment_access(auth.uid()));

CREATE POLICY "Authorized members create own listings"
  ON public.apartment_listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.has_apartment_access(auth.uid()));

DROP POLICY IF EXISTS "Approved members read apt comments" ON public.apartment_comments;
DROP POLICY IF EXISTS "Approved members create apt comments" ON public.apartment_comments;

CREATE POLICY "Authorized members read apt comments"
  ON public.apartment_comments FOR SELECT TO authenticated
  USING (public.has_apartment_access(auth.uid()));

CREATE POLICY "Authorized members create apt comments"
  ON public.apartment_comments FOR INSERT TO authenticated
  WITH CHECK (public.has_apartment_access(auth.uid()) AND auth.uid() = author_id);