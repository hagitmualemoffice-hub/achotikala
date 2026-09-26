ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text;

GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;
CREATE POLICY "Admins can view leads"
ON public.leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
CREATE POLICY "Admins can delete leads"
ON public.leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));