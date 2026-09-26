#!/usr/bin/env node
/**
 * אימות פרסום של גרסת האופליין. אינו משנה מניפסט/פורמט/תעבורה.
 *
 *   node scripts/verify-offline-publish.mjs            # מול jsDelivr (offline/config.json)
 *   node scripts/verify-offline-publish.mjs --local    # מול הקבצים על הדיסק בלבד
 *   node scripts/verify-offline-publish.mjs --origin https://...
 *
 * בודק לכל חלק: נגישות, מזהה קובץ, מספור, אורך וחתימת DJB2; ואחר כך מרכיב כל קובץ
 * במלואו ומאמת אורך, DJB2 ו-SHA-256 מול המניפסט — בדיוק כמו קובץ הפתיחה.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { decodePartFile, djb2, HDR_XOR, updateOrigin, legacyOrigin } from "./offline-shared.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const LOCAL = args.includes("--local");
const CONCURRENCY = Number(arg("--concurrency", "12"));
const CDN_ROOT = path.join(root, "offline-cdn");
const localManifestPath = path.join(CDN_ROOT, "updates/manifest.json");

let ORIGIN = null;
let manifest;
if (LOCAL) {
  if (!fs.existsSync(localManifestPath)) {
    console.error("✗ אין מניפסט מקומי. יש להריץ: node scripts/pack-offline.mjs");
    process.exit(1);
  }
  manifest = JSON.parse(fs.readFileSync(localManifestPath, "utf8"));
} else {
  ORIGIN = (args.includes("--origin") ? arg("--origin") : args.includes("--legacy") ? legacyOrigin(root) : updateOrigin(root)).replace(/\/$/, "");
  const res = await fetch(`${ORIGIN}/updates/manifest.json?t=${Date.now()}`);
  if (!res.ok) {
    console.error(`✗ המניפסט לא נגיש (${res.status}) — ${ORIGIN}/updates/manifest.json`);
    process.exit(1);
  }
  manifest = await res.json();
  if (fs.existsSync(localManifestPath)) {
    const local = JSON.parse(fs.readFileSync(localManifestPath, "utf8"));
    if (local.version !== manifest.version)
      console.log(`⚠ הגרסה שפורסמה היא ${manifest.version} והמקומית ${local.version} — כנראה טרם נדחף/נוקה מטמון.`);
  }
}

async function readPart(u, cacheBust) {
  if (LOCAL) {
    const abs = path.join(CDN_ROOT, u);
    if (!fs.existsSync(abs)) return { error: "חסר על הדיסק" };
    return { text: fs.readFileSync(abs, "utf8") };
  }
  const r = await fetch(`${ORIGIN}${u}?t=${cacheBust}`);
  if (!r.ok) return { error: `HTTP ${r.status}` };
  return { text: await r.text() };
}

/* ---------- שלב 1: כל חלק בנפרד ---------- */
const urls = new Map();
for (const f of manifest.files)
  f.k.forEach((c, part) =>
    urls.set(c.u, { file: f.p, fileHash: f.h, part, total: f.k.length, len: c.l, sum: c.c }),
  );

let ok = 0;
const bad = [];
const list = [...urls.entries()];
let i = 0;
async function worker() {
  while (i < list.length) {
    const [u, meta] = list[i++];
    try {
      const { text, error } = await readPart(u, Date.now());
      if (error) { bad.push(`${u} → ${error} (${meta.file})`); continue; }
      const part = decodePartFile(text);
      if (!part) { bad.push(`${u} → תוכן לא תקין (${meta.file})`); continue; }
      if (part.hash !== meta.fileHash || part.index !== meta.part || part.total !== meta.total) {
        bad.push(`${u} → מזהה/מספור שגוי (${meta.file})`);
        continue;
      }
      if (part.raw.length !== meta.len) { bad.push(`${u} → אורך ${part.raw.length} במקום ${meta.len} (${meta.file})`); continue; }
      if (djb2(part.raw) !== meta.sum) { bad.push(`${u} → חתימה שגויה (${meta.file})`); continue; }
      ok++;
    } catch (e) {
      bad.push(`${u} → ${e.message} (${meta.file})`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

/* ---------- שלב 2: הרכבה מלאה של כל קובץ ---------- */
for (const f of manifest.files) {
  const pieces = [];
  try {
    for (let part = 0; part < f.k.length; part++) {
      const c = f.k[part];
      const { text, error } = await readPart(c.u, `whole-${Date.now()}-${part}`);
      if (error) throw new Error(error);
      const p = decodePartFile(text);
      if (!p || p.hash !== f.h || p.index !== part || p.raw.length !== c.l || djb2(p.raw) !== c.c)
        throw new Error("חלק לא תואם");
      pieces.push(p.raw);
    }
  } catch (e) {
    bad.push(`${f.p} → ${e.message}`);
    continue;
  }
  const whole = Buffer.concat(pieces);
  for (let b = 0; b < (f.x || 0); b++) whole[b] ^= HDR_XOR;
  const hash = createHash("sha256").update(whole).digest("hex").slice(0, 32);
  if (whole.length !== f.s || djb2(whole) !== f.c || hash !== f.h) bad.push(`${f.p} → אימות קובץ מלא נכשל`);
}

console.log(
  `\n${LOCAL ? "מקומי" : ORIGIN} — גרסה ${manifest.version}, ${manifest.files.length} קבצים, ${urls.size} חלקים.`,
);
console.log(`✓ חלקים תקינים: ${ok}   ✗ בעיות: ${bad.length}`);
for (const b of bad.slice(0, 40)) console.log("  - " + b);
process.exit(bad.length ? 1 : 0);
