/**
 * "היי, ליבה" — the small, personal channel between a woman and us.
 *
 * Everything here goes through security-definer functions: she can only create
 * her own reports and read her own; admins read and manage all of them. Nothing
 * — screenshot included — is ever captured or sent without her pressing a button.
 */
import { supabase } from "@/integrations/supabase/client";
import { IS_OFFLINE_RUNTIME } from "@/offline/isOffline";

const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export type FeedbackKind = "bug" | "idea" | "improvement";
export type FeedbackStatus = "new" | "in_progress" | "done" | "wontfix";

export type AdminFeedback = {
  id: string;
  kind: FeedbackKind;
  body: string;
  screenshot: string | null;
  route: string | null;
  feature: string | null;
  context_id: string | null;
  meta: Record<string, unknown>;
  is_offline: boolean;
  app_version: string | null;
  status: FeedbackStatus;
  admin_note: string | null;
  notified_at: string | null;
  created_at: string;
  reporter: { user_id: string; name: string; email: string | null };
};

export type AdminFeedbackList = {
  counts: { all: number; bug: number; idea: number; improvement: number; new: number };
  items: AdminFeedback[];
};

/* ------------------------------ technical info ----------------------------- */

/** Which part of ליבה she was in — derived from the address, nothing else. */
const featureFromPath = (path: string): string => {
  if (path.startsWith("/liba/baar")) return "הבאר";
  if (path.startsWith("/liba/dirot") || path.startsWith("/dirot")) return "לוח הדירות";
  if (path.startsWith("/liba/sheli") || path.startsWith("/liba/ezor-ishi")) return "שלי";
  if (path.startsWith("/liba")) return "המרחב שלנו";
  return "אחותי כלה";
};

const browserName = (ua: string): string => {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "דפדפן אחר";
};

const osName = (ua: string): string => {
  if (/Windows/.test(ua)) return "Windows";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "מערכת אחרת";
};

export type CollectedContext = {
  route: string;
  feature: string;
  context_id: string | null;
  is_offline: boolean;
  app_version: string | null;
  meta: Record<string, unknown>;
};

/** Only what actually helps us reproduce the problem — nothing more. */
export const collectContext = (): CollectedContext => {
  const w = window as unknown as {
    ACHOTIKALA_RUNNING_APP_VERSION?: number;
    ACHOTIKALA_APP_VERSION?: number;
    ACHOTIKALA_BOOT_CORE_VERSION?: number;
  };
  const route = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const offlineVersion = w.ACHOTIKALA_RUNNING_APP_VERSION ?? w.ACHOTIKALA_APP_VERSION ?? null;
  const ua = navigator.userAgent;
  const params = new URLSearchParams(window.location.search);

  return {
    route,
    feature: featureFromPath(window.location.pathname),
    context_id:
      params.get("post") ??
      params.get("boy") ??
      params.get("inquiry") ??
      params.get("thread") ??
      params.get("space") ??
      (window.location.hash ? window.location.hash.replace(/^#/, "") : null),
    is_offline: IS_OFFLINE_RUNTIME,
    app_version: IS_OFFLINE_RUNTIME
      ? `offline ${offlineVersion ?? "?"}`
      : (import.meta.env.VITE_SOURCE_FINGERPRINT as string | undefined) ?? null,
    meta: {
      sent_at: new Date().toISOString(),
      browser: browserName(ua),
      device: osName(ua),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      dpr: window.devicePixelRatio,
      language: navigator.language,
      online: navigator.onLine,
      source: IS_OFFLINE_RUNTIME ? "local" : "website",
      offline_app_version: offlineVersion,
      offline_boot_version: w.ACHOTIKALA_BOOT_CORE_VERSION ?? null,
      user_agent: ua.slice(0, 300),
    },
  };
};

/* -------------------------------- screenshot ------------------------------- */

const MAX_SHOT_CHARS = 850_000; // the server refuses anything larger

/**
 * Takes a picture of the page she is looking at, in the browser, on her explicit
 * press. Nothing leaves the device until she sees the preview and presses send.
 */
export const captureScreen = async (): Promise<string> => {
  const { default: html2canvas } = await import("html2canvas-pro");
  const canvas = await html2canvas(document.body, {
    backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
    scale: Math.min(1, 1400 / Math.max(1, window.innerWidth)),
    useCORS: true,
    // her own "היי, ליבה" panel should not appear inside the picture
    ignoreElements: (el: Element) => el instanceof HTMLElement && el.dataset.heyliba === "1",
    logging: false,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
    height: Math.min(document.documentElement.scrollHeight, window.innerHeight * 2),
  });
  let quality = 0.8;
  let out = canvas.toDataURL("image/webp", quality);
  while (out.length > MAX_SHOT_CHARS && quality > 0.35) {
    quality -= 0.12;
    out = canvas.toDataURL("image/webp", quality);
  }
  return out;
};

/** A screenshot she picked from her computer, shrunk to a sane size. */
export const shotFromFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not_an_image"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1400 / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("no_canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.8;
      let out = canvas.toDataURL("image/webp", quality);
      while (out.length > MAX_SHOT_CHARS && quality > 0.35) {
        quality -= 0.12;
        out = canvas.toDataURL("image/webp", quality);
      }
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable_image"));
    };
    img.src = url;
  });

/* ---------------------------------- drafts --------------------------------- */

const DRAFT_KEY = "achotikala.heyliba.draft";

export type FeedbackDraft = { kind: FeedbackKind; body: string; savedAt: string };

export const saveDraft = (draft: FeedbackDraft | null) => {
  try {
    if (!draft || !draft.body.trim()) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* private mode — nothing we can do, and nothing breaks */
  }
};

export const loadDraft = (): FeedbackDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedbackDraft;
    return parsed && typeof parsed.body === "string" ? parsed : null;
  } catch {
    return null;
  }
};

/* ----------------------------------- api ----------------------------------- */

export const sendFeedback = async (
  kind: FeedbackKind,
  body: string,
  screenshot: string | null,
): Promise<void> => {
  const ctx = collectContext();
  await rpc<{ ok: boolean }>("liba_feedback_send", {
    _kind: kind,
    _body: body,
    _screenshot: screenshot,
    _route: ctx.route,
    _feature: ctx.feature,
    _context_id: ctx.context_id,
    _meta: ctx.meta,
    _is_offline: ctx.is_offline,
    _app_version: ctx.app_version,
  });
};

export const adminFeedbackList = (kind?: FeedbackKind | null, status?: FeedbackStatus | null) =>
  rpc<AdminFeedbackList>("liba_feedback_admin_list", {
    _kind: kind ?? null,
    _status: status ?? null,
  });

export const adminFeedbackUpdate = (
  id: string,
  status?: FeedbackStatus | null,
  note?: string | null,
) =>
  rpc<{ ok: boolean }>("liba_feedback_admin_update", {
    _id: id,
    _status: status ?? null,
    _admin_note: note ?? null,
    _notify: true,
  });

export const kindLabel: Record<FeedbackKind, string> = {
  bug: "משהו לא עובד",
  idea: "יש לי רעיון",
  improvement: "הייתי משפרת משהו",
};

export const statusLabel: Record<FeedbackStatus, string> = {
  new: "חדש",
  in_progress: "בטיפול",
  done: "טופל",
  wontfix: "לא יטופל",
};
