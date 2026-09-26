REVOKE EXECUTE ON FUNCTION public.baar_toggle_save(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.baar_saved_list() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.baar_toggle_save(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.baar_saved_list() TO authenticated;