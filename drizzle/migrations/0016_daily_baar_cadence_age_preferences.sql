ALTER TABLE public.baar_daily_settings ADD COLUMN cadence text NOT NULL DEFAULT 'every_other_day' CHECK (cadence IN ('daily','every_other_day','muted'));
ALTER TABLE public.baar_daily_settings ADD COLUMN min_age integer CHECK (min_age BETWEEN 18 AND 100);
ALTER TABLE public.baar_daily_settings ADD COLUMN max_age integer CHECK (max_age BETWEEN 18 AND 100);
ALTER TABLE public.baar_daily_settings ADD CONSTRAINT baar_daily_age_order CHECK (min_age IS NULL OR max_age IS NULL OR min_age <= max_age);

CREATE OR REPLACE FUNCTION public.baar_daily_preferences_set(_cadence text, _filter_kind text DEFAULT NULL, _filter_value text DEFAULT NULL, _min_age integer DEFAULT NULL, _max_age integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _cadence IS NULL OR _cadence NOT IN ('daily','every_other_day','muted')
     OR (_filter_kind IS NOT NULL AND _filter_kind NOT IN ('status','orientation','ethnicity'))
     OR (_min_age IS NOT NULL AND (_min_age < 18 OR _min_age > 100))
     OR (_max_age IS NOT NULL AND (_max_age < 18 OR _max_age > 100))
     OR (_min_age IS NOT NULL AND _max_age IS NOT NULL AND _min_age > _max_age) THEN
    RAISE EXCEPTION 'bad_preferences';
  END IF;
  INSERT INTO public.baar_daily_settings (user_id, active, cadence, filter_kind, filter_value, min_age, max_age)
  VALUES (uid, true, _cadence,
    CASE WHEN nullif(btrim(coalesce(_filter_value, '')), '') IS NULL THEN NULL ELSE _filter_kind END,
    nullif(btrim(coalesce(_filter_value, '')), ''), _min_age, _max_age)
  ON CONFLICT (user_id) DO UPDATE SET
    active = true, cadence = EXCLUDED.cadence,
    filter_kind = EXCLUDED.filter_kind, filter_value = EXCLUDED.filter_value,
    min_age = EXCLUDED.min_age, max_age = EXCLUDED.max_age, updated_at = now();
END; $$;
REVOKE ALL ON FUNCTION public.baar_daily_preferences_set(text,text,text,integer,integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.baar_daily_preferences_set(text,text,text,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.baar_daily_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
 uid uuid := auth.uid(); s public.baar_daily_settings%ROWTYPE;
 exp public.baar_daily_exposures%ROWTYPE;
 today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
 boy jsonb;
BEGIN
 IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
   RETURN jsonb_build_object('authorized', false);
 END IF;
 SELECT * INTO s FROM public.baar_daily_settings WHERE user_id = uid;
 SELECT * INTO exp FROM public.baar_daily_exposures WHERE user_id = uid AND israeli_date = today;
 boy := NULL;
 IF exp.id IS NOT NULL THEN
   BEGIN boy := public.baar_profile(exp.boy_id);
   EXCEPTION WHEN OTHERS THEN boy := NULL;
   END;
 END IF;
 RETURN jsonb_build_object(
  'authorized', true, 'active', coalesce(s.active, true),
  'cadence', coalesce(s.cadence, 'every_other_day'),
  'min_age', s.min_age, 'max_age', s.max_age,
  'filter_kind', s.filter_kind, 'filter_value', s.filter_value,
  'today', CASE WHEN exp.id IS NULL THEN NULL ELSE jsonb_build_object(
   'exposure_id', exp.id, 'boy_id', exp.boy_id, 'response', exp.response,
   'unavailable', boy IS NULL, 'boy', boy) END);
END; $$;

CREATE OR REPLACE FUNCTION public.baar_daily_pick(_ignore_filter boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
 uid uuid := auth.uid(); today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
 s public.baar_daily_settings%ROWTYPE; cfg public.baar_daily_config%ROWTYPE;
 exp public.baar_daily_exposures%ROWTYPE; _boy_id uuid; _boy jsonb; used_filter boolean;
BEGIN
 IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
   RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
 END IF;
 SELECT * INTO cfg FROM public.baar_daily_config WHERE id = 1;
 SELECT * INTO s FROM public.baar_daily_settings WHERE user_id = uid;
 -- Existing exposures are always viewable, including when popups are muted or a response was recorded.
 SELECT * INTO exp FROM public.baar_daily_exposures WHERE user_id = uid AND israeli_date = today;
 IF exp.id IS NOT NULL THEN
   BEGIN _boy := public.baar_profile(exp.boy_id);
   EXCEPTION WHEN OTHERS THEN _boy := NULL;
   END;
   RETURN jsonb_build_object('status', CASE WHEN _boy IS NULL THEN 'unavailable' ELSE 'ok' END, 'exposure_id', exp.id, 'boy', _boy);
 END IF;
 -- A paused legacy account can manually resume through the new preferences screen.
 IF coalesce(s.active, true) = false THEN RAISE EXCEPTION 'paused'; END IF;
 used_filter := NOT coalesce(_ignore_filter, false) AND
   ((s.filter_kind IS NOT NULL AND coalesce(s.filter_value, '') <> '') OR s.min_age IS NOT NULL OR s.max_age IS NOT NULL);
 SELECT b.id INTO _boy_id FROM public.community_baar_boys b
 WHERE b.is_active
   AND (b.created_by IS NULL OR b.created_by <> uid)
   AND NOT EXISTS (SELECT 1 FROM public.baar_daily_exposures x WHERE x.user_id = uid AND x.boy_id = b.id)
   AND (coalesce(_ignore_filter, false) OR s.filter_kind IS NULL OR coalesce(s.filter_value, '') = ''
        OR (s.filter_kind = 'status' AND b.status = s.filter_value)
        OR (s.filter_kind = 'orientation' AND b.orientation = s.filter_value)
        OR (s.filter_kind = 'ethnicity' AND b.ethnicity = s.filter_value))
   AND (coalesce(_ignore_filter, false) OR s.min_age IS NULL OR b.age >= s.min_age)
   AND (coalesce(_ignore_filter, false) OR s.max_age IS NULL OR b.age <= s.max_age)
   AND (SELECT count(*) FROM public.baar_daily_exposures x2 WHERE x2.boy_id = b.id AND x2.israeli_date = today) < cfg.max_daily_exposures_per_boy
 ORDER BY (SELECT count(*) FROM public.baar_daily_exposures x3 WHERE x3.boy_id = b.id) ASC, random() LIMIT 1;
 IF _boy_id IS NULL THEN
   RETURN jsonb_build_object('status', CASE WHEN used_filter THEN 'filter_empty' ELSE 'empty' END);
 END IF;
 INSERT INTO public.baar_daily_exposures (user_id, boy_id, israeli_date)
 VALUES (uid, _boy_id, today) ON CONFLICT (user_id, israeli_date) DO NOTHING RETURNING * INTO exp;
 IF exp.id IS NULL THEN SELECT * INTO exp FROM public.baar_daily_exposures WHERE user_id = uid AND israeli_date = today; END IF;
 -- Return the actual winner if another tab inserted concurrently.
 _boy := public.baar_profile(exp.boy_id);
 RETURN jsonb_build_object('status', 'ok', 'exposure_id', exp.id, 'boy', _boy);
END; $$;