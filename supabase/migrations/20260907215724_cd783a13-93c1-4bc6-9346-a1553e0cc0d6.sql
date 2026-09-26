SELECT cron.schedule(
  'apartment-access-hourly',
  '23 * * * *',
  $$
  select net.http_post(
    url := 'https://fwwgvmkksdcrysddyiur.supabase.co/functions/v1/apartment-access-sync',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"pull"}'::jsonb
  ) as request_id;
  $$
);