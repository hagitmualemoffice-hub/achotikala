CREATE TABLE IF NOT EXISTS public.apartment_saved (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.apartment_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
GRANT SELECT, INSERT, DELETE ON public.apartment_saved TO authenticated;
GRANT ALL ON public.apartment_saved TO service_role;
ALTER TABLE public.apartment_saved ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own saved listings" ON public.apartment_saved;
CREATE POLICY "own saved listings" ON public.apartment_saved FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS apartment_saved_user_idx ON public.apartment_saved(user_id, created_at DESC);