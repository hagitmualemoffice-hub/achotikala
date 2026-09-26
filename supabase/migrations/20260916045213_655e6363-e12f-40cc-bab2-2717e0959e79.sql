ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_skipped_at timestamptz;

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
    'needs_onboarding', (p.user_id IS NULL OR (p.onboarding_completed_at IS NULL AND p.onboarding_skipped_at IS NULL)),
    'completed_at', p.onboarding_completed_at,
    'skipped_at', p.onboarding_skipped_at,
    'interests', coalesce(to_jsonb(p.interests), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.community_save_onboarding(
  _interests text[] DEFAULT NULL,
  _done boolean DEFAULT false,
  _skipped boolean DEFAULT false
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
         onboarding_skipped_at = CASE WHEN _skipped THEN now() ELSE onboarding_skipped_at END
   WHERE user_id = uid;
  RETURN public.community_onboarding_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.community_global_search(
  _q text,
  _kind text DEFAULT NULL,
  _limit int DEFAULT 5,
  _offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  q text := btrim(coalesce(_q, ''));
  pats text[];
  has_baar boolean;
  lim int := least(greatest(coalesce(_limit, 5), 1), 50);
  off int := greatest(coalesce(_offset, 0), 0);
  groups jsonb := '{}'::jsonb;
  g jsonb;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authorized', false, 'groups', '{}'::jsonb);
  END IF;

  has_baar := public.baar_has_access(uid);

  IF length(q) < 2 THEN
    RETURN jsonb_build_object('authorized', true, 'baar_access', has_baar, 'groups', '{}'::jsonb);
  END IF;

  SELECT array_agg('%' || t || '%')
    INTO pats
    FROM unnest(regexp_split_to_array(q, '\s+')) t
   WHERE btrim(t) <> '';

  IF _kind IS NULL OR _kind = 'posts' THEN
    WITH m AS (
      SELECT p.id, p.space, p.title, left(p.body, 220) AS body, p.created_at
        FROM public.community_posts p
       WHERE p.status = 'active'
         AND (coalesce(p.title, '') || ' ' || coalesce(p.body, '')) ILIKE ALL (pats)
       ORDER BY coalesce(p.last_activity_at, p.created_at) DESC
    )
    SELECT jsonb_build_object(
             'total', (SELECT count(*) FROM m),
             'items', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
                         FROM (SELECT * FROM m LIMIT lim OFFSET off) x)
           ) INTO g;
    groups := groups || jsonb_build_object('posts', g);
  END IF;

  IF _kind IS NULL OR _kind = 'inquiries' THEN
    WITH m AS (
      SELECT i.id, i.boy_name, i.age, i.city, i.yeshiva, i.background,
             i.info_types, i.status, i.created_at
        FROM public.community_inquiries i
       WHERE i.status <> 'deleted'
         AND (coalesce(i.boy_name, '') || ' ' || coalesce(i.city, '') || ' ' ||
              coalesce(i.yeshiva, '') || ' ' || coalesce(i.background, '') || ' ' ||
              coalesce(i.details, '')) ILIKE ALL (pats)
       ORDER BY coalesce(i.bumped_at, i.created_at) DESC
    )
    SELECT jsonb_build_object(
             'total', (SELECT count(*) FROM m),
             'items', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
                         FROM (SELECT * FROM m LIMIT lim OFFSET off) x)
           ) INTO g;
    groups := groups || jsonb_build_object('inquiries', g);
  END IF;

  IF has_baar AND (_kind IS NULL OR _kind = 'boys') THEN
    WITH m AS (
      SELECT b.id, b.full_name, b.age, b.city, b.status, b.ethnicity, b.created_at,
             EXISTS (SELECT 1 FROM public.community_baar_recommendations r
                      WHERE r.boy_id = b.id AND r.visible) AS has_recommendation
        FROM public.community_baar_boys b
       WHERE b.is_active
         AND b.full_name ILIKE ALL (pats)
       ORDER BY b.created_at DESC
    )
    SELECT jsonb_build_object(
             'total', (SELECT count(*) FROM m),
             'items', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
                         FROM (SELECT * FROM m LIMIT lim OFFSET off) x)
           ) INTO g;
    groups := groups || jsonb_build_object('boys', g);
  END IF;

  IF _kind IS NULL OR _kind = 'places' THEN
    WITH m AS (
      SELECT pl.id, pl.name, pl.kind, pl.area, pl.kashrut, pl.crowd_level, pl.created_at
        FROM public.community_places pl
       WHERE pl.is_active
         AND (coalesce(pl.name, '') || ' ' || coalesce(pl.area, '') || ' ' ||
              coalesce(pl.kind, '') || ' ' || coalesce(pl.address, '') || ' ' ||
              coalesce(pl.details, '') || ' ' || coalesce(pl.loved_note, '')) ILIKE ALL (pats)
       ORDER BY pl.name
    )
    SELECT jsonb_build_object(
             'total', (SELECT count(*) FROM m),
             'items', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
                         FROM (SELECT * FROM m LIMIT lim OFFSET off) x)
           ) INTO g;
    groups := groups || jsonb_build_object('places', g);
  END IF;

  IF _kind IS NULL OR _kind = 'events' THEN
    WITH m AS (
      SELECT e.id, e.slug, e.title, e.event_date, e.event_time, e.location, e.city
        FROM public.events_db e
       WHERE coalesce(e.status, 'published') NOT IN ('draft', 'cancelled', 'deleted')
         AND (coalesce(e.title, '') || ' ' || coalesce(e.description, '') || ' ' ||
              coalesce(e.location, '') || ' ' || coalesce(e.city, '')) ILIKE ALL (pats)
       ORDER BY e.event_date DESC NULLS LAST
    )
    SELECT jsonb_build_object(
             'total', (SELECT count(*) FROM m),
             'items', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
                         FROM (SELECT * FROM m LIMIT lim OFFSET off) x)
           ) INTO g;
    groups := groups || jsonb_build_object('events', g);
  END IF;

  RETURN jsonb_build_object('authorized', true, 'baar_access', has_baar, 'groups', groups);
END;
$$;

REVOKE ALL ON FUNCTION public.community_global_search(text, text, int, int) FROM public;
GRANT EXECUTE ON FUNCTION public.community_global_search(text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_onboarding_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_save_onboarding(text[], boolean, boolean) TO authenticated;