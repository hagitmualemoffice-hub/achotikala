CREATE TABLE IF NOT EXISTS public.offline_sync_state (
  id integer PRIMARY KEY DEFAULT 1,
  content_version integer NOT NULL DEFAULT 0,
  drive_file_id text,
  last_status text,
  last_error text,
  last_synced_at timestamptz,
  media_count integer,
  size_bytes integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offline_sync_state_single_row CHECK (id = 1)
);

GRANT SELECT ON public.offline_sync_state TO authenticated;
GRANT ALL ON public.offline_sync_state TO service_role;

ALTER TABLE public.offline_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated admins can read offline sync state"
ON public.offline_sync_state FOR SELECT TO authenticated USING (true);

INSERT INTO public.offline_sync_state (id, content_version)
VALUES (1, 2)
ON CONFLICT (id) DO NOTHING;