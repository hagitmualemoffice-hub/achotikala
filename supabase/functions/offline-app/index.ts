// Public, read-only source for the Offline version's APPLICATION CODE.
//   GET ?manifest=1  -> { appVersion, generatedAt, sizeBytes }   (tiny)
//   GET              -> the full app bundle { appVersion, js, css, assets }
// Served straight from private storage with the service role, so nothing needs
// a public bucket and the installed folder needs no credentials.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BUCKET = "media";
const DIR = "offline-app";

const baseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: baseHeaders });
  const headers = { ...baseHeaders, "Content-Type": "application/json; charset=utf-8" };
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const params = new URL(req.url).searchParams;
    if (params.get("zip") === "1") {
      // Installer ZIP for new installations — streamed from this same fixed URL.
      // No redirect to a signed storage URL: NetFree blocks that host, and the
      // download address must stay identical forever.
      const { data, error } = await admin.storage
        .from(BUCKET)
        .download(`${DIR}/achotikala-offline.zip`);
      if (error || !data) {
        console.error("offline-app zip download failed:", error?.message);
        return new Response(JSON.stringify({ error: "not_published" }), { status: 404, headers });
      }
      return new Response(data.stream(), {
        headers: {
          ...baseHeaders,
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="achotikala-offline.zip"',
        },
      });
    }

    const wantManifest = params.get("manifest") === "1";
    const name = wantManifest ? "app-manifest.json" : "app-bundle.json";
    // Keep both the manifest and the full update on this first-party endpoint.
    // A redirect to /storage/v1/object/sign is blocked on some NetFree setups,
    // even when this functions endpoint itself is allowed.
    const { data, error } = await admin.storage.from(BUCKET).download(`${DIR}/${name}`);
    if (error || !data) {
      console.error("offline-app download failed:", error?.message);
      return new Response(JSON.stringify({ error: "not_published" }), { status: 404, headers });
    }
    return new Response(data.stream(), { headers });
  } catch (e) {
    console.error("offline-app failed:", e);
    return new Response(JSON.stringify({ error: "unavailable" }), { status: 500, headers });
  }
});
