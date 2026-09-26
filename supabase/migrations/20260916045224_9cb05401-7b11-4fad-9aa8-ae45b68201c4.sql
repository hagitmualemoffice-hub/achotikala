REVOKE ALL ON FUNCTION public.community_onboarding_state() FROM anon, public;
REVOKE ALL ON FUNCTION public.community_save_onboarding(text[], boolean, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.community_onboarding_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_save_onboarding(text[], boolean, boolean) TO authenticated;