ALTER TABLE public.apartment_listings
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS entry_date date,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS current_women integer,
  ADD COLUMN IF NOT EXISTS seeking_count integer,
  ADD COLUMN IF NOT EXISTS total_women integer,
  ADD COLUMN IF NOT EXISTS private_room boolean,
  ADD COLUMN IF NOT EXISTS sublet_from date,
  ADD COLUMN IF NOT EXISTS sublet_to date,
  ADD COLUMN IF NOT EXISTS max_roommates integer;

ALTER TABLE public.apartment_listings ALTER COLUMN area DROP NOT NULL;
ALTER TABLE public.apartment_listings ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.apartment_listings ALTER COLUMN description DROP NOT NULL;

ALTER TABLE public.apartment_listings
  DROP CONSTRAINT IF EXISTS apartment_listings_status_check;
ALTER TABLE public.apartment_listings
  ADD CONSTRAINT apartment_listings_status_check CHECK (status IN ('active','closed','expired'));

ALTER TABLE public.apartment_listings
  DROP CONSTRAINT IF EXISTS apartment_listings_contact_required;
ALTER TABLE public.apartment_listings
  ADD CONSTRAINT apartment_listings_contact_required
  CHECK (coalesce(nullif(trim(phone), ''), nullif(trim(email), ''), nullif(trim(contact), '')) IS NOT NULL);

DROP POLICY IF EXISTS "Approved members read listings" ON public.apartment_listings;
DROP POLICY IF EXISTS "Approved members create listings" ON public.apartment_listings;

CREATE POLICY "Anyone reads active listings"
  ON public.apartment_listings FOR SELECT TO anon, authenticated
  USING (status = 'active' AND expires_at > now());

CREATE POLICY "Owners read own listings"
  ON public.apartment_listings FOR SELECT TO authenticated
  USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Signed in users create own listings"
  ON public.apartment_listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

GRANT SELECT ON public.apartment_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apartment_listings TO authenticated;
GRANT ALL ON public.apartment_listings TO service_role;

CREATE INDEX IF NOT EXISTS apartment_listings_active_idx
  ON public.apartment_listings (status, expires_at DESC);