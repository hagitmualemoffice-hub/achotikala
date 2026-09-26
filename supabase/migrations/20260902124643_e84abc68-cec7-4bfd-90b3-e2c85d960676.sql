CREATE TABLE public.contacts_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  source text,
  success boolean NOT NULL DEFAULT false,
  status_code integer,
  response_body text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contacts_sync_log TO authenticated;
GRANT ALL ON public.contacts_sync_log TO service_role;

ALTER TABLE public.contacts_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view contacts sync log"
ON public.contacts_sync_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));