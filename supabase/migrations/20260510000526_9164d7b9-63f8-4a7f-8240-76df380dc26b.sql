
-- Blog reactions (quick one-word reactions per post)
CREATE TABLE public.blog_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('loved','spoke_to_me','want_to_refine','less')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_reactions_slug ON public.blog_reactions(slug);
ALTER TABLE public.blog_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON public.blog_reactions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add a reaction"
  ON public.blog_reactions FOR INSERT
  WITH CHECK (true);

-- Blog comments
CREATE TABLE public.blog_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL,
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_comments_slug_created ON public.blog_comments(slug, created_at DESC);
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

-- Validation trigger (length + non-empty)
CREATE OR REPLACE FUNCTION public.validate_blog_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.content IS NULL OR length(trim(NEW.content)) = 0 THEN
    RAISE EXCEPTION 'Comment content cannot be empty';
  END IF;
  IF length(NEW.content) > 2000 THEN
    RAISE EXCEPTION 'Comment too long (max 2000 chars)';
  END IF;
  IF NEW.author_name IS NOT NULL AND length(NEW.author_name) > 80 THEN
    RAISE EXCEPTION 'Name too long (max 80 chars)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_blog_comment
  BEFORE INSERT ON public.blog_comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_blog_comment();

CREATE POLICY "Anyone can view comments"
  ON public.blog_comments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can post a comment"
  ON public.blog_comments FOR INSERT
  WITH CHECK (true);
