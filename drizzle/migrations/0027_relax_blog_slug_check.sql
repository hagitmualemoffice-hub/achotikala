DROP POLICY IF EXISTS "Anyone can post a comment" ON public.blog_comments;
CREATE POLICY "Anyone can post a comment" ON public.blog_comments
  FOR INSERT TO anon, authenticated WITH CHECK (
    length(trim(slug)) BETWEEN 1 AND 200
    AND length(trim(content)) BETWEEN 1 AND 2000
    AND (author_name IS NULL OR length(author_name) <= 80)
  );
DROP POLICY IF EXISTS "Anyone can add a reaction" ON public.blog_reactions;
CREATE POLICY "Anyone can add a reaction" ON public.blog_reactions
  FOR INSERT TO anon, authenticated WITH CHECK (
    length(trim(slug)) BETWEEN 1 AND 200
    AND reaction_type IN ('loved','spoke_to_me','want_to_refine','less')
  );