CREATE OR REPLACE FUNCTION public.community_onboarding_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); p public.community_profiles;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;
  SELECT * INTO p FROM public.community_profiles WHERE user_id = uid;
  RETURN jsonb_build_object(
    'authorized', true,
    'version', coalesce(p.onboarding_version, 0),
    'needs_onboarding', (p.user_id IS NULL OR coalesce(p.onboarding_version, 0) < 3),
    'has_agreement', (p.accepted_agreement_at IS NOT NULL AND p.accepted_advertising_at IS NOT NULL),
    'completed_at', p.onboarding_completed_at,
    'skipped_at', p.onboarding_skipped_at,
    'interests', coalesce(to_jsonb(p.interests), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.community_onboarding_state() TO authenticated;