// Public, read-only primary source for the Offline version:
// serves the prebuilt achotikala-content.json (published by sync-offline-content)
// from the project's own storage — no auth, CORS open, no Google Drive.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildOfflineContent } from "../_shared/offlineContent.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const OBJECT = "offline-content/achotikala-content.json";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 1. prebuilt file (normal path) — streamed straight through
  try {
    const { data } = await admin.storage.from("media").download(OBJECT);
    if (data) return new Response(data.stream(), { headers });
  } catch (e) {
    console.error("offline-content: stored file unavailable:", e);
  }

  // 2. fallback: build a lightweight version without embedded media
  try {
    const { data } = await admin
      .from("offline_sync_state")
      .select("content_version")
      .eq("id", 1)
      .maybeSingle();
    const content = await buildOfflineContent(admin, data?.content_version ?? 1, { embedMedia: false });
    return new Response(JSON.stringify(content), { headers });
  } catch (e) {
    console.error("offline-content failed:", e);
    return new Response(JSON.stringify({ error: "unavailable" }), { status: 500, headers });
  }
});
