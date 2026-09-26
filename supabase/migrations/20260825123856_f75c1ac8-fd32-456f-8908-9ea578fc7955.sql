REVOKE EXECUTE ON FUNCTION public.is_forum_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_forum_member(uuid) TO authenticated, service_role;