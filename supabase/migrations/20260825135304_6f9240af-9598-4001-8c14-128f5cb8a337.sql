CREATE TABLE public.apartment_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('looking_apartment','looking_roommate','room_available')),
  area text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  contact text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apartment_listings TO authenticated;
GRANT ALL ON public.apartment_listings TO service_role;
ALTER TABLE public.apartment_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members read listings" ON public.apartment_listings
  FOR SELECT TO authenticated USING (public.is_forum_member(auth.uid()));
CREATE POLICY "Approved members create listings" ON public.apartment_listings
  FOR INSERT TO authenticated WITH CHECK (public.is_forum_member(auth.uid()) AND auth.uid() = author_id);
CREATE POLICY "Owners update own listings" ON public.apartment_listings
  FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owners or admins delete listings" ON public.apartment_listings
  FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_apartment_listings_updated_at BEFORE UPDATE ON public.apartment_listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.apartment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.apartment_listings(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.apartment_comments TO authenticated;
GRANT ALL ON public.apartment_comments TO service_role;
ALTER TABLE public.apartment_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members read apt comments" ON public.apartment_comments
  FOR SELECT TO authenticated USING (public.is_forum_member(auth.uid()));
CREATE POLICY "Approved members create apt comments" ON public.apartment_comments
  FOR INSERT TO authenticated WITH CHECK (public.is_forum_member(auth.uid()) AND auth.uid() = author_id);
CREATE POLICY "Authors or admins delete apt comments" ON public.apartment_comments
  FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_apartment_comments_listing ON public.apartment_comments(listing_id);
CREATE INDEX idx_apartment_listings_created ON public.apartment_listings(created_at DESC);