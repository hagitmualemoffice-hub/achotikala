DROP POLICY IF EXISTS "Authenticated admins can read offline sync state" ON public.offline_sync_state;
CREATE POLICY "Authenticated admins can read offline sync state" ON public.offline_sync_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can post a comment" ON public.blog_comments;
CREATE POLICY "Anyone can post a comment" ON public.blog_comments
  FOR INSERT TO anon, authenticated WITH CHECK (
    slug ~ '^[a-z0-9-]{1,120}$'
    AND length(trim(content)) BETWEEN 1 AND 2000
    AND (author_name IS NULL OR length(author_name) <= 80)
  );
DROP POLICY IF EXISTS "Anyone can view comments" ON public.blog_comments;
CREATE POLICY "Anyone can view comments" ON public.blog_comments
  FOR SELECT TO anon, authenticated USING (slug IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can add a reaction" ON public.blog_reactions;
CREATE POLICY "Anyone can add a reaction" ON public.blog_reactions
  FOR INSERT TO anon, authenticated WITH CHECK (
    slug ~ '^[a-z0-9-]{1,120}$'
    AND reaction_type IN ('loved','spoke_to_me','want_to_refine','less')
  );
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.blog_reactions;
CREATE POLICY "Anyone can view reactions" ON public.blog_reactions
  FOR SELECT TO anon, authenticated USING (slug IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view categories" ON public.blog_categories;
CREATE POLICY "Anyone can view categories" ON public.blog_categories
  FOR SELECT TO anon, authenticated USING (slug IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads" ON public.leads
  FOR INSERT TO anon, authenticated WITH CHECK (
    email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' AND length(email) <= 255
    AND (name IS NULL OR length(name) <= 120)
    AND (source IS NULL OR length(source) <= 60)
  );