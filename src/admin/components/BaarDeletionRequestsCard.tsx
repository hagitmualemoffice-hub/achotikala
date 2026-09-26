import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { fetchBaarDeletionRequests, resolveBaarDeletion } from "@/community/v1/baar";

type Row = Awaited<ReturnType<typeof fetchBaarDeletionRequests>>[number];

const STATUS: Record<string, string> = { pending: "ממתינה", approved: "נמחק", rejected: "נדחתה" };

/** בקשות למחיקת בחור מהבאר — נמחק רק אחרי אישור מנהלת. */
export default function BaarDeletionRequestsCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchBaarDeletionRequests());
    } catch {
      setRows([]);
    }
    setLoading(false);
  }, []);
  useEffect(() => void load(), [load]);

  const resolve = async (r: Row, approve: boolean) => {
    if (approve && !window.confirm(`למחוק את ${r.boy_name} מהבאר?`)) return;
    setBusy(r.id);
    try {
      await resolveBaarDeletion(r.id, approve);
      toast.success(approve ? "הבחור הוסר מהבאר" : "הבקשה נדחתה");
      await load();
    } catch {
      toast.error("הפעולה נכשלה");
    } finally {
      setBusy(null);
    }
  };

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="bg-background rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <Trash2 className="h-4 w-4 text-primary" />
        <h2 className="font-medium">בקשות למחיקת בחורים מהבאר</h2>
        {pending > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{pending} ממתינות</span>
        )}
      </div>
      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> טוען…
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">אין בקשות מחיקה.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.slice(0, 50).map((r) => (
            <li key={r.id} className="rounded-lg border p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium">{r.boy_name}</div>
                  <div>סיבה: {r.reason}</div>
                  {r.details && <div className="text-muted-foreground whitespace-pre-line">{r.details}</div>}
                  <div className="text-xs text-muted-foreground">
                    ביקשה: {r.reporter_name} · {new Date(r.created_at).toLocaleDateString("he-IL")} · {STATUS[r.status] ?? r.status}
                  </div>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      disabled={busy === r.id}
                      onClick={() => void resolve(r, true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" /> אישור מחיקה
                    </button>
                    <button
                      disabled={busy === r.id}
                      onClick={() => void resolve(r, false)}
                      className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs hover:bg-accent disabled:opacity-60"
                    >
                      <X className="h-3.5 w-3.5" /> דחייה
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
