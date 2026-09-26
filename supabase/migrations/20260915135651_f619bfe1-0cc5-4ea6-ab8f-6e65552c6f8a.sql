ALTER TABLE public.community_baar_boys ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.community_baar_recommendations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.community_baar_recommendations
  ADD COLUMN IF NOT EXISTS legacy_name text,
  ADD COLUMN IF NOT EXISTS legacy_email text,
  ADD COLUMN IF NOT EXISTS legacy_phone text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';
ALTER TABLE public.community_baar_boys
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';

ALTER TABLE public.community_baar_recommendations DROP CONSTRAINT IF EXISTS community_baar_recommendations_boy_id_user_id_key;

CREATE OR REPLACE FUNCTION public.baar_profile(_boy_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  uid uuid := auth.uid();
  boy public.community_baar_boys%ROWTYPE;
  recs jsonb;
  mine boolean;
  can_edit boolean;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO boy FROM public.community_baar_boys WHERE id = _boy_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  mine := boy.created_by = uid;
  can_edit := coalesce(mine, false) OR public.baar_is_admin(uid);

  recs := coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id,
      'relationship_type', r.relationship_type,
      'note', r.note,
      'contact_mode', r.contact_mode,
      'visible', r.visible,
      'user_id', r.user_id,
      'source', r.source,
      'legacy_name', r.legacy_name,
      'legacy_email', r.legacy_email,
      'legacy_phone', r.legacy_phone,
      'author', CASE
        WHEN r.user_id IS NOT NULL THEN public.community_author_json(r.user_id, false, uid)
        ELSE jsonb_build_object(
          'name', coalesce(nullif(btrim(r.legacy_name), ''), 'ממליצה מהבאר'),
          'initials', public.community_initials(coalesce(nullif(btrim(r.legacy_name), ''), 'ממליצה')),
          'avatar_url', NULL,
          'profile_id', NULL,
          'is_nickname', false
        )
      END,
      'created_at', r.created_at
    ) ORDER BY r.created_at DESC)
    FROM public.community_baar_recommendations r
    WHERE r.boy_id = _boy_id AND (r.visible = true OR r.user_id = uid OR can_edit)
  ), '[]'::jsonb);

  RETURN jsonb_build_object(
    'id', boy.id,
    'full_name', boy.full_name,
    'age', boy.age,
    'city', boy.city,
    'status', boy.status,
    'orientation', boy.orientation,
    'ethnicity', boy.ethnicity,
    'dress_style', boy.dress_style,
    'details', boy.details,
    'looking_for', boy.looking_for,
    'positives', boy.positives,
    'photo_url', boy.photo_url,
    'created_by', boy.created_by,
    'source', boy.source,
    'mine', coalesce(mine, false),
    'can_edit', can_edit,
    'can_recommend', true,
    'created_at', boy.created_at,
    'updated_at', boy.updated_at,
    'recommendations', recs,
    'recommendation_count', jsonb_array_length(recs)
  );
END;
$fn$;