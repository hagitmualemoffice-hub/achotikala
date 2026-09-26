import { useRef } from "react";
import { IS_OFFLINE_BUILD, useOfflineContent } from "./offlineContent";

declare global {
  interface Window {
    ACHOTIKALA_APP_VERSION?: number;
    ACHOTIKALA_RUNNING_APP_VERSION?: number;
    ACHOTIKALA_BOOT_CORE_VERSION?: number;
  }
}

const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
};

/** Small, unobtrusive footer strip shown only in the Offline build. */
const ContentVersionBar = () => {
  const ctx = useOfflineContent();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!IS_OFFLINE_BUILD || !ctx) return null;

  const { content, status, checkForUpdates, importContent } = ctx;
  const appVersion = window.ACHOTIKALA_RUNNING_APP_VERSION ?? window.ACHOTIKALA_APP_VERSION ?? 0;
  const bootVersion = window.ACHOTIKALA_BOOT_CORE_VERSION ?? 0;
  const note =
    status === "checking"
      ? "מחפשת עדכון…"
      : status === "updated"
        ? "התוכן עודכן"
        : status === "current"
          ? "התוכן מעודכן"
          : status === "offline"
            ? "ללא חיבור — מוצגת הגרסה השמורה"
            : "";

  return (
    <div dir="rtl" className="border-t border-border/60 bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="font-semibold text-foreground" dir="ltr">
          Offline version: {appVersion} · Boot: {bootVersion}
        </span>
        <span>
          גרסת תוכן {content.contentVersion} · עודכן: {fmt(content.generatedAt)}
        </span>
        <button type="button" onClick={() => void checkForUpdates()} className="underline hover:text-foreground">
          בדיקת עדכונים
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="underline hover:text-foreground">
          עדכון מקובץ
        </button>
        {note && <span className="opacity-70">{note}</span>}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importContent(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
};

export default ContentVersionBar;
