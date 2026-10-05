CREATE OR REPLACE FUNCTION public.baar_daily_preferences_set(_cadence text, _filter_kind text DEFAULT NULL::text, _filter_value text DEFAULT NULL::text, _min_age integer DEFAULT NULL::integer, _max_age integer DEFAULT NULL::integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  clean_value text := nullif(btrim(coalesce(_filter_value, '')), '');
BEGIN
  IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _cadence IS NULL OR _cadence NOT IN ('daily','every_other_day','muted')
     OR (_filter_kind IS NOT NULL AND _filter_kind NOT IN ('status','orientation','ethnicity','dress_style'))
     OR (_min_age IS NOT NULL AND (_min_age < 18 OR _min_age > 100))
     OR (_max_age IS NOT NULL AND (_max_age < 18 OR _max_age > 100))
     OR (_min_age IS NOT NULL AND _max_age IS NOT NULL AND _min_age > _max_age) THEN
    RAISE EXCEPTION 'bad_preferences';
  END IF;

  INSERT INTO public.baar_daily_settings (user_id, active, cadence, filter_kind, filter_value, min_age, max_age)
  VALUES (
    uid,
    true,
    _cadence,
    CASE WHEN clean_value IS NULL THEN NULL ELSE _filter_kind END,
    clean_value,
    CASE WHEN clean_value IS NULL THEN _min_age ELSE NULL END,
    CASE WHEN clean_value IS NULL THEN _max_age ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    active = true,
    cadence = EXCLUDED.cadence,
    filter_kind = EXCLUDED.filter_kind,
    filter_value = EXCLUDED.filter_value,
    min_age = EXCLUDED.min_age,
    max_age = EXCLUDED.max_age,
    updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.baar_daily_pick(_ignore_filter boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
 SELECT * INTO exp FROM public.baar_daily_exposures WHERE user_id = uid AND israeli_date = today;
 IF exp.id IS NOT NULL THEN
   BEGIN _boy := public.baar_profile(exp.boy_id);
   EXCEPTION WHEN OTHERS THEN _boy := NULL;
   END;
   RETURN jsonb_build_object('status', CASE WHEN _boy IS NULL THEN 'unavailable' ELSE 'ok' END, 'exposure_id', exp.id, 'boy', _boy);
 END IF;
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
        OR (s.filter_kind = 'ethnicity' AND b.ethnicity = s.filter_value)
        OR (s.filter_kind = 'dress_style' AND b.dress_style = s.filter_value))
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
 _boy := public.baar_profile(exp.boy_id);
 RETURN jsonb_build_object('status', 'ok', 'exposure_id', exp.id, 'boy', _boy);
END;
$function$;