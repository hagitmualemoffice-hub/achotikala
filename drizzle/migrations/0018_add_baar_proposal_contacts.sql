ALTER TABLE public.community_baar_boys
  ADD COLUMN IF NOT EXISTS proposal_contact_name text,
  ADD COLUMN IF NOT EXISTS proposal_contact_phone text,
  ADD COLUMN IF NOT EXISTS proposal_contact_email text;

COMMENT ON COLUMN public.community_baar_boys.proposal_contact_name IS 'Full name of the contact who can receive a match proposal for this boy.';
COMMENT ON COLUMN public.community_baar_boys.proposal_contact_phone IS 'Phone number of the contact who can receive a match proposal for this boy.';
COMMENT ON COLUMN public.community_baar_boys.proposal_contact_email IS 'Email address of the contact who can receive a match proposal for this boy.';

CREATE OR REPLACE FUNCTION public.baar_set_proposal_contact(
  _boy_id uuid,
  _contact_name text,
  _contact_phone text,
  _contact_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_baar_boys WHERE id = _boy_id AND is_active) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(btrim(coalesce(_contact_name, ''))) < 2 THEN RAISE EXCEPTION 'contact_name_required'; END IF;
  IF char_length(regexp_replace(coalesce(_contact_phone, ''), '[^0-9]', '', 'g')) < 9 THEN RAISE EXCEPTION 'contact_phone_required'; END IF;
  IF btrim(coalesce(_contact_email, '')) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'contact_email_required'; END IF;

  UPDATE public.community_baar_boys
  SET proposal_contact_name = btrim(_contact_name),
      proposal_contact_phone = btrim(_contact_phone),
      proposal_contact_email = lower(btrim(_contact_email)),
      last_edited_by = uid,
      updated_at = now()
  WHERE id = _boy_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.baar_set_proposal_contact(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.baar_set_proposal_contact(uuid, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.baar_list(_query text, _status text, _orientation text, _ethnicity text, _dress_style text, _min_age integer, _max_age integer, _has_recommendations boolean, _sort text, _limit integer, _offset integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH filtered AS (
      SELECT b.* FROM public.community_baar_boys b
      WHERE b.is_active = true
        AND (_query IS NULL OR _query = '' OR b.full_name ILIKE '%' || _query || '%')
        AND (_status IS NULL OR _status = '' OR b.status = _status)
        AND (_orientation IS NULL OR _orientation = '' OR b.orientation = _orientation)
        AND (_ethnicity IS NULL OR _ethnicity = '' OR b.ethnicity = _ethnicity)
        AND (_dress_style IS NULL OR _dress_style = '' OR b.dress_style = _dress_style)
        AND (_min_age IS NULL OR b.age >= _min_age)
        AND (_max_age IS NULL OR b.age <= _max_age)
        AND (_sort <> 'saved' OR EXISTS (SELECT 1 FROM public.community_baar_saved s WHERE s.boy_id = b.id AND s.user_id = uid))
        AND (_has_recommendations IS NOT TRUE OR EXISTS (SELECT 1 FROM public.community_baar_recommendations r WHERE r.boy_id = b.id))
    ),
    page_items AS (
      SELECT jsonb_build_object(
        'id', b.id, 'full_name', b.full_name, 'age', b.age, 'city', b.city,
        'status', b.status, 'orientation', b.orientation, 'ethnicity', b.ethnicity,
        'dress_style', b.dress_style, 'details', left(b.details, 240),
        'looking_for', b.looking_for, 'positives', b.positives, 'photo_url', b.photo_url,
        'proposal_contact_name', b.proposal_contact_name,
        'proposal_contact_phone', b.proposal_contact_phone,
        'proposal_contact_email', b.proposal_contact_email,
        'has_photo', EXISTS (SELECT 1 FROM public.community_baar_recommendations r WHERE r.boy_id = b.id AND r.has_photo IS TRUE),
        'saved', EXISTS (SELECT 1 FROM public.community_baar_saved s WHERE s.boy_id = b.id AND s.user_id = uid),
        'is_active', b.is_active, 'created_by', b.created_by, 'mine', b.created_by = uid,
        'updated_at', b.updated_at, 'created_at', b.created_at,
        'recommendation_count', (SELECT count(*) FROM public.community_baar_recommendations r WHERE r.boy_id = b.id),
        'my_recommendation', (
          SELECT jsonb_build_object('relationship_type', r.relationship_type, 'note', r.note,
            'contact_mode', r.contact_mode, 'visible', r.visible, 'has_photo', r.has_photo,
            'contact_phone', r.contact_phone, 'contact_email', r.contact_email)
          FROM public.community_baar_recommendations r WHERE r.boy_id = b.id AND r.user_id = uid
        )
      ) AS item
      FROM filtered b
      ORDER BY CASE WHEN _sort = 'recent' THEN b.updated_at END DESC NULLS LAST,
        CASE WHEN _sort = 'name' THEN b.full_name END ASC NULLS LAST, b.created_at DESC
      LIMIT least(greatest(coalesce(_limit, 20), 1), 100)
      OFFSET greatest(coalesce(_offset, 0), 0)
    )
    SELECT jsonb_build_object('items', coalesce((SELECT jsonb_agg(item) FROM page_items), '[]'::jsonb), 'total', (SELECT count(*) FROM filtered))
  );
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
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  mine := boy.created_by = uid;
  can_edit := coalesce(mine, false) OR public.baar_is_admin(uid);
  recs := coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'relationship_type', r.relationship_type, 'note', r.note,
      'contact_mode', r.contact_mode, 'visible', r.visible, 'user_id', r.user_id,
      'source', r.source, 'has_photo', r.has_photo, 'legacy_name', r.legacy_name,
      'legacy_email', r.legacy_email, 'legacy_phone', r.legacy_phone,
      'contact_phone', CASE WHEN r.user_id = uid OR r.contact_mode IN ('profile','both') THEN coalesce(r.contact_phone, r.legacy_phone) ELSE NULL END,
      'contact_email', CASE WHEN r.user_id = uid OR r.contact_mode IN ('profile','both') THEN coalesce(r.contact_email, r.legacy_email) ELSE NULL END,
      'author', CASE WHEN r.user_id IS NOT NULL THEN public.community_author_json(r.user_id, false, uid)
        ELSE jsonb_build_object('name', coalesce(nullif(btrim(r.legacy_name), ''), 'ממליצה מהבאר'),
          'initials', public.community_initials(coalesce(nullif(btrim(r.legacy_name), ''), 'ממליצה')),
          'avatar_url', NULL, 'profile_id', NULL, 'is_nickname', false) END,
      'created_at', r.created_at
    ) ORDER BY r.created_at DESC)
    FROM public.community_baar_recommendations r
    WHERE r.boy_id = _boy_id AND (r.visible = true OR r.user_id = uid OR can_edit)
  ), '[]'::jsonb);
  RETURN jsonb_build_object(
    'id', boy.id, 'full_name', boy.full_name, 'age', boy.age, 'city', boy.city,
    'status', boy.status, 'orientation', boy.orientation, 'ethnicity', boy.ethnicity,
    'dress_style', boy.dress_style, 'details', boy.details, 'looking_for', boy.looking_for,
    'positives', boy.positives, 'photo_url', boy.photo_url,
    'proposal_contact_name', boy.proposal_contact_name,
    'proposal_contact_phone', boy.proposal_contact_phone,
    'proposal_contact_email', boy.proposal_contact_email,
    'created_by', boy.created_by, 'source', boy.source, 'mine', coalesce(mine, false),
    'can_edit', can_edit, 'can_recommend', true, 'created_at', boy.created_at,
    'updated_at', boy.updated_at, 'recommendations', recs,
    'recommendation_count', jsonb_array_length(recs)
  );
END;
$function$;