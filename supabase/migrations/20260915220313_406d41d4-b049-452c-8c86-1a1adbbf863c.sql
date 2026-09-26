select cron.schedule(
  'community-space-digest-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://fwwgvmkksdcrysddyiur.supabase.co/functions/v1/community-space-digest?period=daily',
    headers := '{"Content-Type":"application/json","x-digest-secret":"7c33a4f35ea1f876adde415af1aad62e510cbc60aaf183c8"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'community-space-digest-weekly',
  '0 6 * * 0',
  $$
  select net.http_post(
    url := 'https://fwwgvmkksdcrysddyiur.supabase.co/functions/v1/community-space-digest?period=weekly',
    headers := '{"Content-Type":"application/json","x-digest-secret":"7c33a4f35ea1f876adde415af1aad62e510cbc60aaf183c8"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);