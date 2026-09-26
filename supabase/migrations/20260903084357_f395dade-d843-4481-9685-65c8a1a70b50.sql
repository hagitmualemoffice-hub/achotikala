create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('offline-content-hourly')
where exists (select 1 from cron.job where jobname = 'offline-content-hourly');

select cron.schedule(
  'offline-content-hourly',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://fwwgvmkksdcrysddyiur.supabase.co/functions/v1/sync-offline-content',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-offline-sync-secret', current_setting('app.offline_sync_secret', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);