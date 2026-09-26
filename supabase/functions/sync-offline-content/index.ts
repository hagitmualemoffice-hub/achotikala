// Publishes a new Offline content version through the project's own endpoint.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildOfflineContent } from "../_shared/offlineContent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // --- who may trigger a rebuild -------------------------------------------
  // 1. the scheduled job / automation carrying the server secret
  // 2. a signed-in user (the admin dashboard button)
  // 3. anyone else, but only once every 30 minutes, so the scheduled hourly
  //    refresh keeps working even without a secret and the build cost stays bounded
  const syncSecret = Deno.env.get("OFFLINE_SYNC_SECRET");
  const viaSecret = !!syncSecret && req.headers.get("x-offline-sync-secret") === syncSecret;

  const state =
    (await admin.from("offline_sync_state").select("*").eq("id", 1).maybeSingle()).data ?? null;

  if (!viaSecret) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) {
      const last = state?.last_synced_at ? Date.parse(state.last_synced_at as string) : 0;
      if (Date.now() - last < 30 * 60 * 1000)
        return json({ ok: true, skipped: "recently_synced", contentVersion: state?.content_version }, 200);
    }
  }

  const fail = async (message: string, status = 500) => {
    await admin
      .from("offline_sync_state")
      .upsert({ id: 1, last_status: "error", last_error: message, updated_at: new Date().toISOString() });
    console.error("offline sync failed:", message);
    return json({ ok: false, error: message }, status);
  };

  try {
    const version = (state?.content_version ?? 0) + 1;
    const content = await buildOfflineContent(admin, version);
    const payload = JSON.stringify(content);

    // Store the built file so the public endpoint can serve it without
    // rebuilding (rebuilding per-request exceeds the worker memory budget).
    const upload = await admin.storage
      .from("media")
      .upload("offline-content/achotikala-content.json", new Blob([payload], { type: "application/json" }), {
        upsert: true,
        contentType: "application/json",
        cacheControl: "60",
      });
    if (upload.error) return await fail(`storage upload failed: ${upload.error.message}`);

    await admin.from("offline_sync_state").upsert({
      id: 1,
      content_version: version,
      last_status: "ok",
      last_error: null,
      last_synced_at: new Date().toISOString(),
      media_count: Object.keys(content.media).length,
      size_bytes: payload.length,
      updated_at: new Date().toISOString(),
    });

    return json({
      ok: true,
      contentVersion: version,
      mediaCount: Object.keys(content.media).length,
      sizeBytes: payload.length,
    });
  } catch (e) {
    return await fail(e instanceof Error ? e.message : String(e));
  }
});
