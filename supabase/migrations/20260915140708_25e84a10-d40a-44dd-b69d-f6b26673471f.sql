ALTER TABLE public.community_baar_recommendations
  ADD COLUMN IF NOT EXISTS has_photo boolean,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text;

CREATE OR REPLACE FUNCTION public.baar_recommend(_boy_id uuid, _relationship_type text, _note text, _contact_mode text, _has_photo boolean DEFAULT NULL, _contact_phone text DEFAULT NULL, _contact_email text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.community_baar_boys WHERE id = _boy_id AND is_active = true) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.community_baar_recommendations (
    boy_id, user_id, relationship_type, note, contact_mode, visible, has_photo, contact_phone, contact_email
  ) VALUES (
    _boy_id, uid, _relationship_type, _note, coalesce(_contact_mode, 'liba'), true,
    _has_photo, nullif(btrim(_contact_phone), ''), nullif(btrim(_contact_email), '')
  )
  ON CONFLICT (boy_id, user_id)
  DO UPDATE SET relationship_type = EXCLUDED.relationship_type,
                note = EXCLUDED.note,
                contact_mode = EXCLUDED.contact_mode,
                has_photo = coalesce(EXCLUDED.has_photo, public.community_baar_recommendations.has_photo),
                contact_phone = coalesce(EXCLUDED.contact_phone, public.community_baar_recommendations.contact_phone),
                contact_email = coalesce(EXCLUDED.contact_email, public.community_baar_recommendations.contact_email),
                updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.baar_create(_full_name text, _age integer, _city text, _status text, _orientation text, _ethnicity text, _dress_style text, _details text, _looking_for text, _positives text, _photo_url text, _relationship_type text, _recommendation_note text, _contact_mode text, _as_nickname boolean, _has_photo boolean DEFAULT NULL, _contact_phone text DEFAULT NULL, _contact_email text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  boy_id uuid;
  display_mode text;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  display_mode := coalesce(_contact_mode, 'liba');

  INSERT INTO public.community_baar_boys (
    full_name, age, city, status, orientation, ethnicity, dress_style,
    details, looking_for, positives, photo_url, created_by
  ) VALUES (
    _full_name, _age, _city, _status, _orientation, _ethnicity, _dress_style,
    _details, _looking_for, _positives, _photo_url, uid
  ) RETURNING id INTO boy_id;

  INSERT INTO public.community_baar_recommendations (
    boy_id, user_id, relationship_type, note, contact_mode, visible, has_photo, contact_phone, contact_email
  ) VALUES (
    boy_id, uid, _relationship_type, _recommendation_note, display_mode, true,
    _has_photo, nullif(btrim(_contact_phone), ''), nullif(btrim(_contact_email), '')
  );

  UPDATE public.community_profiles
  SET baar_boys_count = baar_boys_count + 1,
      baar_access = CASE
        WHEN baar_access = false AND (baar_boys_count + 1) >= 2 THEN true
        ELSE baar_access
      END,
      baar_access_granted_at = CASE
        WHEN baar_access = false AND (baar_boys_count + 1) >= 2 THEN now()
        ELSE baar_access_granted_at
      END,
      baar_access_source = CASE
        WHEN baar_access = false AND (baar_boys_count + 1) >= 2 THEN 'auto_2_boys'
        ELSE baar_access_source
      END
  WHERE user_id = uid;

  RETURN boy_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.baar_profile(_boy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'has_photo', r.has_photo,
      'legacy_name', r.legacy_name,
      'legacy_email', r.legacy_email,
      'legacy_phone', r.legacy_phone,
      'contact_phone', CASE
        WHEN r.user_id = uid OR r.contact_mode IN ('profile','both') THEN coalesce(r.contact_phone, r.legacy_phone)
        ELSE NULL END,
      'contact_email', CASE
        WHEN r.user_id = uid OR r.contact_mode IN ('profile','both') THEN coalesce(r.contact_email, r.legacy_email)
        ELSE NULL END,
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
$function$;