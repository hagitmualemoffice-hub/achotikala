/**
 * PROTECTED: קבועים משותפים לאריזת גרסת האופליין (NetFree) ולקובץ הפתיחה.
 * גודל החלק, ערבול חתימת הפתיחה, חתימות DJB2 ושדות המניפסט (u/l/c) חייבים להישאר
 * זהים ל-offline/launcher.html. ראה docs/OFFLINE-ARCHITECTURE.md.
 */
import fs from "node:fs";
import path from "node:path";

// 32KB גולמי (~44KB אחרי base64) — נמדד כעובר סינון NetFree.
export const CHUNK_RAW = 32 * 1024;
// נשמר לתאימות לאחור בלבד: חלקים חדשים נארזים ללא ערבול (masked = 0).
export const XOR_KEY = [0x5a, 0x3c, 0xa7, 0x11, 0x6d, 0xf2, 0x89, 0x24];
// ערבול 24 הבתים הראשונים בקבצים בינאריים — פותר חסימה של חתימת JPEG וכו'.
export const HDR_LEN = 24;
export const HDR_XOR = 0x5a;
export const BINARY_EXT =
  /\.(jpe?g|png|webp|gif|avif|bmp|ico|pdf|mp3|m4a|wav|ogg|mp4|webm|woff2?|ttf|otf)$/i;
// משמעת גודל תמונות (Project Knowledge): מעל זה מתקבלת אזהרה.
export const IMAGE_WARN_BYTES = 500 * 1024;

export function djb2(buf) {
  let h = 5381;
  for (let i = 0; i < buf.length; i++) h = ((h * 33) ^ buf[i]) >>> 0;
  return h.toString(16);
}

export const PART_RE = /^AK\.part\("([0-9a-f]+)",(\d+),(\d+),"([^"]*)",([01])\);/;

/** מפענח קובץ חלק (.js) חזרה לבתים גולמיים, כולל XOR לחלקים ותיקים. */
export function decodePartFile(text) {
  const m = text.match(PART_RE);
  if (!m) return null;
  const raw = Buffer.from(m[4], "base64");
  if (m[5] === "1") for (let b = 0; b < raw.length; b++) raw[b] ^= XOR_KEY[b % XOR_KEY.length];
  return { hash: m[1], index: Number(m[2]), total: Number(m[3]), b64: m[4], masked: m[5] === "1", raw };
}

/** כתובת מקור העדכונים (jsDelivr) מתוך offline/config.json. */
export function updateOrigin(root = process.cwd()) {
  const file = path.join(root, "offline/config.json");
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!cfg.ghOwner || !cfg.ghRepo) {
    throw new Error(
      "offline/config.json חסר ghOwner/ghRepo — יש לחבר את הפרויקט לריפו GitHub ציבורי ולמלא אותם.",
    );
  }
  return `https://cdn.jsdelivr.net/gh/${cfg.ghOwner}/${cfg.ghRepo}@${cfg.branch || "main"}/${cfg.cdnPath || "offline-cdn"}`;
}

export function purgeUrl(root = process.cwd()) {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "offline/config.json"), "utf8"));
  return `https://purge.jsdelivr.net/gh/${cfg.ghOwner}/${cfg.ghRepo}@${cfg.branch || "main"}/${cfg.cdnPath || "offline-cdn"}`;
}

/** Legacy origin (old achotikala repo) for rev ≤13 installs during the transition; null if disabled. */
export function legacyOrigin(root = process.cwd()) {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "offline/config.json"), "utf8"));
  if (!cfg.legacy || !cfg.legacy.enabled) return null;
  return `https://cdn.jsdelivr.net/gh/${cfg.ghOwner}/${cfg.legacy.ghRepo}@${cfg.branch || "main"}/${cfg.cdnPath || "offline-cdn"}`;
}

/** Ordered origin list embedded in launcher rev 14: primary first, legacy as fallback. */
export function updateOrigins(root = process.cwd()) {
  return [updateOrigin(root), legacyOrigin(root)].filter(Boolean);
}
