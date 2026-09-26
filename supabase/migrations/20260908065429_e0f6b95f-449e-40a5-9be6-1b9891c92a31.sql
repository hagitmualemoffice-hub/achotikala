-- ============ COMMUNITY V1: tables ============
CREATE TABLE IF NOT EXISTS public.community_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  nickname text UNIQUE,
  last_visit_at timestamptz,
  previous_visit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space text NOT NULL,
  title text,
  body text NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  as_nickname boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  edited_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_space_chk CHECK (space IN ('writing','car','finance','discussions','shabbat','spiritual','fertility')),
  CONSTRAINT community_posts_status_chk CHECK (status IN ('active','removed')),
  CONSTRAINT community_posts_body_chk CHECK (length(btrim(body)) BETWEEN 2 AND 20000)
);
CREATE INDEX IF NOT EXISTS community_posts_feed_idx ON public.community_posts (status, space, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_activity_idx ON public.community_posts (status, last_activity_at DESC);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  as_nickname boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_comments_status_chk CHECK (status IN ('active','removed')),
  CONSTRAINT community_comments_body_chk CHECK (length(btrim(body)) BETWEEN 1 AND 8000)
);
CREATE INDEX IF NOT EXISTS community_comments_post_idx ON public.community_comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS public.community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_reactions_target_chk CHECK (target_type IN ('post','comment')),
  CONSTRAINT community_reactions_kind_chk CHECK (kind IN ('heart','pray','clap','useful','me_too')),
  UNIQUE (target_type, target_id, user_id, kind)
);
CREATE INDEX IF NOT EXISTS community_reactions_target_idx ON public.community_reactions (target_type, target_id);

CREATE TABLE IF NOT EXISTS public.community_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  meta text,
  url text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_attachments_kind_chk CHECK (kind IN ('file','link','pdf','excel','doc','image'))
);
CREATE INDEX IF NOT EXISTS community_attachments_post_idx ON public.community_attachments (post_id);

CREATE TABLE IF NOT EXISTS public.community_saved_posts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_reports_target_chk CHECK (target_type IN ('post','comment')),
  CONSTRAINT community_reports_status_chk CHECK (status IN ('pending','dismissed','actioned'))
);

CREATE TABLE IF NOT EXISTS public.community_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'link',
  space text,
  url text,
  storage_path text,
  credited_name text,
  note text,
  source_post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL,
  source_attachment_id uuid REFERENCES public.community_attachments(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_tools_status_chk CHECK (status IN ('pending','approved','rejected'))
);

CREATE TABLE IF NOT EXISTS public.community_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  note text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date_label text,
  place text,
  starts_at timestamptz,
  url text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.community_profiles      TO service_role;
GRANT ALL ON public.community_posts         TO service_role;
GRANT ALL ON public.community_comments      TO service_role;
GRANT ALL ON public.community_reactions     TO service_role;
GRANT ALL ON public.community_attachments   TO service_role;
GRANT ALL ON public.community_saved_posts   TO service_role;
GRANT ALL ON public.community_reports       TO service_role;
GRANT ALL ON public.community_tools         TO service_role;
GRANT ALL ON public.community_notices       TO service_role;
GRANT ALL ON public.community_events        TO service_role;

ALTER TABLE public.community_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_tools       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_notices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events      ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_tools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_notices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_reports TO authenticated;

CREATE POLICY "Admins manage community posts" ON public.community_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage community comments" ON public.community_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage community tools" ON public.community_tools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage community notices" ON public.community_notices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage community events" ON public.community_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage community reports" ON public.community_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_community_profiles_updated BEFORE UPDATE ON public.community_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_community_posts_updated BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_community_comments_updated BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();