CREATE OR REPLACE FUNCTION public.baar_list(
  _query text,
  _status text,
  _orientation text,
  _ethnicity text,
  _dress_style text,
  _min_age integer,
  _max_age integer,
  _has_recommendations boolean,
  _sort text,
  _limit integer,
  _offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH filtered AS (
      SELECT b.*
      FROM public.community_baar_boys b
      WHERE b.is_active = true
        AND (_query IS NULL OR _query = '' OR b.full_name ILIKE '%' || _query || '%' OR b.city ILIKE '%' || _query || '%' OR b.details ILIKE '%' || _query || '%')
        AND (_status IS NULL OR _status = '' OR b.status = _status)
        AND (_orientation IS NULL OR _orientation = '' OR b.orientation = _orientation)
        AND (_ethnicity IS NULL OR _ethnicity = '' OR b.ethnicity = _ethnicity)
        AND (_dress_style IS NULL OR _dress_style = '' OR b.dress_style = _dress_style)
        AND (_min_age IS NULL OR b.age >= _min_age)
        AND (_max_age IS NULL OR b.age <= _max_age)
        AND (_has_recommendations IS NOT TRUE OR EXISTS (
          SELECT 1 FROM public.community_baar_recommendations r WHERE r.boy_id = b.id
        ))
    ),
    page_items AS (
      SELECT jsonb_build_object(
        'id', b.id,
        'full_name', b.full_name,
        'age', b.age,
        'city', b.city,
        'status', b.status,
        'orientation', b.orientation,
        'ethnicity', b.ethnicity,
        'dress_style', b.dress_style,
        'details', left(b.details, 240),
        'looking_for', b.looking_for,
        'positives', b.positives,
        'photo_url', b.photo_url,
        'has_photo', EXISTS (
          SELECT 1
          FROM public.community_baar_recommendations r
          WHERE r.boy_id = b.id AND r.has_photo IS TRUE
        ),
        'is_active', b.is_active,
        'created_by', b.created_by,
        'mine', b.created_by = uid,
        'updated_at', b.updated_at,
        'created_at', b.created_at,
        'recommendation_count', (
          SELECT count(*) FROM public.community_baar_recommendations r WHERE r.boy_id = b.id
        ),
        'my_recommendation', (
          SELECT jsonb_build_object(
            'relationship_type', r.relationship_type,
            'note', r.note,
            'contact_mode', r.contact_mode,
            'visible', r.visible,
            'has_photo', r.has_photo,
            'contact_phone', r.contact_phone,
            'contact_email', r.contact_email
          )
          FROM public.community_baar_recommendations r
          WHERE r.boy_id = b.id AND r.user_id = uid
        )
      ) AS item
      FROM filtered b
      ORDER BY
        CASE WHEN _sort = 'recent' THEN b.updated_at END DESC NULLS LAST,
        CASE WHEN _sort = 'name' THEN b.full_name END ASC NULLS LAST,
        b.created_at DESC
      LIMIT least(greatest(coalesce(_limit, 20), 1), 100)
      OFFSET greatest(coalesce(_offset, 0), 0)
    )
    SELECT jsonb_build_object(
      'items', coalesce((SELECT jsonb_agg(item) FROM page_items), '[]'::jsonb),
      'total', (SELECT count(*) FROM filtered)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.baar_list(text, text, text, text, text, integer, integer, boolean, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.baar_list(text, text, text, text, text, integer, integer, boolean, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.baar_list(text, text, text, text, text, integer, integer, boolean, text, integer, integer) TO service_role;