CREATE OR REPLACE FUNCTION public.baar_has_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.community_profiles
    WHERE user_id = _user_id AND baar_access = true
  ) OR EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.baar_legacy_emails l ON lower(btrim(u.email)) = l.email
    WHERE u.id = _user_id
  ) OR public.baar_is_admin(_user_id)
$function$;

UPDATE public.community_profiles
SET baar_access = true,
    baar_access_granted_at = coalesce(baar_access_granted_at, now()),
    baar_access_source = coalesce(baar_access_source, 'admin_grant')
WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');