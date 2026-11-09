import { eventEmailHtml } from '../_shared/eventEmailHtml.ts';
import { safeRegistrationHref } from '../_shared/registration.ts';
import { testRecipient } from './recipient.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const schema = z.object({ draft_id: z.string().uuid(), recipient: z.string().trim().email().max(254).optional() });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
const absolute = (value: string) => {
  if (!value) return '';
  const url = new URL(value, 'https://achotikala.com');
  if (url.protocol !== 'https:') throw new Error('Image URLs must use HTTPS');
  return url.href;
};
const b64 = (value: string) => btoa(Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join(''));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
    const gmailKey = Deno.env.get('GOOGLE_MAIL_API_KEY');
    if (!url || !anon || !gatewayKey || !gmailKey) return json({ error: 'Gmail is not configured' }, 503);
    const authorization = req.headers.get('Authorization') ?? '';
    const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await caller.auth.getUser();
    if (authError || !auth.user) return json({ error: 'Unauthorized' }, 401);
    const { data: isAdmin, error: roleError } = await caller.rpc('has_role', { _user_id: auth.user.id, _role: 'admin' });
    if (roleError || !isAdmin) return json({ error: 'Forbidden' }, 403);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { data: draft, error } = await caller.from('event_communications').select('*').eq('id', parsed.data.draft_id).single();
    if (error || !draft) return json({ error: 'Draft not found' }, 404);
    const registrationHref = safeRegistrationHref(draft.registration_url);
    if (registrationHref === null) return json({ error: 'יש להזין קישור טיקצ׳אק או כתובת מייל תקינים להרשמה' }, 400);
    if (!draft.subject.trim() || !draft.title.trim()) return json({ error: 'חסרה כותרת' }, 400);
    const { data: event, error: eventError } = await caller.from('events_db').select('*').eq('id', draft.event_id).single();
    if (eventError || !event) return json({ error: 'Event not found' }, 404);
    const headers = { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': gmailKey };
    const base = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me';
    const profile = await fetch(`${base}/profile`, { headers });
    if (!profile.ok) {
      const details = await profile.text();
      console.error(`Gmail profile [${profile.status}]: ${details}`);
      return json({ error: 'Gmail request failed', status: profile.status, details }, profile.status);
    }
    const account = await profile.json();
    const to = testRecipient(parsed.data.recipient, z.string().email().parse(account.emailAddress));
    const logos = z.array(z.object({ url: z.string().max(4096), alt: z.string().max(200) })).max(8).parse(draft.extra_logos);
    const palette = { background: '#ffffff', foreground: '#354d64', primary: '#d35b7e', muted: '#737373', border: '#e6e6e6' };
    const logoHtml = [ ...(draft.show_brand_logo && draft.brand_logo_url ? [{ url: draft.brand_logo_url, alt: 'אחותי כלה' }] : []), ...logos ]
      .map(logo => `<img src="${escape(absolute(logo.url))}" alt="${escape(logo.alt)}" width="100" style="max-width:120px;max-height:72px;object-fit:contain;margin:8px;vertical-align:middle">`).join('');
    const html = eventEmailHtml({ title: draft.title, body: draft.body, registrationHref, logoHtml, coverUrl: event.cover_image ? absolute(event.cover_image) : '', event, unsubscribeUrl: undefined });
    // Admin-only tests go to one validated address, independently of campaign recipients.
    const mime = [`To: ${to}`, `Subject: =?UTF-8?B?${b64(`[בדיקה] ${draft.subject.replace(/[\r\n]/g, ' ')}`)}?=`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(html)].join('\r\n');
    const response = await fetch(`${base}/messages/send`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: b64(mime).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }) });
    if (!response.ok) {
      const details = await response.text();
      console.error(`Gmail send [${response.status}]: ${details}`);
      return json({ error: 'Gmail request failed', status: response.status, details }, response.status);
    }
    const result = await response.json();
    return json({ sent: true, message_id: result.id, recipient: to });
  } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 400); }
});