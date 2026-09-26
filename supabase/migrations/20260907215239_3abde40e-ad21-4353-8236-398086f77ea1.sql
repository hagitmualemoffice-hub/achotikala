REVOKE ALL ON FUNCTION public.has_apartment_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.my_apartment_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_apartment_access() TO authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_forum_member(uuid) FROM PUBLIC, anon;