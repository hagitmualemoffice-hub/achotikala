-- Extend community_profiles with Baar access fields
ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS baar_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS baar_access_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS baar_access_source text,
  ADD COLUMN IF NOT EXISTS baar_boys_count integer NOT NULL DEFAULT 0;

-- Boy profiles table
CREATE TABLE IF NOT EXISTS public.community_baar_boys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  age integer,
  city text,
  status text,
  orientation text,
  ethnicity text,
  dress_style text,
  details text,
  photo_url text,
  photo_storage_path text,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  archived_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_baar_boys TO authenticated;
GRANT ALL ON public.community_baar_boys TO service_role;
ALTER TABLE public.community_baar_boys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to baar boys" ON public.community_baar_boys FOR ALL USING (false) WITH CHECK (false);

-- Recommendations per boy per member
CREATE TABLE IF NOT EXISTS public.community_baar_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boy_id uuid NOT NULL REFERENCES public.community_baar_boys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  relationship_type text NOT NULL,
  note text,
  contact_mode text NOT NULL DEFAULT 'liba',
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (boy_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_baar_recommendations TO authenticated;
GRANT ALL ON public.community_baar_recommendations TO service_role;
ALTER TABLE public.community_baar_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to baar recommendations" ON public.community_baar_recommendations FOR ALL USING (false) WITH CHECK (false);

-- Reports on boys
CREATE TABLE IF NOT EXISTS public.community_baar_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boy_id uuid NOT NULL REFERENCES public.community_baar_boys(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_baar_reports TO authenticated;
GRANT ALL ON public.community_baar_reports TO service_role;
ALTER TABLE public.community_baar_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to baar reports" ON public.community_baar_reports FOR ALL USING (false) WITH CHECK (false);

-- Suggested updates (not by owner)
CREATE TABLE IF NOT EXISTS public.community_baar_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boy_id uuid NOT NULL REFERENCES public.community_baar_boys(id) ON DELETE CASCADE,
  suggester_id uuid NOT NULL,
  kind text NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_baar_suggestions TO authenticated;
GRANT ALL ON public.community_baar_suggestions TO service_role;
ALTER TABLE public.community_baar_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to baar suggestions" ON public.community_baar_suggestions FOR ALL USING (false) WITH CHECK (false);

-- Trigger function to maintain updated_at
CREATE OR REPLACE FUNCTION public.baar_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS baar_boys_updated_at ON public.community_baar_boys;
CREATE TRIGGER baar_boys_updated_at BEFORE UPDATE ON public.community_baar_boys
  FOR EACH ROW EXECUTE FUNCTION public.baar_set_updated_at();

DROP TRIGGER IF EXISTS baar_recommendations_updated_at ON public.community_baar_recommendations;
CREATE TRIGGER baar_recommendations_updated_at BEFORE UPDATE ON public.community_baar_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.baar_set_updated_at();

-- Helper: does this user have baar access?
CREATE OR REPLACE FUNCTION public.baar_has_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_profiles
    WHERE user_id = _user_id AND baar_access = true
  )
$$;

-- Helper: is admin
CREATE OR REPLACE FUNCTION public.baar_is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Bootstrap for the Baar page
CREATE OR REPLACE FUNCTION public.baar_bootstrap()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  can_access boolean;
  is_adm boolean;
  pending_reports integer;
  pending_suggestions integer;
  my_boys integer;
  my_recs integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false, 'authorized', false, 'baar_access', false);
  END IF;

  IF NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authenticated', true, 'authorized', false, 'baar_access', false);
  END IF;

  can_access := public.baar_has_access(uid);
  is_adm := public.baar_is_admin(uid);

  IF is_adm THEN
    pending_reports := (SELECT count(*) FROM public.community_baar_reports WHERE status = 'pending');
    pending_suggestions := (SELECT count(*) FROM public.community_baar_suggestions WHERE status = 'pending');
  END IF;

  my_boys := (SELECT count(*) FROM public.community_baar_boys WHERE created_by = uid AND is_active = true);
  my_recs := (SELECT count(*) FROM public.community_baar_recommendations WHERE user_id = uid);

  RETURN jsonb_build_object(
    'authenticated', true,
    'authorized', true,
    'baar_access', can_access,
    'is_admin', is_adm,
    'my_boys', my_boys,
    'my_recommendations', my_recs,
    'pending_reports', coalesce(pending_reports, 0),
    'pending_suggestions', coalesce(pending_suggestions, 0),
    'profile', public.community_profile_json(uid)
  );
END;
$$;

-- List boys with recommendation count
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
    SELECT coalesce(jsonb_agg(item), '[]'::jsonb)
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
        'details', left(b.details, 240),
        'photo_url', b.photo_url,
        'is_active', b.is_active,
        'created_by', b.created_by,
        'mine', b.created_by = uid,
        'updated_at', b.updated_at,
        'created_at', b.created_at,
        'recommendation_count', (SELECT count(*) FROM public.community_baar_recommendations r WHERE r.boy_id = b.id),
        'my_recommendation', (
          SELECT jsonb_build_object(
            'relationship_type', r.relationship_type,
            'note', r.note,
            'contact_mode', r.contact_mode,
            'visible', r.visible
          )
          FROM public.community_baar_recommendations r
          WHERE r.boy_id = b.id AND r.user_id = uid
        )
      ) AS item
      FROM public.community_baar_boys b
      WHERE b.is_active = true
        AND (_query IS NULL OR _query = '' OR b.full_name ILIKE '%' || _query || '%' OR b.details ILIKE '%' || _query || '%')
        AND (_status IS NULL OR _status = '' OR b.status = _status)
        AND (_orientation IS NULL OR _orientation = '' OR b.orientation = _orientation)
        AND (_ethnicity IS NULL OR _ethnicity = '' OR b.ethnicity = _ethnicity)
        AND (_dress_style IS NULL OR _dress_style = '' OR b.dress_style = _dress_style)
        AND (_min_age IS NULL OR b.age >= _min_age)
        AND (_max_age IS NULL OR b.age <= _max_age)
        AND (_has_recommendations IS NOT TRUE OR (SELECT count(*) FROM public.community_baar_recommendations r WHERE r.boy_id = b.id) > 0)
      ORDER BY
        CASE WHEN _sort = 'recent' THEN b.updated_at END DESC NULLS LAST,
        CASE WHEN _sort = 'name' THEN b.full_name END ASC NULLS LAST,
        b.created_at DESC
      LIMIT coalesce(_limit, 20) OFFSET coalesce(_offset, 0)
    ) t
  );
END;
$$;

-- Get single boy profile with recommendations
CREATE OR REPLACE FUNCTION public.baar_profile(_boy_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create a boy and the first recommendation from the creator
CREATE OR REPLACE FUNCTION public.baar_create(
  _full_name text,
  _age integer,
  _city text,
  _status text,
  _orientation text,
  _ethnicity text,
  _dress_style text,
  _details text,
  _photo_url text,
  _relationship_type text,
  _recommendation_note text,
  _contact_mode text,
  _as_nickname boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    details, photo_url, created_by
  ) VALUES (
    _full_name, _age, _city, _status, _orientation, _ethnicity, _dress_style,
    _details, _photo_url, uid
  ) RETURNING id INTO boy_id;

  INSERT INTO public.community_baar_recommendations (
    boy_id, user_id, relationship_type, note, contact_mode, visible
  ) VALUES (
    boy_id, uid, _relationship_type, _recommendation_note, display_mode, true
  );

  -- Auto-grant baar access after 2 boys if not already granted
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
$$;

-- Update a boy (owner or admin)
CREATE OR REPLACE FUNCTION public.baar_update(
  _boy_id uuid,
  _full_name text,
  _age integer,
  _city text,
  _status text,
  _orientation text,
  _ethnicity text,
  _dress_style text,
  _details text,
  _photo_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      photo_url = _photo_url,
      updated_at = now()
  WHERE id = _boy_id;
END;
$$;

-- Archive a boy (soft delete)
CREATE OR REPLACE FUNCTION public.baar_archive(_boy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  SET is_active = false, archived_at = now(), archived_by = uid, updated_at = now()
  WHERE id = _boy_id;
END;
$$;

-- Add or update a recommendation
CREATE OR REPLACE FUNCTION public.baar_recommend(
  _boy_id uuid,
  _relationship_type text,
  _note text,
  _contact_mode text
)
RETURNS void
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

  IF NOT EXISTS (SELECT 1 FROM public.community_baar_boys WHERE id = _boy_id AND is_active = true) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.community_baar_recommendations (
    boy_id, user_id, relationship_type, note, contact_mode, visible
  ) VALUES (
    _boy_id, uid, _relationship_type, _note, coalesce(_contact_mode, 'liba'), true
  )
  ON CONFLICT (boy_id, user_id)
  DO UPDATE SET relationship_type = EXCLUDED.relationship_type,
                note = EXCLUDED.note,
                contact_mode = EXCLUDED.contact_mode,
                updated_at = now();
END;
$$;

-- Remove my recommendation
CREATE OR REPLACE FUNCTION public.baar_remove_recommendation(_boy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;

  DELETE FROM public.community_baar_recommendations
  WHERE boy_id = _boy_id AND user_id = uid;
END;
$$;

-- Report a boy
CREATE OR REPLACE FUNCTION public.baar_report(
  _boy_id uuid,
  _reason text,
  _details text
)
RETURNS void
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

  INSERT INTO public.community_baar_reports (boy_id, reporter_id, reason, details)
  VALUES (_boy_id, uid, _reason, _details);
END;
$$;

-- Suggest an update
CREATE OR REPLACE FUNCTION public.baar_suggest(
  _boy_id uuid,
  _kind text,
  _details text
)
RETURNS void
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

  INSERT INTO public.community_baar_suggestions (boy_id, suggester_id, kind, details)
  VALUES (_boy_id, uid, _kind, _details);
END;
$$;

-- Admin: grant baar access manually
CREATE OR REPLACE FUNCTION public.baar_admin_grant_access(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.baar_is_admin(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.community_profiles
  SET baar_access = true,
      baar_access_granted_at = coalesce(baar_access_granted_at, now()),
      baar_access_source = coalesce(baar_access_source, 'admin_grant')
  WHERE user_id = _user_id;
END;
$$;

-- Admin: revoke baar access
CREATE OR REPLACE FUNCTION public.baar_admin_revoke_access(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.baar_is_admin(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.community_profiles
  SET baar_access = false
  WHERE user_id = _user_id;
END;
$$;

-- Check for similar active boys (duplicate prevention)
CREATE OR REPLACE FUNCTION public.baar_find_similar(_name text, _exclude_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', b.id,
      'full_name', b.full_name,
      'age', b.age,
      'city', b.city,
      'status', b.status,
      'orientation', b.orientation,
      'ethnicity', b.ethnicity,
      'created_at', b.created_at
    ))
    FROM public.community_baar_boys b
    WHERE b.is_active = true
      AND (_exclude_id IS NULL OR b.id <> _exclude_id)
      AND b.full_name ILIKE '%' || _name || '%'
    LIMIT 5
  ), '[]'::jsonb);
END;
$$;

-- Admin queue summary
CREATE OR REPLACE FUNCTION public.baar_admin_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.baar_is_admin(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'pending_reports', (SELECT count(*) FROM public.community_baar_reports WHERE status = 'pending'),
    'pending_suggestions', (SELECT count(*) FROM public.community_baar_suggestions WHERE status = 'pending')
  );
END;
$$;

-- Enhance community_bootstrap to include baar info
CREATE OR REPLACE FUNCTION public.community_bootstrap()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); prev timestamptz; res jsonb; adm boolean; needs_agreement boolean;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('authenticated', false, 'authorized', false); END IF;
  IF NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authenticated', true, 'authorized', false);
  END IF;
  PERFORM public.community_ensure_profile();
  PERFORM public.community_award_hearts(
    uid, 'daily_visit', 'daily:'||uid::text||':'||to_char(now() AT TIME ZONE 'Asia/Jerusalem', 'YYYY-MM-DD'));
  adm := public.has_role(uid, 'admin');
  SELECT last_visit_at INTO prev FROM public.community_profiles WHERE user_id = uid;
  SELECT (p.accepted_agreement_at IS NULL OR p.accepted_advertising_at IS NULL)
    INTO needs_agreement FROM public.community_profiles p WHERE p.user_id = uid;

  res := jsonb_build_object(
    'authenticated', true,
    'authorized', true,
    'is_admin', adm,
    'requires_agreement', coalesce(needs_agreement, true),
    'baar_access', public.baar_has_access(uid),
    'profile', public.community_profile_json(uid),
    'since', jsonb_build_object(
      'first_visit', prev IS NULL,
      'new_posts', (SELECT count(*) FROM public.community_posts p WHERE p.status='active' AND p.author_id <> uid AND (prev IS NULL OR p.created_at > prev)),
      'replies_to_me', (SELECT count(*) FROM public.community_comments c JOIN public.community_posts p ON p.id=c.post_id
                        WHERE c.status='active' AND p.author_id = uid AND c.author_id <> uid AND (prev IS NULL OR c.created_at > prev)),
      'in_my_threads', (SELECT count(DISTINCT c.post_id) FROM public.community_comments c
                        WHERE c.status='active' AND c.author_id <> uid AND (prev IS NULL OR c.created_at > prev)
                          AND EXISTS (SELECT 1 FROM public.community_comments mine WHERE mine.post_id=c.post_id AND mine.author_id=uid)),
      'new_tools', (SELECT count(*) FROM public.community_tools t WHERE t.status='approved' AND (prev IS NULL OR t.reviewed_at > prev)),
      'hearts_on_my_posts', (SELECT count(*) FROM public.community_reactions r JOIN public.community_posts p ON p.id=r.target_id
                             WHERE r.target_type='post' AND p.author_id=uid AND r.user_id<>uid AND (prev IS NULL OR r.created_at > prev)),
      'me_too_on_my_posts', (SELECT count(*) FROM public.community_reactions r JOIN public.community_posts p ON p.id=r.target_id
                             WHERE r.target_type='post' AND r.kind='me_too' AND p.author_id=uid AND r.user_id<>uid AND (prev IS NULL OR r.created_at > prev))
    ),
    'notices', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'note',note) ORDER BY sort_order, created_at DESC), '[]'::jsonb)
                FROM public.community_notices WHERE active),
    'events', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'date',date_label,'place',place,'url',url) ORDER BY coalesce(starts_at, created_at)), '[]'::jsonb)
               FROM public.community_events WHERE active AND (starts_at IS NULL OR starts_at > now() - interval '1 day')),
    'tools', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'kind',kind,'space',space,'by',credited_name,'url',url,'has_file',storage_path IS NOT NULL,'attachment_id',source_attachment_id) ORDER BY reviewed_at DESC NULLS LAST), '[]'::jsonb)
              FROM public.community_tools WHERE status='approved'),
    'talking_now', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'recent')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', p.id, 'space', p.space, 'title', coalesce(nullif(p.title,''), left(p.body, 60)),
          'recent', (SELECT count(*) FROM public.community_comments c WHERE c.post_id=p.id AND c.status='active' AND c.created_at > now() - interval '2 days')) AS x
        FROM public.community_posts p WHERE p.status='active'
          AND (SELECT count(*) FROM public.community_comments c WHERE c.post_id=p.id AND c.status='active' AND c.created_at > now() - interval '2 days') > 0
        LIMIT 5) t),
    'admin_pending', CASE WHEN adm THEN jsonb_build_object(
        'tools', (SELECT count(*) FROM public.community_tools WHERE status='pending'),
        'reports', (SELECT count(*) FROM public.community_reports WHERE status='pending'),
        'baar', public.baar_admin_queue()
      ) ELSE NULL END
  );

  UPDATE public.community_profiles SET previous_visit_at = last_visit_at, last_visit_at = now() WHERE user_id = uid;
  RETURN res;
END;
$$;
