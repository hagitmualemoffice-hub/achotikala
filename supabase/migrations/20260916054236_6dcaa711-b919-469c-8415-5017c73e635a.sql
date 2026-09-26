ALTER TABLE public.community_profiles ALTER COLUMN show_online SET DEFAULT true;
UPDATE public.community_profiles SET show_online = true WHERE show_online = false;