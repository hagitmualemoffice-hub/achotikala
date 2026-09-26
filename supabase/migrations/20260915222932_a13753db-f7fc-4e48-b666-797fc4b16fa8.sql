CREATE TABLE IF NOT EXISTS public.community_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text,
  area text,
  address text,
  kashrut text,
  crowd_level integer,
  transit boolean,
  min_payment boolean,
  loved_note text,
  details text,
  link text,
  image_url text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'member',
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  archived_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_places TO authenticated;
GRANT ALL ON public.community_places TO service_role;
ALTER TABLE public.community_places ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct client access to places" ON public.community_places;
CREATE POLICY "No direct client access to places" ON public.community_places FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.community_place_saved (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.community_places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_place_saved TO authenticated;
GRANT ALL ON public.community_place_saved TO service_role;
ALTER TABLE public.community_place_saved ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct client access to place saves" ON public.community_place_saved;
CREATE POLICY "No direct client access to place saves" ON public.community_place_saved FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.community_place_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.community_places(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_place_reports TO authenticated;
GRANT ALL ON public.community_place_reports TO service_role;
ALTER TABLE public.community_place_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct client access to place reports" ON public.community_place_reports;
CREATE POLICY "No direct client access to place reports" ON public.community_place_reports FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.community_place_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.community_places(id) ON DELETE CASCADE,
  suggester_id uuid NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_place_suggestions TO authenticated;
GRANT ALL ON public.community_place_suggestions TO service_role;
ALTER TABLE public.community_place_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct client access to place suggestions" ON public.community_place_suggestions;
CREATE POLICY "No direct client access to place suggestions" ON public.community_place_suggestions FOR ALL USING (false) WITH CHECK (false);

DROP TRIGGER IF EXISTS community_places_updated_at ON public.community_places;
CREATE TRIGGER community_places_updated_at BEFORE UPDATE ON public.community_places
  FOR EACH ROW EXECUTE FUNCTION public.baar_set_updated_at();

CREATE INDEX IF NOT EXISTS community_places_active_idx ON public.community_places (is_active, area, kind);

-- who am I on the places page
CREATE OR REPLACE FUNCTION public.places_bootstrap()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); adm boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false, 'authorized', false);
  END IF;
  IF NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authenticated', true, 'authorized', false);
  END IF;
  adm := public.has_role(uid, 'admin');
  RETURN jsonb_build_object(
    'authenticated', true,
    'authorized', true,
    'is_admin', adm,
    'my_places', (SELECT count(*) FROM public.community_places WHERE created_by = uid AND is_active),
    'total_places', (SELECT count(*) FROM public.community_places WHERE is_active),
    'pending_reports', CASE WHEN adm THEN (SELECT count(*) FROM public.community_place_reports WHERE status = 'pending') ELSE 0 END,
    'pending_suggestions', CASE WHEN adm THEN (SELECT count(*) FROM public.community_place_suggestions WHERE status = 'pending') ELSE 0 END,
    'areas', (SELECT coalesce(jsonb_agg(DISTINCT area), '[]'::jsonb) FROM public.community_places WHERE is_active AND area IS NOT NULL),
    'kinds', (SELECT coalesce(jsonb_agg(DISTINCT kind), '[]'::jsonb) FROM public.community_places WHERE is_active AND kind IS NOT NULL),
    'kashrut_values', (SELECT coalesce(jsonb_agg(DISTINCT kashrut), '[]'::jsonb) FROM public.community_places WHERE is_active AND kashrut IS NOT NULL)
  );
END; $$;

CREATE OR REPLACE FUNCTION public.places_list(
  _query text, _kind text, _area text, _kashrut text,
  _transit boolean, _no_min_payment boolean, _max_crowd integer,
  _saved_only boolean, _mine_only boolean, _sort text, _limit integer, _offset integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH filtered AS (
      SELECT p.* FROM public.community_places p
      WHERE p.is_active
        AND (_query IS NULL OR _query = '' OR
             p.name ILIKE '%' || _query || '%' OR
             coalesce(p.area,'') ILIKE '%' || _query || '%' OR
             coalesce(p.kind,'') ILIKE '%' || _query || '%' OR
             coalesce(p.address,'') ILIKE '%' || _query || '%' OR
             coalesce(p.kashrut,'') ILIKE '%' || _query || '%' OR
             coalesce(p.loved_note,'') ILIKE '%' || _query || '%' OR
             coalesce(p.details,'') ILIKE '%' || _query || '%')
        AND (_kind IS NULL OR _kind = '' OR p.kind = _kind)
        AND (_area IS NULL OR _area = '' OR p.area = _area)
        AND (_kashrut IS NULL OR _kashrut = '' OR p.kashrut = _kashrut)
        AND (_transit IS NOT TRUE OR p.transit IS TRUE)
        AND (_no_min_payment IS NOT TRUE OR p.min_payment IS NOT TRUE)
        AND (_max_crowd IS NULL OR p.crowd_level IS NULL OR p.crowd_level <= _max_crowd)
        AND (_saved_only IS NOT TRUE OR EXISTS (
              SELECT 1 FROM public.community_place_saved s WHERE s.place_id = p.id AND s.user_id = uid))
        AND (_mine_only IS NOT TRUE OR p.created_by = uid)
    ), page_items AS (
      SELECT jsonb_build_object(
        'id', p.id, 'name', p.name, 'kind', p.kind, 'area', p.area,
        'address', p.address, 'kashrut', p.kashrut, 'crowd_level', p.crowd_level,
        'transit', p.transit, 'min_payment', p.min_payment,
        'loved_note', left(p.loved_note, 260), 'image_url', p.image_url,
        'mine', p.created_by = uid,
        'saved', EXISTS (SELECT 1 FROM public.community_place_saved s WHERE s.place_id = p.id AND s.user_id = uid),
        'created_at', p.created_at
      ) AS item
      FROM filtered p
      ORDER BY
        CASE WHEN _sort = 'name' THEN 0 ELSE 1 END, 
        CASE WHEN _sort = 'name' THEN p.name END ASC,
        CASE WHEN _sort = 'quiet' THEN coalesce(p.crowd_level, 3) END ASC,
        p.created_at DESC
      LIMIT greatest(1, least(coalesce(_limit, 24), 60)) OFFSET greatest(0, coalesce(_offset, 0))
    )
    SELECT jsonb_build_object(
      'items', coalesce((SELECT jsonb_agg(item) FROM page_items), '[]'::jsonb),
      'total', (SELECT count(*) FROM filtered)
    )
  );
END; $$;

CREATE OR REPLACE FUNCTION public.places_detail(_place_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); adm boolean; res jsonb;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  adm := public.has_role(uid, 'admin');
  SELECT jsonb_build_object(
    'id', p.id, 'name', p.name, 'kind', p.kind, 'area', p.area, 'address', p.address,
    'kashrut', p.kashrut, 'crowd_level', p.crowd_level, 'transit', p.transit,
    'min_payment', p.min_payment, 'loved_note', p.loved_note, 'details', p.details,
    'link', p.link, 'image_url', p.image_url, 'extra', p.extra, 'source', p.source,
    'created_at', p.created_at, 'updated_at', p.updated_at,
    'mine', p.created_by = uid,
    'can_edit', (p.created_by = uid OR adm),
    'saved', EXISTS (SELECT 1 FROM public.community_place_saved s WHERE s.place_id = p.id AND s.user_id = uid),
    'added_by', CASE WHEN p.created_by IS NULL THEN NULL
                     ELSE public.community_author_json(p.created_by, false, uid) END
  ) INTO res
  FROM public.community_places p
  WHERE p.id = _place_id AND (p.is_active OR adm);
  IF res IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  RETURN res;
END; $$;

CREATE OR REPLACE FUNCTION public.places_find_similar(_name text, _exclude_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _name IS NULL OR length(btrim(_name)) < 2 THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'area', p.area, 'kind', p.kind))
    FROM (
      SELECT * FROM public.community_places
      WHERE is_active AND name ILIKE '%' || btrim(_name) || '%'
        AND (_exclude_id IS NULL OR id <> _exclude_id)
      ORDER BY name LIMIT 5
    ) p
  ), '[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION public.places_create(
  _name text, _kind text, _area text, _address text, _kashrut text,
  _crowd_level integer, _transit boolean, _min_payment boolean,
  _loved_note text, _details text, _link text, _image_url text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); new_id uuid; recent integer;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _name IS NULL OR length(btrim(_name)) < 2 THEN RAISE EXCEPTION 'name_required'; END IF;
  IF _kind IS NULL OR _kind = '' THEN RAISE EXCEPTION 'kind_required'; END IF;
  IF _area IS NULL OR _area = '' THEN RAISE EXCEPTION 'area_required'; END IF;
  SELECT count(*) INTO recent FROM public.community_places
    WHERE created_by = uid AND created_at > now() - interval '1 hour';
  IF recent >= 10 THEN RAISE EXCEPTION 'too_many_places'; END IF;
  INSERT INTO public.community_places (
    name, kind, area, address, kashrut, crowd_level, transit, min_payment,
    loved_note, details, link, image_url, source, created_by)
  VALUES (btrim(_name), _kind, _area, nullif(btrim(coalesce(_address,'')),''), nullif(_kashrut,''),
    _crowd_level, _transit, _min_payment,
    nullif(btrim(coalesce(_loved_note,'')),''), nullif(btrim(coalesce(_details,'')),''),
    nullif(btrim(coalesce(_link,'')),''), nullif(btrim(coalesce(_image_url,'')),''),
    'member', uid)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.places_update(
  _place_id uuid, _name text, _kind text, _area text, _address text, _kashrut text,
  _crowd_level integer, _transit boolean, _min_payment boolean,
  _loved_note text, _details text, _link text, _image_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); owner uuid;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT created_by INTO owner FROM public.community_places WHERE id = _place_id;
  IF owner IS NULL AND NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF owner IS DISTINCT FROM uid AND NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _name IS NULL OR length(btrim(_name)) < 2 THEN RAISE EXCEPTION 'name_required'; END IF;
  UPDATE public.community_places SET
    name = btrim(_name), kind = _kind, area = _area,
    address = nullif(btrim(coalesce(_address,'')),''), kashrut = nullif(_kashrut,''),
    crowd_level = _crowd_level, transit = _transit, min_payment = _min_payment,
    loved_note = nullif(btrim(coalesce(_loved_note,'')),''),
    details = nullif(btrim(coalesce(_details,'')),''),
    link = nullif(btrim(coalesce(_link,'')),''),
    image_url = nullif(btrim(coalesce(_image_url,'')),'')
  WHERE id = _place_id;
END; $$;

CREATE OR REPLACE FUNCTION public.places_set_active(_place_id uuid, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.community_places
     SET is_active = _active,
         archived_at = CASE WHEN _active THEN NULL ELSE now() END,
         archived_by = CASE WHEN _active THEN NULL ELSE uid END
   WHERE id = _place_id;
END; $$;

CREATE OR REPLACE FUNCTION public.places_toggle_save(_place_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); existed boolean;
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.community_place_saved WHERE place_id = _place_id AND user_id = uid;
  IF FOUND THEN RETURN false; END IF;
  INSERT INTO public.community_place_saved (place_id, user_id) VALUES (_place_id, uid)
    ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.places_saved_list()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RETURN jsonb_build_object('authorized', false, 'items', '[]'::jsonb);
  END IF;
  RETURN jsonb_build_object('authorized', true, 'items', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'kind', p.kind, 'area', p.area,
      'address', p.address, 'saved_at', s.created_at) ORDER BY s.created_at DESC)
    FROM public.community_place_saved s
    JOIN public.community_places p ON p.id = s.place_id
    WHERE s.user_id = uid AND p.is_active
  ), '[]'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION public.places_report(_place_id uuid, _reason text, _details text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _reason IS NULL OR _reason = '' THEN RAISE EXCEPTION 'reason_required'; END IF;
  INSERT INTO public.community_place_reports (place_id, reporter_id, reason, details)
  VALUES (_place_id, uid, _reason, nullif(btrim(coalesce(_details,'')),''));
END; $$;

CREATE OR REPLACE FUNCTION public.places_suggest(_place_id uuid, _details text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _details IS NULL OR length(btrim(_details)) < 5 THEN RAISE EXCEPTION 'details_required'; END IF;
  INSERT INTO public.community_place_suggestions (place_id, suggester_id, details)
  VALUES (_place_id, uid, btrim(_details));
END; $$;

CREATE OR REPLACE FUNCTION public.places_admin_queue()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'reports', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', r.id, 'place_id', r.place_id, 'place_name', p.name,
        'reason', r.reason, 'details', r.details, 'status', r.status, 'created_at', r.created_at)
        ORDER BY r.created_at DESC)
      FROM public.community_place_reports r JOIN public.community_places p ON p.id = r.place_id
      WHERE r.status = 'pending'), '[]'::jsonb),
    'suggestions', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', s.id, 'place_id', s.place_id, 'place_name', p.name,
        'details', s.details, 'status', s.status, 'created_at', s.created_at)
        ORDER BY s.created_at DESC)
      FROM public.community_place_suggestions s JOIN public.community_places p ON p.id = s.place_id
      WHERE s.status = 'pending'), '[]'::jsonb)
  );
END; $$;

CREATE OR REPLACE FUNCTION public.places_admin_resolve(_kind text, _id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('handled', 'dismissed') THEN RAISE EXCEPTION 'bad_status'; END IF;
  IF _kind = 'report' THEN
    UPDATE public.community_place_reports SET status = _status, reviewed_by = uid, reviewed_at = now() WHERE id = _id;
  ELSIF _kind = 'suggestion' THEN
    UPDATE public.community_place_suggestions SET status = _status, reviewed_by = uid, reviewed_at = now() WHERE id = _id;
  ELSE RAISE EXCEPTION 'bad_kind'; END IF;
END; $$;

REVOKE ALL ON FUNCTION public.places_bootstrap() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_list(text,text,text,text,boolean,boolean,integer,boolean,boolean,text,integer,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_detail(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_find_similar(text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_create(text,text,text,text,text,integer,boolean,boolean,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_update(uuid,text,text,text,text,text,integer,boolean,boolean,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_set_active(uuid,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_toggle_save(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_saved_list() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_report(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_suggest(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_admin_queue() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.places_admin_resolve(text,uuid,text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.places_bootstrap() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_list(text,text,text,text,boolean,boolean,integer,boolean,boolean,text,integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_detail(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_find_similar(text,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_create(text,text,text,text,text,integer,boolean,boolean,text,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_update(uuid,text,text,text,text,text,integer,boolean,boolean,text,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_set_active(uuid,boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_toggle_save(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_saved_list() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_report(uuid,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_suggest(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_admin_queue() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.places_admin_resolve(text,uuid,text) TO authenticated, service_role;