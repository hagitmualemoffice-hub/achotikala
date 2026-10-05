CREATE OR REPLACE FUNCTION public.baar_daily_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
 uid uuid := auth.uid(); s public.baar_daily_settings%ROWTYPE;
 exp public.baar_daily_exposures%ROWTYPE;
 today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
 boy jsonb; last_shown date;
BEGIN
 IF uid IS NULL OR NOT public.community_is_member(uid) OR NOT public.baar_has_access(uid) THEN
   RETURN jsonb_build_object('authorized', false);
 END IF;
 SELECT * INTO s FROM public.baar_daily_settings WHERE user_id = uid;
 SELECT max(israeli_date) INTO last_shown FROM public.baar_daily_exposures WHERE user_id = uid;
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
  'min_age', s.min_age, 'max_age', s.max_age, 'last_shown_date', last_shown,
  'filter_kind', s.filter_kind, 'filter_value', s.filter_value,
  'today', CASE WHEN exp.id IS NULL THEN NULL ELSE jsonb_build_object(
   'exposure_id', exp.id, 'boy_id', exp.boy_id, 'response', exp.response,
   'unavailable', boy IS NULL, 'boy', boy) END);
END; $$;