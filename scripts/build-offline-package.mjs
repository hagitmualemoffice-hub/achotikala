#!/usr/bin/env node
/**
 * בונה את קובץ ההתקנה הראשונה — קובץ HTML אחד, עצמאי לחלוטין:
 * קובץ הפתיחה (offline/launcher.html) + כל חלקי התוכן מוטמעים בתוכו.
 * ההתקנה הראשונה אינה מבצעת אף בקשת רשת; עדכונים לאחר מכן זורמים כרגיל מ-jsDelivr.
 *
 *   node scripts/build-offline-package.mjs
 *   node scripts/build-offline-package.mjs --out /mnt/documents/offline
 *
 * את הקובץ שנוצר מעלים ידנית ל-Google Drive ומחליפים בקישור הקיים.
 */
import fs from "node:fs";
import path from "node:path";
import { decodePartFile, djb2, HDR_XOR, updateOrigin, updateOrigins } from "./offline-shared.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const OUT_DIR = path.resolve(arg("--out", "/mnt/documents/offline"));

const CDN_ROOT = path.join(root, "offline-cdn");
const MANIFEST_JSON = path.join(CDN_ROOT, "updates/manifest.json");
if (!fs.existsSync(MANIFEST_JSON)) {
  console.error("✗ אין מניפסט. יש להריץ קודם: node scripts/pack-offline.mjs");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST_JSON, "utf8"));
const origin = (args.includes("--origin") ? arg("--origin") : updateOrigin(root)).replace(/\/$/, "");

const launcherPath = path.join(root, "offline/launcher.html");
let launcher = fs.readFileSync(launcherPath, "utf8");
if (!launcher.includes("__UPDATE_ORIGINS__")) {
  console.error("✗ offline/launcher.html אינו מכיל __UPDATE_ORIGINS__ — התבנית השתנתה.");
  process.exit(1);
}
const origins = args.includes("--origin") ? [origin] : updateOrigins(root).map((o) => o.replace(/\/$/, ""));
launcher = launcher.split("__UPDATE_ORIGINS__").join(JSON.stringify(origins));

/* ---------- אימות + הטמעה של כל החלקים ---------- */
const seedScripts = [];
let bytes = 0;
for (const f of manifest.files) {
  const pieces = [];
  for (let idx = 0; idx < f.k.length; idx++) {
    const c = f.k[idx];
    const abs = path.join(CDN_ROOT, c.u);
    if (!fs.existsSync(abs)) {
      console.error(`✗ חסר חלק ${c.u} (${f.p})`);
      process.exit(1);
    }
    const part = decodePartFile(fs.readFileSync(abs, "utf8"));
    if (!part || part.hash !== f.h || part.index !== idx || part.raw.length !== c.l || djb2(part.raw) !== c.c) {
      console.error(`✗ חלק פגום ${c.u} (${f.p})`);
      process.exit(1);
    }
    pieces.push(part.raw);
    bytes += part.raw.length;
    seedScripts.push(`<script>AK.seedPart("${f.h}",${idx},${f.k.length},"${part.b64}");</script>`);
  }
  const whole = Buffer.concat(pieces);
  for (let b = 0; b < (f.x || 0); b++) whole[b] ^= HDR_XOR;
  if (whole.length !== f.s || djb2(whole) !== f.c) {
    console.error(`✗ אימות קובץ מלא נכשל: ${f.p}`);
    process.exit(1);
  }
}

const seed =
  `\n<!-- חבילת התקנה מוטמעת — גרסה ${manifest.version} -->\n` +
  `<script>window.AK_SEED_MANIFEST = ${JSON.stringify(manifest)};</script>\n` +
  seedScripts.join("\n") +
  `\n<script>AK.seedDone();</script>\n`;

let html = launcher.replace("</head>", `<script>window.AK_SEED_PENDING = 1;</script>\n</head>`);
const bodyClose = html.lastIndexOf("</body>");
html = html.slice(0, bodyClose) + seed + html.slice(bodyClose);

fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, "achoti-kalah.html");
fs.writeFileSync(outFile, html);

console.log(
  `✓ נוצר ${outFile}\n` +
    `  גרסה ${manifest.version} — ${manifest.files.length} קבצים, ${seedScripts.length} חלקים, ` +
    `${(bytes / 1024 / 1024).toFixed(1)}MB תוכן, ${(html.length / 1024 / 1024).toFixed(1)}MB קובץ.\n` +
    `  מקורות העדכונים המוטמעים: ${origins.join(" , ")}\n` +
    `  כעת: להעלות את הקובץ ל-Google Drive ולהחליף את הקובץ בקישור הקיים.`,
);
