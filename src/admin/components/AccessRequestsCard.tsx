import { useCallback, useEffect, useState } from "react";
import { Check, Inbox, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Request = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  connection: string;
  note: string | null;
  status: string;
  created_at: string;
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתינה",
  approved: "אושרה",
  rejected: "נדחתה / הגישה הוסרה",
};

/** בקשות גישה לליבה וללוח הדירות — מאושרות מיד; המנהלת יכולה להסיר גישה. */
const AccessRequestsCard = () => {
  const [rows, setRows] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("apartment_access_requests")
      .select("id,full_name,email,phone,connection,note,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as Request[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => void load(), [load]);

  const review = async (row: Request, approve: boolean) => {
    setBusyId(row.id);
    try {
      if (approve) {
        const { data: session } = await supabase.auth.getUser();
        const { error } = await supabase.from("manual_authorized_emails").upsert(
          {
            email: row.email,
            authorized: true,
            note: `אושרה מבקשת גישה · ${row.full_name}`,
            approved_by: session.user?.id ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" },
        );
        if (error) throw new Error(error.message);
      }
      const { error: upErr } = await supabase
        .from("apartment_access_requests")
        .update({
          status: approve ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) throw new Error(upErr.message);
      toast.success(approve ? "הגישה אושרה" : "הבקשה נדחתה");
      await load();
    } catch {
      toast.error("הפעולה נכשלה");
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (row: Request) => {
    if (!window.confirm(`להסיר את הגישה של ${row.full_name}?`)) return;
    setBusyId(row.id);
    try {
      const { data: session } = await supabase.auth.getUser();
      const { error } = await supabase.from("manual_authorized_emails").upsert(
        {
          email: row.email,
          authorized: false,
          note: `הגישה הוסרה על ידי מנהלת · ${row.full_name}`,
          approved_by: session.user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
      if (error) throw new Error(error.message);
      await supabase
        .from("apartment_access_requests")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", row.id);
      toast.success("הגישה הוסרה");
      await load();
    } catch {
      toast.error("הפעולה נכשלה");
    } finally {
      setBusyId(null);
    }
  };

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="bg-background rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <Inbox className="h-4 w-4 text-primary" />
        <h2 className="font-medium">בקשות גישה לליבה / לוח דירות</h2>
        <span className="text-xs text-muted-foreground">מאושרות אוטומטית · אפשר להסיר גישה</span>
        {pending > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{pending} ממתינות</span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> טוען…
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">אין בקשות גישה כרגע.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-muted-foreground" dir="ltr">
                    {r.email} · {r.phone}
                  </div>
                  <div className="text-muted-foreground">{r.connection}</div>
                  {r.note && <div className="text-muted-foreground">{r.note}</div>}
                  <div className="text-xs text-muted-foreground">
                    נשלחה: {fmt(r.created_at)} · סטטוס: {STATUS_LABEL[r.status] ?? r.status}
                  </div>
                </div>

                {r.status === "approved" && (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void revoke(r)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs hover:bg-accent disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" /> הסרת גישה
                  </button>
                )}
                {r.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void review(r, true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" /> אישור
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void review(r, false)}
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
};

export default AccessRequestsCard;
