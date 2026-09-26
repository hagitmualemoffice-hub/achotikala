select cron.unschedule('offline-content-hourly')
where exists (select 1 from cron.job where jobname = 'offline-content-hourly');

select cron.schedule(
  'offline-content-hourly',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://fwwgvmkksdcrysddyiur.supabase.co/functions/v1/sync-offline-content',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);