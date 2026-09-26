import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const CONTACTS_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbyvHCdb9bliUtRxtlr3_RyF8mXIzbfpslKP-DcvxWUzMZzjOVqDqcbMmDevFHmqoNF5lQ/exec';

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().max(120).optional().nullable(),
  source: z.string().trim().max(60).optional().nullable(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name?.trim() || null;
  const source = parsed.data.source?.trim() || 'website';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // 1. Save the signup in our own database (never blocked by the Contacts call).
  let alreadySubscribed = false;
  const { error: insertError } = await supabase.from('leads').insert({ email, name, source });
  if (insertError) {
    if (insertError.code === '23505') {
      alreadySubscribed = true;
      console.log(`lead already subscribed: ${email}`);
    } else {
      console.error('leads insert failed:', insertError.message);
      return json({ error: 'DB_INSERT_FAILED' }, 500);
    }
  }

  // 2. Grant apartments-board access right away (the periodic Contacts sync confirms it later).
  const { error: accessError } = await supabase
    .from('authorized_emails')
    .upsert(
      { email, authorized: true, source: 'signup', updated_at: new Date().toISOString() },
      { onConflict: 'email' },
    );
  if (accessError) console.error('authorized_emails upsert failed:', accessError.message);

  // 3. Push to Google Contacts via the Apps Script Web App (best effort).
  let success = false;
  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;

  try {
    const res = await fetch(CONTACTS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name ?? '', email }),
      redirect: 'follow',
    });
    statusCode = res.status;
    responseBody = (await res.text()).slice(0, 2000);
    success = res.ok;
    if (!res.ok) {
      errorMessage = `Web App returned ${res.status}`;
      console.error(`google-contacts sync failed [${res.status}]: ${responseBody}`);
    } else {
      console.log(`google-contacts sync ok for ${email}: ${responseBody}`);
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : String(e);
    console.error('google-contacts sync threw:', errorMessage);
  }

  const { error: logError } = await supabase.from('contacts_sync_log').insert({
    email,
    name,
    source,
    success,
    status_code: statusCode,
    response_body: responseBody,
    error_message: errorMessage,
  });
  if (logError) console.error('contacts_sync_log insert failed:', logError.message);

  // The signup itself is successful regardless of the Contacts result.
  return json({ ok: true, contactsSynced: success, alreadySubscribed });
});
