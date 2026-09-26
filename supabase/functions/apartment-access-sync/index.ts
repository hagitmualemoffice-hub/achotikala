import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { cleanEmail } from '../_shared/email.ts';

/**
 * Keeps public.authorized_emails in sync with the four Google Contacts labels
 * ("אחותי כלה", "אחותי כלה 2", "מתעניינות", "צעירות").
 *
 * Callers:
 *  - Google Apps Script (push):   header x-sync-token, action "upsert" | "revoke" | "replace"
 *  - Admin UI / cron (pull):      action "pull" — asks the Apps Script Web App for the full list
 * Admins may also call it with their normal session (Authorization: Bearer <jwt>).
 */

/* Each new Apps Script deployment gets a new /macros/s/AKfycb.../exec id, so the
   URL is configurable via the CONTACTS_WEBAPP_URL secret; the constant below is
   only the last known deployment. */
const CONTACTS_WEBAPP_URL =
  Deno.env.get('CONTACTS_WEBAPP_URL') ??
  'https://script.google.com/macros/s/AKfycbyvHCdb9bliUtRxtlr3_RyF8mXIzbfpslKP-DcvxWUzMZzjOVqDqcbMmDevFHmqoNF5lQ/exec';

const TOKEN = Deno.env.get('CONTACTS_SYNC_TOKEN') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

const cleanEmails = (input: unknown): string[] => {
  const list = Array.isArray(input) ? input : typeof input === 'string' ? [input] : [];
  const out = new Set<string>();
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const e = cleanEmail(raw);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) out.add(e);
  }
  return [...out];
};

const isAdminRequest = async (req: Request) => {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const jwt = auth.slice(7);
  const db = admin();
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) return false;
  const { data: roles } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .eq('role', 'admin');
  return (roles?.length ?? 0) > 0;
};

const setState = async (
  db: ReturnType<typeof admin>,
  status: string,
  error: string | null,
) => {
  const { count } = await db
    .from('authorized_emails')
    .select('email', { count: 'exact', head: true })
    .eq('authorized', true);
  await db
    .from('apartment_access_sync')
    .upsert({
      id: 1,
      last_synced_at: new Date().toISOString(),
      last_status: status,
      last_error: error,
      authorized_count: count ?? null,
      updated_at: new Date().toISOString(),
    });
  return count ?? 0;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty body = pull */
  }

  const action = String(body.action ?? 'pull');
  const db = admin();

  const tokenOk = TOKEN.length > 0 && req.headers.get('x-sync-token') === TOKEN;
  if (!tokenOk && !(await isAdminRequest(req))) {
    // The scheduled reconciliation carries no credentials: it only re-reads the Google lists
    // and never returns data, so it is allowed at most once every 15 minutes.
    if (action !== 'pull') return json({ error: 'UNAUTHORIZED' }, 401);
    const { data: st } = await db
      .from('apartment_access_sync')
      .select('last_synced_at')
      .eq('id', 1)
      .maybeSingle();
    const last = st?.last_synced_at ? new Date(st.last_synced_at).getTime() : 0;
    if (Date.now() - last < 15 * 60 * 1000) return json({ ok: true, skipped: 'RATE_LIMITED' });
  }
  const source = typeof body.source === 'string' ? body.source : 'google-contacts';

  try {
    if (action === 'upsert' || action === 'revoke') {
      const emails = cleanEmails(body.emails ?? body.email);
      if (!emails.length) return json({ error: 'NO_VALID_EMAILS' }, 400);
      const authorized = action === 'upsert';
      const { error } = await db.from('authorized_emails').upsert(
        emails.map((email) => ({ email, authorized, source, updated_at: new Date().toISOString() })),
        { onConflict: 'email' },
      );
      if (error) throw new Error(error.message);
      // יומן שלילות — כדי שנוכל לדעת בדיוק מי הוסרה ומתי
      if (!authorized) {
        await db
          .from('authorized_email_revocations')
          .insert(emails.map((email) => ({ email, source, reason: 'revoke' })));
      }
      const count = await setState(db, 'ok', null);
      return json({ ok: true, action, affected: emails.length, authorizedCount: count });
    }

    // "replace" (full list pushed to us) and "pull" (we fetch the full list) reconcile everything.
    let emails: string[] = [];
    if (action === 'replace') {
      emails = cleanEmails(body.emails);
      if (!emails.length) return json({ error: 'NO_VALID_EMAILS' }, 400);
    } else if (action === 'pull') {
      const url = `${CONTACTS_WEBAPP_URL}?action=authorizedEmails&token=${encodeURIComponent(TOKEN)}`;
      const res = await fetch(url, { redirect: 'follow' });
      const text = await res.text();
      if (res.status === 404) {
        throw new Error(
          'כתובת הסקריפט של Google Contacts לא נמצאה (404). יש לפרסם מחדש את ה-Web App ולעדכן את הכתובת בהגדרת CONTACTS_WEBAPP_URL.',
        );
      }
      if (!res.ok) throw new Error(`Apps Script returned ${res.status}: ${text.slice(0, 300)}`);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`Apps Script did not return JSON: ${text.slice(0, 300)}`);
      }
      const holder = parsed as { emails?: unknown; error?: unknown };
      if (holder?.error) throw new Error(`Apps Script error: ${String(holder.error)}`);
      emails = cleanEmails(holder?.emails);
      if (!emails.length) throw new Error('Apps Script returned an empty list — refusing to revoke everyone');
    } else {
      return json({ error: 'UNKNOWN_ACTION' }, 400);
    }

    const nowIso = new Date().toISOString();
    const { error: upErr } = await db.from('authorized_emails').upsert(
      emails.map((email) => ({ email, authorized: true, source, updated_at: nowIso })),
      { onConflict: 'email' },
    );
    if (upErr) throw new Error(upErr.message);

    // Anyone no longer on any list loses access (row kept for the audit trail).
    const { data: revoked, error: revErr } = await db
      .from('authorized_emails')
      .update({ authorized: false, source, updated_at: nowIso })
      .eq('authorized', true)
      .not('email', 'in', `(${emails.map((e) => `"${e}"`).join(',')})`)
      .select('email');
    if (revErr) throw new Error(revErr.message);
    if (revoked?.length) {
      await db
        .from('authorized_email_revocations')
        .insert(revoked.map((r: { email: string }) => ({ email: r.email, source, reason: action })));
    }

    const count = await setState(db, 'ok', null);
    return json({ ok: true, action, authorizedCount: count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('apartment-access-sync failed:', msg);
    await setState(db, 'error', msg.slice(0, 500));
    return json({ error: 'SYNC_FAILED', message: msg }, 500);
  }
});
