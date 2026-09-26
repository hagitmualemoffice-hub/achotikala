ALTER TABLE public.events_db ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.events_db DROP CONSTRAINT IF EXISTS events_db_event_type_check;
ALTER TABLE public.events_db ADD CONSTRAINT events_db_event_type_check CHECK (event_type IS NULL OR event_type = ANY (ARRAY['meeting','event','workshop','save_the_date']));