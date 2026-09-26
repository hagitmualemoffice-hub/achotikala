import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { cleanEmail } from "../_shared/email.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const validEmail = (value: unknown) => {
  if (typeof value !== "string") return "";
  const email = cleanEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Client-side report: the previous check got a non-JSON / foreign reply (e.g. a filter block page).
    // Where the attempt came from: "website" or "offline-rev14" etc. (diagnostics only).
    const rawClient = (body as { client?: unknown }).client;
    const client = typeof rawClient === "string"
      ? rawClient.replace(/[^a-z0-9.\-]/gi, "").slice(0, 40) || "unknown"
      : "untagged";
    const report = (body as { report?: unknown }).report;
    if (typeof report === "string") {
      const rEmail = validEmail((body as { email?: unknown }).email) || "unknown";
      console.warn(`ensure-member-account: [${client}] client reported invalid response for ${rEmail}: ${report.slice(0, 200)}`);
      await admin.from("access_denied_attempts").insert({ email: rEmail, context: `invalid-response [${client}]: ${report.slice(0, 200)}` });
      return json({ ok: true, logged: true }, 200);
    }

    const email = validEmail((body as { email?: unknown }).email);
    if (!email) return json({ ok: true, eligible: false }, 200);

    // Both synced community addresses and access requests approved manually
    // may use email-code sign-in. The response deliberately does not reveal
    // which private allow-list contains the address.
    const [syncedResult, manualResult] = await Promise.all([
      admin
        .from("authorized_emails")
        .select("email")
        .eq("email", email)
        .eq("authorized", true)
        .maybeSingle(),
      admin
        .from("manual_authorized_emails")
        .select("email")
        .eq("email", email)
        .eq("authorized", true)
        .maybeSingle(),
    ]);
    if (syncedResult.error) throw syncedResult.error;
    if (manualResult.error) throw manualResult.error;
    if (!syncedResult.data && !manualResult.data) {
      // רישום הניסיון שנדחה — כדי שאף אחת לא תיעלם בשקט
      console.log(`ensure-member-account: [${client}] denied ${email}`);
      await admin
        .from("access_denied_attempts")
        .insert({ email, context: `email-code-sign-in [${client}]` });
      return json({ ok: true, eligible: false }, 200);
    }

    console.log(`ensure-member-account: [${client}] eligible ${email}`);
    const authHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    // If the email already has an Auth account, skip creation and continue to
    // the OTP step as usual. We only create when no account exists.
    let exists = false;
    for (let page = 1; page <= 20 && !exists; page++) {
      const res = await fetch(
        `${url}/auth/v1/admin/users?page=${page}&per_page=1000`,
        { headers: authHeaders }
      );
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`listUsers failed: ${res.status} ${text.slice(0, 300)}`);
      }
      const users = (JSON.parse(text)?.users ?? []) as { email?: string }[];
      exists = users.some((u) => cleanEmail(u.email ?? "") === email);
      if (users.length < 1000) break;
    }

    if (exists) {
      console.log(`ensure-member-account: account already exists for ${email}, skipping creation`);
    } else {
      const res = await fetch(`${url}/auth/v1/admin/users`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          email,
          // Note: keep the password <= 72 chars (bcrypt limit) — GoTrue
          // returns a bare 500 for longer passwords.
          password: crypto.randomUUID(),
          email_confirm: true,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        // A concurrent signup between lookup and create is fine too.
        if (/already.*registered|already.*exists|already.*in use|email_exists/i.test(text)) {
          console.log(`ensure-member-account: create returned already-exists for ${email}`);
        } else {
          throw new Error(`createUser failed: ${res.status} ${text.slice(0, 300)}`);
        }
      }
    }

    return json({ ok: true, eligible: true }, 200);
  } catch (error) {
    const detail =
      error instanceof Error ? `${error.name}: ${error.message}` : JSON.stringify(error);
    console.error(`ensure-member-account failed: ${detail}`, error);
    return json({ error: "ACCOUNT_PREPARATION_FAILED", detail }, 500);
  }
});
