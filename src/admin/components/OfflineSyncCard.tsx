import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw, HardDriveDownload } from "lucide-react";
import { toast } from "sonner";
import {
  readOfflineAppStatus,
  readOfflineSyncState,
  syncOfflineContent,
  type OfflineAppStatus,
  type OfflineSyncState,
} from "@/admin/lib/offlineSync";

const fmt = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat("he-IL", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "—";

/** Status of the automatic first-party Offline content update. */
const OfflineSyncCard = () => {
  const [state, setState] = useState<OfflineSyncState | null>(null);
  const [app, setApp] = useState<OfflineAppStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [content, appStatus] = await Promise.all([readOfflineSyncState(), readOfflineAppStatus()]);
    setState(content);
    setApp(appStatus);
  }, []);
  useEffect(() => void load(), [load]);

  const retry = async () => {
    setBusy(true);
    const res = await syncOfflineContent();
    setBusy(false);
    await load();
    if (res.ok) toast.success(`גרסת Offline עודכנה בהצלחה (גרסה ${res.version})`);
    else toast.error("העדכון לגרסת Offline נכשל");
  };

  const ok = state?.last_status === "ok";

  return (
    <div className="bg-background rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HardDriveDownload className="h-4 w-4 text-primary" />
            <h2 className="font-medium">גרסת Offline (למשתמשות NetFree)</h2>
          </div>
          {state ? (
            <div className="mt-3 space-y-1 text-sm">
              <div className={`flex items-center gap-2 ${ok ? "text-emerald-600" : "text-destructive"}`}>
                {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <span>{ok ? "גרסת Offline עודכנה בהצלחה" : "העדכון לגרסת Offline נכשל"}</span>
              </div>
              <div className="text-muted-foreground">
                גרסת תוכן {state.content_version} · עודכן: {fmt(state.last_synced_at)}
              </div>
              {state.media_count != null && (
                <div className="text-muted-foreground">
                  {state.media_count} תמונות/מדיה · {((state.size_bytes ?? 0) / 1048576).toFixed(1)}MB
                </div>
              )}
              {!ok && state.last_error && (
                <div className="text-xs text-destructive/80 break-all">{state.last_error}</div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">טרם בוצע עדכון.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void retry()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:border-primary/40 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {ok ? "עדכון עכשיו" : "נסי שוב"}
        </button>
      </div>
      <div className="mt-4 border-t pt-4 text-sm">
        {app ? (
          <div
            className={`flex items-start gap-2 ${
              app.upToDate ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {app.upToDate ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <div>
                {app.upToDate
                  ? `קוד האפליקציה באופליין תואם לאתר (גרסה ${app.appVersion})`
                  : `קוד האפליקציה באופליין אינו מעודכן (גרסה ${app.appVersion}) — יש לפרסם גרסת אופליין חדשה`}
              </div>
              <div className="text-xs text-muted-foreground">פורסם: {fmt(app.generatedAt)}</div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">לא ניתן לבדוק את גרסת הקוד באופליין כרגע.</div>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        התוכן (אירועים, פוסטים, פודקאסט, לוח דירות) מתעדכן אוטומטית — גם בכל שמירה או פרסום וגם
        בבדיקה מתוזמנת כל שעה — ישירות משרת העדכונים של אחותי כלה, ללא תלות בקובץ ציבורי חיצוני.
        השורה למעלה מוודאת שגם קוד האפליקציה בגרסת האופליין זהה לאתר.
      </p>
    </div>
  );
};

export default OfflineSyncCard;
