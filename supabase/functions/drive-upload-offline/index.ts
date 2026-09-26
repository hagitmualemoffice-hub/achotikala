import { createClient } from "npm:@supabase/supabase-js@2";
import driveFiles from "./drive-files.json" with { type: "json" };

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get("authorization") || "";
    const secret = Deno.env.get("OFFLINE_DRIVE_TOKEN") || Deno.env.get("DRIVE_UPLOAD_TOKEN") || Deno.env.get("OFFLINE_SYNC_SECRET") || "";
    if (!secret || auth !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }


    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const driveKey = Deno.env.get("GOOGLE_DRIVE_API_KEY");
    if (!lovableKey || !driveKey) {
      return new Response(JSON.stringify({ error: "missing gateway keys" }), { status: 500 });
    }

    // Self-contained offline install package (single HTML file) kept in storage.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: blob, error: dlErr } = await supabase.storage
      .from("media")
      .download("offline-app/achoti-kalah.html");
    if (dlErr || !blob) {
      return new Response(JSON.stringify({ error: "storage download failed", details: String(dlErr) }), { status: 500 });
    }

    // Replace all four fixed Drive files while preserving their public URLs forever.
    const packageBytes = await blob.arrayBuffer();
    const files = [];
    for (const target of driveFiles.files) {
      const upRes = await fetch(
        `https://connector-gateway.lovable.dev/google_drive/upload/drive/v3/files/${target.id}?uploadType=media&fields=id,name,size,md5Checksum,webViewLink,webContentLink`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": driveKey,
            "Content-Type": "text/html",
            "Content-Length": String(packageBytes.byteLength),
          },
          body: packageBytes,
        },
      );

      const upText = await upRes.text();
      if (!upRes.ok) {
        return new Response(
          JSON.stringify({ error: "drive upload failed", target: target.label, fileId: target.id, status: upRes.status, details: upText }),
          { status: upRes.status, headers: { "Content-Type": "application/json" } },
        );
      }
      const file = JSON.parse(upText);
      files.push({
        label: target.label,
        fileId: file.id,
        name: file.name,
        size: file.size,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        downloadUrl: `https://drive.usercontent.google.com/download?id=${file.id}&export=download&confirm=t`,
        md5Checksum: file.md5Checksum,
      });
    }

    const checksums = new Set(files.map((file) => file.md5Checksum));
    if (checksums.size !== 1) {
      return new Response(JSON.stringify({ error: "drive copies differ after upload", files }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        copies: files.length,
        md5Checksum: files[0]?.md5Checksum,
        files,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
