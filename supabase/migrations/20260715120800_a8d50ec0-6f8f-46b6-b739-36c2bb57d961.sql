
-- 1. ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'editor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-grant admin to seed emails
CREATE OR REPLACE FUNCTION public.grant_seed_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) IN ('hagitmualemoffice@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_seed_admin
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_seed_admin_role();

CREATE TRIGGER on_auth_user_confirmed_seed_admin
AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_seed_admin_role();

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 2. BLOG CATEGORIES
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT ALL ON public.blog_categories TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.blog_categories TO authenticated;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.blog_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_blog_categories_updated_at BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. BLOG POSTS
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content_html text,
  content_json jsonb,
  cover_image text,
  cover_alt text,
  category_slug text,
  seo_title text,
  seo_description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  publish_at timestamptz,
  author_name text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views published posts" ON public.blog_posts FOR SELECT
  USING (status = 'published' AND (publish_at IS NULL OR publish_at <= now()));
CREATE POLICY "Admins view all posts" ON public.blog_posts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage posts" ON public.blog_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status, publish_at DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category_slug);

-- 4. EVENTS
CREATE TABLE public.events_db (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time text,
  end_time text,
  hebrew_date text,
  location text,
  city text,
  cover_image text,
  capacity int,
  early_price numeric,
  regular_price numeric,
  early_price_deadline date,
  registration jsonb,
  tag text,
  partner_logo jsonb,
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  template_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events_db TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events_db TO authenticated;
GRANT ALL ON public.events_db TO service_role;
ALTER TABLE public.events_db ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views published events" ON public.events_db FOR SELECT
  USING (status = 'published');
CREATE POLICY "Admins view all events" ON public.events_db FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage events" ON public.events_db FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_events_db_updated_at BEFORE UPDATE ON public.events_db
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_events_db_date ON public.events_db(event_date);

-- 5. EVENT TEMPLATES
CREATE TABLE public.event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  cover_image text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_templates TO authenticated;
GRANT ALL ON public.event_templates TO service_role;
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage templates" ON public.event_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_event_templates_updated_at BEFORE UPDATE ON public.event_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. PODCAST EPISODES
CREATE TABLE public.podcast_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image text,
  spotify_url text,
  apple_url text,
  youtube_url text,
  episode_number int,
  publish_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.podcast_episodes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.podcast_episodes TO authenticated;
GRANT ALL ON public.podcast_episodes TO service_role;
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views published episodes" ON public.podcast_episodes FOR SELECT
  USING (status = 'published');
CREATE POLICY "Admins view all episodes" ON public.podcast_episodes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage episodes" ON public.podcast_episodes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_podcast_episodes_updated_at BEFORE UPDATE ON public.podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7. MEDIA ASSETS
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  public_url text NOT NULL,
  filename text NOT NULL,
  alt_text text,
  mime_type text,
  size_bytes bigint,
  width int,
  height int,
  tags text[],
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage media" ON public.media_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Seed blog categories from existing sections
INSERT INTO public.blog_categories (slug, name, sort_order) VALUES
  ('lifney-hashiava', 'לפני השייבה', 10),
  ('midaa-lehachlata', 'מודעה להחלטה', 20),
  ('lifney-hatahalich', 'לפני התהליך', 30),
  ('lifney-chibur', 'לפני חיבור', 40),
  ('shimur-tahalich', 'שימור תהליך', 50),
  ('acharei-hashiava', 'אחרי השייבה', 60),
  ('yotzot-laor', 'יוצאות לאור', 70),
  ('shimur-poriut', 'שימור פוריות', 80)
ON CONFLICT (slug) DO NOTHING;
