import { useCallback, useEffect, useState } from "react";
import { Loader2, X, Wrench, Flag } from "lucide-react";
import { toast } from "sonner";
import {
  adminQueue,
  adminReviewReport,
  adminReviewTool,
  relTime,
  type AdminQueue,
} from "@/community/v1/api";
import { spaceById } from "@/community/v1/spaces";
import HeyLibaFeedback from "@/community/v1/HeyLibaFeedback";

/** Small moderation drawer: pending tool recommendations and reports. */
export default function AdminPanel({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [queue, setQueue] = useState<AdminQueue | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setQueue(await adminQueue());
    } catch {
      toast.error("לא הצלחנו לטעון את התורים");
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
      await load();
      onChanged?.();
    } catch {
      toast.error("הפעולה לא הושלמה");
    } finally {
      setBusy(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/25 p-4 py-20 backdrop-blur-sm md:py-24"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-[28px] bg-card shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-10 py-7 md:px-12">
          <h2 className="text-[16px] font-light text-foreground">ניהול הקהילה</h2>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!queue ? (
          <p className="flex items-center justify-center gap-2 py-14 text-[13px] font-light text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> טוענות…
          </p>
        ) : (
          <div className="space-y-8 px-10 py-10 md:px-12 md:py-12">
            <section>
              <p className="mb-3 flex items-center gap-2 text-[10.5px] tracking-[0.2em] text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" /> המלצות לכלים ({queue.tools.length})
              </p>
              <ul className="divide-y divide-border/50">
                {queue.tools.map((t) => (
                  <li key={t.id} className="py-3.5">
                    <p className="text-[14px] font-light text-foreground">{t.title}</p>
                    <p className="mt-1 text-[11.5px] font-light text-muted-foreground">
                      {t.space ? spaceById(t.space).shortName : "כללי"}
                      {t.by ? ` · ${t.by}` : ""} · {relTime(t.submitted_at)}
                    </p>
                    {t.note && (
                      <p className="mt-2 rounded-2xl bg-muted/60 px-3.5 py-2.5 text-[12.5px] font-light text-foreground/80">
                        {t.note}
                      </p>
                    )}
                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        disabled={busy === t.id}
                        onClick={() => act(t.id, () => adminReviewTool(t.id, true))}
                        className="rounded-full bg-primary px-5 py-2 text-[12.5px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))]"
                      >
                        אישור
                      </button>
                      <button
                        disabled={busy === t.id}
                        onClick={() => act(t.id, () => adminReviewTool(t.id, false))}
                        className="text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
                      >
                        דחייה
                      </button>
                      {busy === t.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </div>
                  </li>
                ))}
                {queue.tools.length === 0 && (
                  <li className="py-6 text-[13px] font-light text-muted-foreground">אין המלצות חדשות.</li>
                )}
              </ul>
            </section>

            <section>
              <p className="mb-3 flex items-center gap-2 text-[10.5px] tracking-[0.2em] text-muted-foreground">
                <Flag className="h-3.5 w-3.5" /> דיווחים ({queue.reports.length})
              </p>
              <ul className="divide-y divide-border/50">
                {queue.reports.map((r) => (
                  <li key={r.id} className="py-3.5">
                    <p className="text-[13.5px] font-light text-foreground/85">
                      {r.excerpt ?? "התוכן כבר לא זמין"}
                    </p>
                    <p className="mt-1 text-[11.5px] font-light text-muted-foreground">
                      {r.target_type === "post" ? "פוסט" : "תגובה"} · {relTime(r.created_at)}
                      {r.reason ? ` · ${r.reason}` : ""}
                    </p>
                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        disabled={busy === r.id}
                        onClick={() => act(r.id, () => adminReviewReport(r.id, "remove"))}
                        className="rounded-full bg-primary px-5 py-2 text-[12.5px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))]"
                      >
                        הסרת התוכן
                      </button>
                      <button
                        disabled={busy === r.id}
                        onClick={() => act(r.id, () => adminReviewReport(r.id, "dismiss"))}
                        className="text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
                      >
                        השארה
                      </button>
                      {busy === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </div>
                  </li>
                ))}
                {queue.reports.length === 0 && (
                  <li className="py-6 text-[13px] font-light text-muted-foreground">אין דיווחים פתוחים.</li>
                )}
              </ul>
            </section>

            <HeyLibaFeedback />
          </div>
        )}
      </div>
    </div>
  );
}
