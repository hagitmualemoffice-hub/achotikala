// Standalone download page + file handout for the Offline version.
// Served from the same first-party endpoint domain the installed folders already
// use for updates, so it stays reachable where the main website is filtered.
//   GET            -> simple Hebrew HTML page with a download button
//   GET ?file=1    -> 302 to a short-lived signed URL of the installer ZIP
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BUCKET = "media";
const PATH = "offline-app/achotikala-offline.zip";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store",
};

const page = `<!doctype html>
<html lang="he" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>הורדת אחותי כלה - גרסת מחשב</title>
<style>
 body{margin:0;background:#faf7f8;color:#2b2b2b;font:16px/1.7 Arial,Heebo,sans-serif;
      display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
 .card{max-width:560px;width:100%;background:#fff;border:1px solid #f0dde4;border-radius:20px;
      padding:32px;box-shadow:0 8px 30px rgba(190,24,93,.07);text-align:center}
 h1{font-size:26px;font-weight:600;margin:0 0 12px}
 p{color:#5b5b5b;margin:0 0 18px}
 a.btn{display:inline-block;background:#be185d;color:#fff;text-decoration:none;
      padding:15px 34px;border-radius:999px;font-weight:700;font-size:17px}
 ol{text-align:right;color:#5b5b5b;margin:26px 0 0;padding-inline-start:20px}
 li{margin-bottom:8px}
 .note{margin-top:22px;font-size:14px;color:#8a8a8a}
</style></head><body>
<div class="card">
  <h1>הורדת האתר להתקנה על המחשב</h1>
  <p>ההורדה מתבצעת ישירות מהשרת שלנו, בקישור אישי וזמני.</p>
  <a class="btn" href="?file=1">להורדת החבילה</a>
  <ol>
    <li>לחלץ את התיקייה מהקובץ המכווץ (קליק ימני → חילוץ הכל).</li>
    <li>להריץ את קובץ ההתקנה שבתיקייה — הוא יוצר קיצור דרך בשולחן העבודה.</li>
    <li>לפתוח את האתר מקיצור הדרך. בכל פתיחה עם אינטרנט התוכן מתעדכן לבד.</li>
  </ol>
  <p class="note">אם ההורדה נעצרת באמצע — אפשר ללחוץ שוב, הקישור נוצר מחדש בכל לחיצה.</p>
</div></body></html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  // The functions domain forces text/plain + a CSP sandbox on HTML responses,
  // so a landing page cannot render here — the bare link downloads the file.
  if (url.searchParams.get("page") === "1") {
    return new Response(page, { headers: { ...cors, "Content-Type": "text/html; charset=utf-8" } });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(PATH, 60 * 60, { download: "achotikala-offline.zip" });
    if (error || !data?.signedUrl) {
      console.error("download sign failed:", error?.message);
      return new Response("הקובץ אינו זמין כרגע", {
        status: 404,
        headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return new Response(null, { status: 302, headers: { ...cors, Location: data.signedUrl } });
  } catch (e) {
    console.error("download failed:", e);
    return new Response("שגיאה זמנית", {
      status: 500,
      headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
