CREATE TABLE IF NOT EXISTS public.community_baar_saved (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boy_id uuid NOT NULL REFERENCES public.community_baar_boys(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, boy_id)
);

GRANT SELECT ON public.community_baar_saved TO authenticated;
GRANT ALL ON public.community_baar_saved TO service_role;
ALTER TABLE public.community_baar_saved ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own saved boys readable" ON public.community_baar_saved;
CREATE POLICY "own saved boys readable" ON public.community_baar_saved
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.baar_toggle_save(_boy_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  existed boolean;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_baar_boys b WHERE b.id = _boy_id AND b.is_active) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT true INTO existed FROM public.community_baar_saved s
   WHERE s.user_id = uid AND s.boy_id = _boy_id;

  IF existed THEN
    DELETE FROM public.community_baar_saved s WHERE s.user_id = uid AND s.boy_id = _boy_id;
    RETURN false;
  END IF;

  INSERT INTO public.community_baar_saved (user_id, boy_id) VALUES (uid, _boy_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.baar_saved_list()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RETURN jsonb_build_object('authorized', false, 'items', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'authorized', true,
    'items', coalesce((
      SELECT jsonb_agg(x ORDER BY x->>'saved_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', b.id,
          'full_name', b.full_name,
          'age', b.age,
          'city', b.city,
          'status', b.status,
          'orientation', b.orientation,
          'ethnicity', b.ethnicity,
          'dress_style', b.dress_style,
          'saved_at', s.created_at,
          'recommendation_count', (
            SELECT count(*) FROM public.community_baar_recommendations r WHERE r.boy_id = b.id
          )
        ) AS x
        FROM public.community_baar_saved s
        JOIN public.community_baar_boys b ON b.id = s.boy_id AND b.is_active
        WHERE s.user_id = uid
      ) q
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.baar_toggle_save(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.baar_saved_list() TO authenticated;

CREATE OR REPLACE FUNCTION public.baar_list(_query text, _status text, _orientation text, _ethnicity text, _dress_style text, _min_age integer, _max_age integer, _has_recommendations boolean, _sort text, _limit integer, _offset integer)
 RETURNS jsonb
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

  RETURN (
    WITH filtered AS (
      SELECT b.*
      FROM public.community_baar_boys b
      WHERE b.is_active = true
        AND (_query IS NULL OR _query = '' OR b.full_name ILIKE '%' || _query || '%')
        AND (_status IS NULL OR _status = '' OR b.status = _status)
        AND (_orientation IS NULL OR _orientation = '' OR b.orientation = _orientation)
        AND (_ethnicity IS NULL OR _ethnicity = '' OR b.ethnicity = _ethnicity)
        AND (_dress_style IS NULL OR _dress_style = '' OR b.dress_style = _dress_style)
        AND (_min_age IS NULL OR b.age >= _min_age)
        AND (_max_age IS NULL OR b.age <= _max_age)
        AND (_sort <> 'saved' OR EXISTS (
          SELECT 1 FROM public.community_baar_saved s WHERE s.boy_id = b.id AND s.user_id = uid
        ))
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
        'saved', EXISTS (
          SELECT 1 FROM public.community_baar_saved s WHERE s.boy_id = b.id AND s.user_id = uid
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
$function$;