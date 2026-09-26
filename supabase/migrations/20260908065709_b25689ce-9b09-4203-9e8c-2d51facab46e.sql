DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'community_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, PUBLIC', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.community_bootstrap() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_feed(text, text, text, boolean, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_thread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_create_post(text, text, text, boolean, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_add_comment(uuid, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_toggle_reaction(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_toggle_save(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_update_content(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_delete_content(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_report(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_recommend_tool(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_set_nickname(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_admin_pin(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_admin_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_admin_review_tool(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_admin_review_report(uuid, text) TO authenticated;