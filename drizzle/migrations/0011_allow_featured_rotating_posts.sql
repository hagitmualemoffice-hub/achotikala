ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_status_chk;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_status_chk CHECK (status IN ('active','featured','removed'));

CREATE INDEX IF NOT EXISTS community_posts_featured_idx ON public.community_posts (status) WHERE status='featured';