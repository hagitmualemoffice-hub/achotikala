import manifest from "./media-manifest.json";
import { IS_OFFLINE_BUILD } from "./offlineContent";
import { getRuntimeMedia } from "./runtimeMedia";

const map = manifest as Record<string, string>;

/* Signed storage URLs carry a token that changes every time it is re-signed,
   so the same picture can appear with two different query strings. We match on
   the path alone as a fallback so covers still resolve to the bundled file. */
const basePath = (url: string) => url.split("?")[0];

const byBasePath: Record<string, string> = {};
for (const [url, local] of Object.entries(map)) {
  const key = basePath(url);
  if (!(key in byBasePath)) byBasePath[key] = local;
}

type MediaMiss = { url: string; reason: string; at: string };

const misses: MediaMiss[] = [];

/** Records (and logs) a media path that could not be resolved to a local file. */
const reportMiss = (url: string, reason: string) => {
  if (misses.some((m) => m.url === url)) return;
  const entry = { url, reason, at: new Date().toISOString() };
  misses.push(entry);
  // eslint-disable-next-line no-console
  console.warn(`[offline-media] לא נמצא קובץ מקומי: ${url} — ${reason}`);
  if (typeof window !== "undefined") {
    (window as unknown as { ACHOTIKALA_MEDIA_MISSES?: MediaMiss[] }).ACHOTIKALA_MEDIA_MISSES = misses;
  }
};

/** Diagnostics for the offline runtime: which media paths stayed external. */
export const offlineMediaMisses = () => misses.slice();

if (typeof window !== "undefined") {
  (window as unknown as { ACHOTIKALA_MEDIA_MISSES?: MediaMiss[] }).ACHOTIKALA_MEDIA_MISSES = misses;
}

/** Rewrites a CDN asset path to the file bundled inside the Offline folder. */
export const offlineMedia = (url?: string | null): string | undefined => {
  if (!url) return url ?? undefined;
  if (!IS_OFFLINE_BUILD) return url;
  const local = map[url] ?? byBasePath[basePath(url)];
  if (local) return `./media/${local}`;
  const runtime = getRuntimeMedia();
  const runtimeHit =
    runtime[url] ?? Object.entries(runtime).find(([k]) => basePath(k) === basePath(url))?.[1];
  if (runtimeHit) return runtimeHit;
  reportMiss(url, "לא במניפסט המקומי ולא בעדכון התוכן");
  return url;
};

/** Same rewrite for asset paths embedded inside rich-text HTML. */
export const offlineMediaHtml = (html: string): string => {
  if (!IS_OFFLINE_BUILD || !html) return html;
  let out = html;
  for (const [url, local] of Object.entries(map)) {
    if (out.includes(url)) out = out.split(url).join(`./media/${local}`);
  }
  for (const [url, dataUrl] of Object.entries(getRuntimeMedia())) {
    if (out.includes(url)) out = out.split(url).join(dataUrl);
  }
  /* Same-picture-different-token case: match on the path without the query. */
  out = out.replace(/https?:\/\/[^"'\s]+\/storage\/v1\/object\/[^"'\s]+/g, (u) => {
    const local = byBasePath[basePath(u)];
    return local ? `./media/${local}` : u;
  });
  for (const m of out.matchAll(/(?:src|href)="((?:https?:)?\/\/[^"]+|\/__l5e\/[^"]+)"/g)) {
    reportMiss(m[1], "נשאר כקישור חיצוני בתוך תוכן הפוסט");
  }
  return out;
};
