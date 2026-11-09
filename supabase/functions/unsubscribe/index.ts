import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const UNSUBSCRIBE_URL = 'https://achotikala.com/unsubscribe';
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const b64 = (value: string) =>
  btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(''));
const BodySchema = z.union([
  z.object({ action: z.literal('request'), email: z.string().trim().email().max(255) }),
  z.object({ action: z.literal('confirm'), token: z.string().min(10).max(200) }),
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
    const gmailKey = Deno.env.get('GOOGLE_MAIL_API_KEY');
    if (!url || !serviceKey || !gatewayKey || !gmailKey) return json({ error: 'Email is not configured' }, 503);

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: 'Invalid request' }, 400);

    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const headers = { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': gmailKey };
    const base = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me';

    if (parsed.data.action === 'request') {
      const address = parsed.data.email.toLowerCase();
      const { data: rows, error } = await service.from('authorized_emails').select('email, authorized').eq('email', address);
      if (error) {
        console.error(`Unsubscribe lookup failed: ${error.message}`);
        return json({ error: 'Lookup failed', details: error.message }, 502);
      }
      const subscribed = (rows ?? []).some((row) => row.authorized === true);
      // Never reveal whether an address is on the list, and never mail an address that is not.
      if (!subscribed) return json({ ok: true });

      const { data: existing, error: existingError } = await service.from('email_unsubscribe_tokens')
        .select('token').eq('email', address).is('used_at', null).limit(1).maybeSingle();
      if (existingError) {
        console.error(`Unsubscribe token lookup failed: ${existingError.message}`);
        return json({ error: 'Token lookup failed', details: existingError.message }, 502);
      }
      const token = existing?.token ?? crypto.randomUUID();
      if (!existing) {
        const { error: insertError } = await service.from('email_unsubscribe_tokens').insert({ email: address, token });
        if (insertError) {
          console.error(`Unsubscribe token insert failed: ${insertError.message}`);
          return json({ error: 'Token save failed', details: insertError.message }, 502);
        }
      }

      const link = `${UNSUBSCRIBE_URL}?t=${token}`;
      const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#ffffff;color:#354d64;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:28px;text-align:right;direction:rtl"><h1 style="font-size:22px">אישור הסרה מרשימת התפוצה</h1><p style="font-size:16px;line-height:1.8">לחצי על הכפתור כדי להסיר את הכתובת ${address} מרשימת התפוצה של אחותי כלה.</p><p style="text-align:center;margin:30px 0"><a href="${link}" style="display:inline-block;background:#d35b7e;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:6px">אני רוצה להסיר את הכתובת</a></p><p style="font-size:12px;color:#737373">אם לא ביקשת להסיר את הכתובת, התעלמי מהמייל הזה.</p></div></body></html>`;
      const profile = await fetch(`${base}/profile`, { headers });
      if (!profile.ok) {
        const details = await profile.text();
        console.error(`Gmail profile [${profile.status}]: ${details}`);
        return json({ error: 'Gmail request failed', status: profile.status, details }, profile.status);
      }
      const account = (await profile.json()).emailAddress;
      const mime = [
        `To: ${address}`,
        `From: ${account}`,
        `Subject: =?UTF-8?B?${b64('אישור הסרה מרשימת התפוצה')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        b64(html),
      ].join('\r\n');
      const response = await fetch(`${base}/messages/send`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: b64(mime).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }),
      });
      if (!response.ok) {
        const details = await response.text();
        console.error(`Unsubscribe mail [${response.status}]: ${details}`);
        return json({ error: 'Gmail request failed', status: response.status, details }, response.status);
      }
      return json({ ok: true, mail_sent: true });
    }

    const token = parsed.data.token;
    const { data: row, error: tokenError } = await service.from('email_unsubscribe_tokens')
      .select('id, email, used_at').eq('token', token).maybeSingle();
    if (tokenError) {
      console.error(`Unsubscribe token read failed: ${tokenError.message}`);
      return json({ error: 'Token read failed', details: tokenError.message }, 502);
    }
    if (!row) return json({ ok: true, already: true });
    if (row.used_at) return json({ ok: true, already: true });

    const { error: accessError } = await service.from('authorized_emails').upsert(
      { email: row.email, authorized: false, source: 'unsubscribed', updated_at: new Date().toISOString() },
      { onConflict: 'email' },
    );
    if (accessError) {
      console.error(`Unsubscribe access update failed: ${accessError.message}`);
      return json({ error: 'Removal failed', details: accessError.message }, 502);
    }
    const { error: markError } = await service.from('email_unsubscribe_tokens').update({ used_at: new Date().toISOString() }).eq('id', row.id);
    if (markError) console.error(`Unsubscribe token mark failed: ${markError.message}`);
    return json({ ok: true, removed: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
