
ALTER TABLE public.community_baar_boys
  ADD COLUMN IF NOT EXISTS looking_for text,
  ADD COLUMN IF NOT EXISTS positives text;

DROP FUNCTION IF EXISTS public.baar_create(text,int,text,text,text,text,text,text,text,text,text,text,boolean);
CREATE FUNCTION public.baar_create(_full_name text, _age integer, _city text, _status text, _orientation text, _ethnicity text, _dress_style text, _details text, _looking_for text, _positives text, _photo_url text, _relationship_type text, _recommendation_note text, _contact_mode text, _as_nickname boolean)
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
    boy_id, user_id, relationship_type, note, contact_mode, visible
  ) VALUES (
    boy_id, uid, _relationship_type, _recommendation_note, display_mode, true
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
REVOKE ALL ON FUNCTION public.baar_create(text,int,text,text,text,text,text,text,text,text,text,text,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.baar_create(text,int,text,text,text,text,text,text,text,text,text,text,text,text,boolean) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.baar_update(uuid,text,int,text,text,text,text,text,text,text);
CREATE FUNCTION public.baar_update(_boy_id uuid, _full_name text, _age integer, _city text, _status text, _orientation text, _ethnicity text, _dress_style text, _details text, _looking_for text, _positives text, _photo_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  owner uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;

  SELECT created_by INTO owner FROM public.community_baar_boys WHERE id = _boy_id;
  IF owner IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF owner <> uid AND NOT public.baar_is_admin(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.community_baar_boys
  SET full_name = _full_name,
      age = _age,
      city = _city,
      status = _status,
      orientation = _orientation,
      ethnicity = _ethnicity,
      dress_style = _dress_style,
      details = _details,
      looking_for = _looking_for,
      positives = _positives,
      photo_url = _photo_url,
      updated_at = now()
  WHERE id = _boy_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.baar_update(uuid,text,int,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.baar_update(uuid,text,int,text,text,text,text,text,text,text,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.baar_profile(_boy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
  can_edit := mine OR public.baar_is_admin(uid);

  recs := coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id,
      'relationship_type', r.relationship_type,
      'note', r.note,
      'contact_mode', r.contact_mode,
      'visible', r.visible,
      'user_id', r.user_id,
      'author', public.community_author_json(r.user_id, false, uid),
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
    'mine', mine,
    'can_edit', can_edit,
    'can_recommend', true,
    'created_at', boy.created_at,
    'updated_at', boy.updated_at,
    'recommendations', recs,
    'recommendation_count', jsonb_array_length(recs)
  );
END;
$function$;
