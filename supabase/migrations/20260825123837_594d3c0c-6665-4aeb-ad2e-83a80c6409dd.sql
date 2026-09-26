-- Forum membership (closed community) --------------------------------------
CREATE TABLE public.forum_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.forum_members TO authenticated;
GRANT ALL ON public.forum_members TO service_role;
ALTER TABLE public.forum_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_forum_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.forum_members
    WHERE user_id = _user_id AND status = 'approved'
  )
$$;

CREATE POLICY "Members view own membership" ON public.forum_members
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage members" ON public.forum_members
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER forum_members_updated_at BEFORE UPDATE ON public.forum_members
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Posts ---------------------------------------------------------------------
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_posts TO service_role;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members read posts" ON public.forum_posts
FOR SELECT TO authenticated USING (public.is_forum_member(auth.uid()));

CREATE POLICY "Approved members create posts" ON public.forum_posts
FOR INSERT TO authenticated
WITH CHECK (public.is_forum_member(auth.uid()) AND auth.uid() = author_id);

CREATE POLICY "Authors or admins delete posts" ON public.forum_posts
FOR DELETE TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

-- Comments ------------------------------------------------------------------
CREATE TABLE public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.forum_comments TO authenticated;
GRANT ALL ON public.forum_comments TO service_role;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members read comments" ON public.forum_comments
FOR SELECT TO authenticated USING (public.is_forum_member(auth.uid()));

CREATE POLICY "Approved members create comments" ON public.forum_comments
FOR INSERT TO authenticated
WITH CHECK (public.is_forum_member(auth.uid()) AND auth.uid() = author_id);

CREATE POLICY "Authors or admins delete comments" ON public.forum_comments
FOR DELETE TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX forum_comments_post_idx ON public.forum_comments(post_id, created_at);
CREATE INDEX forum_posts_created_idx ON public.forum_posts(created_at DESC);