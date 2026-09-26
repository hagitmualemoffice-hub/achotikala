#!/usr/bin/env node
/**
 * PROTECTED: אורז את גרסת האופליין (NetFree) לחלקי .js + מניפסט.
 * גודל החלק, ערבול חתימת הפתיחה, DJB2 ושדות המניפסט חייבים להישאר זהים ל-offline/launcher.html.
 *
 *   node scripts/pack-offline.mjs                       # אורז מתוך offline-dist/ (build מקומי)
 *   node scripts/pack-offline.mjs --dist offline-dist
 *   node scripts/pack-offline.mjs --source https://achotikala.com   # גיבוי: מהאתר החי
 *   node scripts/pack-offline.mjs --version 50
 *
 * הפלט: offline-cdn/updates/manifest.json + manifest.js + parts/*.js
 * אחרי הרצה: push ל-GitHub, purge ל-jsDelivr, ואימות עם scripts/verify-offline-publish.mjs.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  CHUNK_RAW,
  HDR_LEN,
  HDR_XOR,
  BINARY_EXT,
  IMAGE_WARN_BYTES,
  djb2,
  decodePartFile,
  updateOrigin,
} from "./offline-shared.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);

const DIST = path.resolve(root, arg("--dist", "offline-dist"));
const SOURCE = args.includes("--source") ? arg("--source").replace(/\/$/, "") : null;
const versionArg = args.includes("--version") ? Number(arg("--version")) : null;

const CDN_ROOT = path.join(root, "offline-cdn");
const OUT_DIR = path.join(CDN_ROOT, "updates");
const PARTS_DIR = path.join(OUT_DIR, "parts");
const MANIFEST_JSON = path.join(OUT_DIR, "manifest.json");
const MANIFEST_JS = path.join(OUT_DIR, "manifest.js");
const PARTS_REGISTRY = path.join(CDN_ROOT, "parts-registry.json");
const LOCK_FILE = path.join(root, ".offline-update.lock");

const SKIP = /(\.map$|^\.|\/\.|(^|\/)(node_modules|stats\.html)$)/;
// תיקיות שאינן חלק מהאפליקציה (חוברות PDF, קבצים להורדה) — מוגדרות ב-offline/config.json
const EXCLUDE = (JSON.parse(fs.readFileSync(path.join(root, "offline/config.json"), "utf8")).exclude || []);
const excluded = (rel) => EXCLUDE.some((prefix) => rel === prefix || rel.startsWith(prefix));
const MEDIA_EXT = /\.(jpe?g|png|webp|gif|avif|svg|ico|pdf|mp3|m4a|wav|ogg|mp4|webm|woff2?|ttf|otf)$/i;

const parts = fs.existsSync(PARTS_REGISTRY) ? JSON.parse(fs.readFileSync(PARTS_REGISTRY, "utf8")) : {};
const previous = fs.existsSync(MANIFEST_JSON) ? JSON.parse(fs.readFileSync(MANIFEST_JSON, "utf8")) : null;

/* ---------- נעילה בלעדית ---------- */
let lockHandle;
try {
  lockHandle = fs.openSync(LOCK_FILE, "wx");
  fs.writeFileSync(lockHandle, `${process.pid}\n${new Date().toISOString()}\n`);
} catch (error) {
  if (error?.code === "EEXIST") {
    console.error("✗ כבר מתבצעת אריזת אופליין אחרת. יש להמתין לסיומה ולהריץ שוב.");
    process.exit(1);
  }
  throw error;
}
const releaseLock = () => {
  try { if (lockHandle !== undefined) fs.closeSync(lockHandle); } catch {}
  try { fs.rmSync(LOCK_FILE, { force: true }); } catch {}
};
process.on("exit", releaseLock);
process.on("SIGINT", () => process.exit(130));
process.on("SIGTERM", () => process.exit(143));

/* ---------- 1. איסוף הקבצים ---------- */
/** @returns {Promise<Map<string, Buffer>>} rel -> תוכן */
async function collectFromDist() {
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    throw new Error(
      `לא נמצא ${path.relative(root, DIST)}/index.html — יש להריץ קודם build של גרסת האופליין ` +
        `(bun run build:offline).`,
    );
  }
  const out = new Map();
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (SKIP.test(rel) || SKIP.test(`/${entry.name}`) || excluded(rel)) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs, rel);
      else out.set(rel, fs.readFileSync(abs));
    }
  };
  walk(DIST, "");
  return out;
}

/** גיבוי: אריזה מהאתר החי (כמו המערכת הקודמת). */
async function collectFromLive() {
  const cache = new Map();
  const get = async (rel) => {
    if (cache.has(rel)) return cache.get(rel);
    const res = await fetch(`${SOURCE}/${rel}`);
    const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    cache.set(rel, buf);
    return buf;
  };
  const indexRes = await fetch(`${SOURCE}/`);
  if (!indexRes.ok) throw new Error(`לא ניתן להוריד את ${SOURCE} (${indexRes.status})`);
  const indexBuf = Buffer.from(await indexRes.arrayBuffer());
  cache.set("index.html", indexBuf);
  const html = indexBuf.toString("utf8");

  const wanted = new Set(["index.html", "favicon.ico"]);
  for (const m of html.matchAll(/(?:src|href)="\/([^"]+)"/g)) {
    const p = m[1].split("?")[0];
    if (!p.startsWith("~")) wanted.add(p);
  }
  const wm = await get("manifest.webmanifest");
  if (wm) {
    try {
      for (const i of JSON.parse(wm.toString("utf8")).icons || [])
        if (i.src) wanted.add(i.src.replace(/^\//, "").split("?")[0]);
    } catch {}
  }
  const scan = (text) => {
    for (const m of text.matchAll(
      /["'(]\s*\/?((?:assets|images|img|media|files|fonts|lovable-uploads)\/[A-Za-z0-9._%\-\u0590-\u05FF ]+)\s*["')]/g,
    )) {
      const p = m[1].split("?")[0];
      if (MEDIA_EXT.test(p)) wanted.add(p);
    }
  };
  scan(html);
  for (const pass of [/\.(js|css)$/i, /\.css$/i]) {
    for (const rel of [...wanted]) {
      if (!pass.test(rel)) continue;
      const buf = await get(rel);
      if (buf) scan(buf.toString("utf8"));
    }
  }
  const out = new Map();
  const missing = [];
  for (const rel of [...wanted].sort()) {
    const buf = await get(rel);
    if (buf) out.set(rel, buf);
    else missing.push(rel);
  }
  if (missing.length) console.log(`⚠ לא נמצאו באתר: ${missing.join(", ")}`);
  return out;
}

const files = SOURCE ? await collectFromLive() : await collectFromDist();

/* ---------- 2. חתימות + ערבול חתימת פתיחה ---------- */
const entries = [];
const heavy = [];
for (const rel of [...files.keys()].sort()) {
  const buf = files.get(rel);
  if (MEDIA_EXT.test(rel) && buf.length > IMAGE_WARN_BYTES) heavy.push([rel, buf.length]);
  const x = BINARY_EXT.test(rel) && buf.length > HDR_LEN ? HDR_LEN : 0;
  const packBuf = Buffer.from(buf);
  for (let i = 0; i < x; i++) packBuf[i] ^= HDR_XOR;
  const e = {
    p: rel,
    h: createHash("sha256").update(buf).digest("hex").slice(0, 32),
    s: buf.length,
    c: djb2(buf),
    buf: packBuf,
  };
  if (x) e.x = x;
  entries.push(e);
}
if (heavy.length) {
  console.log(`\n⚠ קבצי מדיה מעל ${Math.round(IMAGE_WARN_BYTES / 1024)}KB — כדאי לדחוס ל-WebP לפני פרסום:`);
  for (const [rel, size] of heavy) console.log(`  - ${rel} (${(size / 1024).toFixed(0)}KB)`);
}

/* ---------- 3. אריזה של מה שהשתנה בלבד ---------- */
fs.mkdirSync(PARTS_DIR, { recursive: true });
let packed = 0;
let reused = 0;
const asMeta = (v, x) =>
  Array.isArray(v)
    ? null
    : v && Array.isArray(v.k) && v.m === 0 && v.z === CHUNK_RAW && (v.x || 0) === x && v.v === 2
      ? v
      : null;

for (const f of entries) {
  const prev = asMeta(parts[f.h], f.x || 0);
  const stillValid =
    prev &&
    prev.k.every((c, idx) => {
      const abs = path.join(CDN_ROOT, c.u);
      if (!fs.existsSync(abs)) return false;
      const part = decodePartFile(fs.readFileSync(abs, "utf8"));
      if (!part || part.hash !== f.h || part.index !== idx || part.total !== prev.k.length) return false;
      return part.raw.length === c.l && djb2(part.raw) === c.c;
    });
  if (stillValid) {
    f.k = prev.k;
    reused++;
  } else {
    const n = Math.max(1, Math.ceil(f.buf.length / CHUNK_RAW));
    const k = [];
    for (let i = 0; i < n; i++) {
      const slice = f.buf.subarray(i * CHUNK_RAW, (i + 1) * CHUNK_RAW);
      // שם החלק מסמן גם את הפורמט (h = חתימת פתיחה מעורבלת): תוכן שונה = כתובת שונה,
      // אחרת מטמון ה-CDN ימשיך להגיש תוכן ישן מאותה כתובת.
      const name = `${f.h}${f.x ? "h" : ""}.${i}.js`;
      fs.writeFileSync(
        path.join(PARTS_DIR, name),
        `AK.part("${f.h}",${i},${n},"${Buffer.from(slice).toString("base64")}",0);\n`,
      );
      k.push({ u: "/updates/parts/" + name, l: slice.length, c: djb2(slice) });
    }
    parts[f.h] = { k, m: 0, z: CHUNK_RAW, x: f.x || 0, v: 2 };
    f.k = k;
    packed++;
    console.log(`↑ ${f.p} (${n} חלקים)`);
  }
  delete f.buf;
}
fs.writeFileSync(PARTS_REGISTRY, JSON.stringify(parts, null, 2));

/* ---------- 4. אימות מקומי לפני כתיבת המניפסט ---------- */
const problems = [];
for (const f of entries) {
  const pieces = [];
  let sum = 0;
  for (let idx = 0; idx < f.k.length; idx++) {
    const c = f.k[idx];
    const abs = path.join(CDN_ROOT, c.u);
    if (!fs.existsSync(abs)) { problems.push(`${f.p}: חסר ${c.u}`); continue; }
    const part = decodePartFile(fs.readFileSync(abs, "utf8"));
    if (!part || part.hash !== f.h || part.index !== idx) { problems.push(`${f.p}: ${c.u} פגום`); continue; }
    if (part.raw.length !== c.l) { problems.push(`${f.p}: ${c.u} אורך ${part.raw.length} במקום ${c.l}`); continue; }
    if (djb2(part.raw) !== c.c) { problems.push(`${f.p}: ${c.u} חתימה שגויה`); continue; }
    sum += part.raw.length;
    pieces.push(part.raw);
  }
  if (sum !== f.s) { problems.push(`${f.p}: סכום החלקים ${sum} במקום ${f.s}`); continue; }
  const whole = Buffer.concat(pieces);
  for (let b = 0; b < (f.x || 0); b++) whole[b] ^= HDR_XOR;
  if (djb2(whole) !== f.c) problems.push(`${f.p}: חתימת הקובץ המורכב שגויה`);
}
if (problems.length) {
  console.error(`\n✗ האריזה בוטלה — ${problems.length} בעיות. המניפסט לא נכתב:`);
  for (const p of problems.slice(0, 30)) console.error("  - " + p);
  process.exit(1);
}
console.log(`✓ אומתו ${entries.reduce((n, f) => n + f.k.length, 0)} חלקים לפני כתיבת המניפסט.`);

/* ---------- 5. מניפסט ---------- */
const sameAsPrev =
  previous &&
  previous.files.length === entries.length &&
  previous.files.every((f, i) => f.p === entries[i].p && f.h === entries[i].h);

const version = versionArg ?? (sameAsPrev ? previous.version : previous ? previous.version + 1 : 1);
const manifest = {
  version,
  generated: new Date().toISOString(),
  entry: "index.html",
  source: SOURCE || path.relative(root, DIST),
  stage: "full",
  // rev 14+: המקור הראשי. launcher rev 14 שומר ומעדיף אותו; rev 13 ומטה מתעלם מהשדה.
  origin: updateOrigin(root),
  files: entries,
};
fs.writeFileSync(MANIFEST_JSON, JSON.stringify(manifest, null, 2));
fs.writeFileSync(
  MANIFEST_JS,
  `/* נוצר אוטומטית ע"י scripts/pack-offline.mjs */\n` +
    `window.AKUPD_MANIFEST && window.AKUPD_MANIFEST(${JSON.stringify(manifest)});\n`,
);

/* ---------- 6. ניקוי חלקים שאינם בשימוש (הגרסה הקודמת נשמרת) ---------- */
const keep = new Set(entries.flatMap((f) => f.k.map((c) => path.basename(c.u))));
const keptHashes = new Set(entries.map((f) => f.h));
if (previous) {
  for (const f of previous.files || []) {
    keptHashes.add(f.h);
    for (const c of f.k || []) keep.add(path.basename(c.u));
  }
}
let removed = 0;
for (const name of fs.readdirSync(PARTS_DIR)) {
  if (!keep.has(name)) { fs.rmSync(path.join(PARTS_DIR, name)); removed++; }
}
for (const h of Object.keys(parts)) if (!keptHashes.has(h)) delete parts[h];
fs.writeFileSync(PARTS_REGISTRY, JSON.stringify(parts, null, 2));

console.log(
  `\nגרסה ${version} — ${entries.length} קבצים, ${entries.reduce((n, f) => n + f.k.length, 0)} חלקים, ` +
    `${packed} נארזו מחדש, ${reused} ללא שינוי, ${removed} חלקים ישנים נמחקו.` +
    (sameAsPrev ? "\nלא זוהה שינוי מול הגרסה הקודמת." : "\nכעת: push ל-GitHub + purge ל-jsDelivr."),
);
