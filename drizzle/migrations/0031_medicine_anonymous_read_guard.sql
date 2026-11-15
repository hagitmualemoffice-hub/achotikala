CREATE FUNCTION public.medicine_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin') $$;
REVOKE ALL ON FUNCTION public.medicine_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.medicine_is_admin() TO anon,authenticated,service_role;
DROP POLICY medicine_listings_read ON public.medicine_listings;
CREATE POLICY medicine_listings_read ON public.medicine_listings FOR SELECT TO anon,authenticated USING ((status IN ('available','reserved') AND expiry_month>=date_trunc('month',current_date)::date) OR public.medicine_is_admin());