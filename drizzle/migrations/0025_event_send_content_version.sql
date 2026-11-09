ALTER TABLE public.event_communication_recipients ADD COLUMN content_hash text NOT NULL DEFAULT '';
ALTER TABLE public.event_communication_sends ADD COLUMN content_hash text NOT NULL DEFAULT '';
ALTER TABLE public.event_communication_recipients DROP CONSTRAINT event_communication_recipients_pkey;
ALTER TABLE public.event_communication_recipients ADD PRIMARY KEY (communication_id, content_hash, email);