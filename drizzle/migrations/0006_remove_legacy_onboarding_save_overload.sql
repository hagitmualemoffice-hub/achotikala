DROP FUNCTION IF EXISTS public.community_save_onboarding(text[], boolean, boolean);

REVOKE ALL ON FUNCTION public.community_save_onboarding(text[], boolean, boolean, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.community_save_onboarding(text[], boolean, boolean, integer) TO authenticated;