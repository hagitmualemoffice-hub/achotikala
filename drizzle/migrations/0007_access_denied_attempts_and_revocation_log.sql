-- יומן ניסיונות התחברות שנדחו (המייל לא נמצא ברשימות המאושרות)
CREATE TABLE public.access_denied_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  context text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.access_denied_attempts TO authenticated;
GRANT ALL ON public.access_denied_attempts TO service_role;

ALTER TABLE public.access_denied_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view denied attempts"
ON public.access_denied_attempts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX access_denied_attempts_created_idx ON public.access_denied_attempts (created_at DESC);

-- יומן שלילות הרשאה (מי הוסרה מהרשימה המסונכרנת, מתי ובאיזה מסלול)
CREATE TABLE public.authorized_email_revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text,
  reason text,
  revoked_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.authorized_email_revocations TO authenticated;
GRANT ALL ON public.authorized_email_revocations TO service_role;

ALTER TABLE public.authorized_email_revocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view revocations"
ON public.authorized_email_revocations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX authorized_email_revocations_revoked_idx ON public.authorized_email_revocations (revoked_at DESC);