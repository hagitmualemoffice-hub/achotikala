ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS onboarding_version integer NOT NULL DEFAULT 0;

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
    'needs_onboarding', (p.user_id IS NULL OR coalesce(p.onboarding_version, 0) < 2),
    'has_agreement', (p.accepted_agreement_at IS NOT NULL AND p.accepted_advertising_at IS NOT NULL),
    'completed_at', p.onboarding_completed_at,
    'skipped_at', p.onboarding_skipped_at,
    'interests', coalesce(to_jsonb(p.interests), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.community_save_onboarding(
  _interests text[] DEFAULT NULL,
  _done boolean DEFAULT false,
  _skipped boolean DEFAULT false,
  _version integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;
  UPDATE public.community_profiles
     SET interests = coalesce(_interests, interests),
         onboarding_completed_at = CASE WHEN _done THEN coalesce(onboarding_completed_at, now()) ELSE onboarding_completed_at END,
         onboarding_skipped_at = CASE WHEN _skipped THEN now() ELSE onboarding_skipped_at END,
         onboarding_version = CASE
           WHEN _version IS NOT NULL AND (_done OR _skipped) THEN greatest(coalesce(onboarding_version, 0), _version)
           ELSE onboarding_version END
   WHERE user_id = uid;
  RETURN public.community_onboarding_state();
END;
$$;

REVOKE ALL ON FUNCTION public.community_save_onboarding(text[], boolean, boolean, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.community_save_onboarding(text[], boolean, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_onboarding_state() TO authenticated;