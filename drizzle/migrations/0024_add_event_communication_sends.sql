CREATE TABLE public.event_communication_recipients (
  communication_id uuid NOT NULL REFERENCES public.event_communications(id) ON DELETE CASCADE,
  email text NOT NULL,
  wave integer NOT NULL DEFAULT 1,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (communication_id, email)
);
GRANT SELECT ON public.event_communication_recipients TO authenticated;
GRANT ALL ON public.event_communication_recipients TO service_role;
ALTER TABLE public.event_communication_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read communication recipients"
  ON public.event_communication_recipients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.event_communication_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.event_communications(id) ON DELETE CASCADE,
  wave integer NOT NULL,
  recipient_count integer NOT NULL,
  message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_communication_sends TO authenticated;
GRANT ALL ON public.event_communication_sends TO service_role;
ALTER TABLE public.event_communication_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read communication sends"
  ON public.event_communication_sends FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;