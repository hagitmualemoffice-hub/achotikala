REVOKE ALL ON FUNCTION public.community_award_hearts(uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_hearts_json(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.community_my_hearts() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_mark_helpful(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_my_hearts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_mark_helpful(uuid) TO authenticated;
COMMENT ON TABLE public.community_hearts_ledger IS
  'Heart ledger. Intentionally has RLS enabled with no policies: it is written and read only by the community security-definer functions.';