import { eventEmailHtml } from '../_shared/eventEmailHtml.ts';
import { safeRegistrationHref } from '../_shared/registration.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const schema = z.object({
  draft_id: z.string().uuid(),
  mode: z.enum(['status', 'send']).default('send'),
  confirm_wave: z.number().int().min(1).optional(),
  preview_to: z.string().trim().email().max(255).optional(),
});
const UNSUBSCRIBE_URL = 'https://achotikala.com/unsubscribe';
const WAVE_CAP = 450;
const nextWaveSize = (remaining: number) =>
  remaining <= 0 ? 0 : remaining <= WAVE_CAP ? remaining : Math.min(WAVE_CAP, Math.ceil(remaining / 2));

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const escape = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
const absolute = (value: string) => {
  if (!value) return '';
  const url = new URL(value, 'https://achotikala.com');
  if (url.protocol !== 'https:') throw new Error('Image URLs must use HTTPS');
  return url.href;
};
const b64 = (value: string) =>
  btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(''));
const email = z.string().trim().email().max(255);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
    const gmailKey = Deno.env.get('GOOGLE_MAIL_API_KEY');
    if (!url || !anon || !serviceKey || !gatewayKey || !gmailKey) return json({ error: 'Gmail is not configured' }, 503);

    const authorization = req.headers.get('Authorization') ?? '';
    const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await caller.auth.getUser();
    if (authError || !auth.user) return json({ error: 'Unauthorized' }, 401);
    const { data: isAdmin, error: roleError } = await caller.rpc('has_role', { _user_id: auth.user.id, _role: 'admin' });
    if (roleError || !isAdmin) return json({ error: 'Forbidden' }, 403);

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const draftId = parsed.data.draft_id;

    const { data: draft, error: draftError } = await caller.from('event_communications').select('*').eq('id', draftId).single();
    if (draftError || !draft) return json({ error: 'Draft not found' }, 404);
    if (!draft.subject.trim() || !draft.title.trim()) return json({ error: 'חסרה כותרת' }, 400);
    const registrationHref = safeRegistrationHref(draft.registration_url);
    if (registrationHref === null) return json({ error: 'יש להזין קישור טיקצ׳אק או כתובת מייל תקינים להרשמה' }, 400);
    const { data: event, error: eventError } = await caller.from('events_db').select('*').eq('id', draft.event_id).single();
    if (eventError || !event) return json({ error: 'Event not found' }, 404);

    // Content version: a changed text is a new message; the same text never reaches anyone twice.
    const fingerprint = JSON.stringify([draft.subject, draft.title, draft.body, draft.registration_url, draft.show_brand_logo, draft.extra_logos]);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
    const contentHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');

    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const [{ data: authorized, error: audienceError }, { data: already, error: alreadyError }] = await Promise.all([
      service.from('authorized_emails').select('email').eq('authorized', true),
      service.from('event_communication_recipients').select('email').eq('communication_id', draftId).eq('content_hash', contentHash),
    ]);
    if (audienceError || alreadyError) {
      const details = audienceError?.message ?? alreadyError?.message ?? 'Audience lookup failed';
      console.error(`Audience lookup failed: ${details}`);
      return json({ error: 'Audience lookup failed', details }, 502);
    }
    const sent = new Set((already ?? []).map((row) => String(row.email).trim().toLowerCase()));
    const audience = [...new Set((authorized ?? []).map((row) => String(row.email).trim().toLowerCase()))]
      .filter((address) => email.safeParse(address).success && !sent.has(address));

    const { data: sends, error: sendsError } = await service.from('event_communication_sends')
      .select('wave, recipient_count, created_at, content_hash').eq('communication_id', draftId).order('created_at');
    if (sendsError) return json({ error: 'Send history lookup failed', details: sendsError.message }, 502);
    const currentWaves = (sends ?? []).filter((row) => row.content_hash === contentHash);
    const olderVersionSent = (sends ?? []).some((row) => row.content_hash !== contentHash);
    const nextWave = currentWaves.length + 1;
    const status = {
      total: audience.length + sent.size,
      sent: sent.size,
      remaining: audience.length,
      next_wave: nextWave,
      next_wave_size: nextWaveSize(audience.length),
      waves: currentWaves.map((row) => ({ wave: row.wave, count: row.recipient_count, at: row.created_at })),
      older_version_sent: olderVersionSent,
    };
    if (parsed.data.mode === 'status') return json(status);

    const waveSize = nextWaveSize(audience.length);
    if (!waveSize) return json({ ...status, error: 'כל הרשימה כבר קיבלה את ההודעה הזאת' }, 409);
    if (parsed.data.confirm_wave !== nextWave)
      return json({ ...status, error: 'המצב השתנה — יש לאשר מחדש את הגל הבא' }, 409);
    // Admin-only preview: send this exact campaign to one address instead of the whole list.
    const batch = parsed.data.preview_to ? [parsed.data.preview_to.toLowerCase()] : audience.slice(0, waveSize);
    const remaining = parsed.data.preview_to ? audience.length : audience.length - batch.length;

    const wave = nextWave;

    const headers = { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': gmailKey };
    const base = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me';
    const profile = await fetch(`${base}/profile`, { headers });
    if (!profile.ok) {
      const details = await profile.text();
      console.error(`Gmail profile [${profile.status}]: ${details}`);
      return json({ error: 'Gmail request failed', status: profile.status, details }, profile.status);
    }
    const account = email.parse((await profile.json()).emailAddress);

    const logos = z.array(z.object({ url: z.string().max(4096), alt: z.string().max(200) })).max(8).parse(draft.extra_logos);
    const palette = { background: '#ffffff', foreground: '#354d64', primary: '#d35b7e', muted: '#737373', border: '#e6e6e6' };
    const logoHtml = [...(draft.show_brand_logo && draft.brand_logo_url ? [{ url: draft.brand_logo_url, alt: 'אחותי כלה' }] : []), ...logos]
      .map((logo) => `<img src="${escape(absolute(logo.url))}" alt="${escape(logo.alt)}" width="100" style="max-width:120px;max-height:72px;object-fit:contain;margin:8px;vertical-align:middle">`).join('');
    const html = eventEmailHtml({ title: draft.title, body: draft.body, registrationHref, logoHtml, coverUrl: event.cover_image ? absolute(event.cover_image) : '', event, unsubscribeUrl: UNSUBSCRIBE_URL });

    // Hidden copy: the batch goes out in Bcc so no reader sees the other addresses.
    const mime = [
      `To: ${account}`,
      `Bcc: ${batch.join(', ')}`,
      `Subject: =?UTF-8?B?${b64(draft.subject.replace(/[\r\n]/g, ' '))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      `List-Unsubscribe: <${UNSUBSCRIBE_URL}>`,
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
      console.error(`Gmail send [${response.status}]: ${details}`);
      return json({ error: 'Gmail request failed', status: response.status, details }, response.status);
    }
    const result = await response.json();

    const { error: recordError } = await service.from('event_communication_recipients').insert(batch.map((address) => ({ communication_id: draftId, email: address, wave, content_hash: contentHash })));
    if (recordError) console.error(`Recipient record failed: ${recordError.message}`);
    const { error: sendError } = await service.from('event_communication_sends').insert({ communication_id: draftId, wave, recipient_count: batch.length, content_hash: contentHash, message_id: result.id ?? null });
    if (sendError) console.error(`Send record failed: ${sendError.message}`);

    return json({ sent: batch.length, remaining, wave, message_id: result.id ?? null });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
