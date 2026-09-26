import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Attempt = { id: string; email: string; context: string | null; created_at: string };
type Revocation = { id: string; email: string; source: string | null; reason: string | null; revoked_at: string };

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** מי ניסתה להתחבר ולא הצליחה, ומי הוסרה מרשימת המאושרות — כדי שאף אחת לא תיעלם בשקט. */
const AccessAttemptsCard = () => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [revocations, setRevocations] = useState<Revocation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, r] = await Promise.all([
      supabase
        .from("access_denied_attempts")
        .select("id,email,context,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("authorized_email_revocations")
        .select("id,email,source,reason,revoked_at")
        .order("revoked_at", { ascending: false })
        .limit(50),
    ]);
    setAttempts((a.data as Attempt[]) ?? []);
    setRevocations((r.data as Revocation[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => void load(), [load]);

  return (
    <div className="bg-background rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-primary" />
        <h2 className="font-medium">מי לא הצליחה להיכנס</h2>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> טוען…
        </div>
      ) : (
        <div className="mt-4 space-y-6 text-sm">
          <div>
            <h3 className="text-xs text-muted-foreground">
              ניסיונות התחברות שנדחו (הכתובת לא נמצאה ברשימות)
            </h3>
            {attempts.length === 0 ? (
              <p className="mt-2 text-muted-foreground">אין ניסיונות שנדחו.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {attempts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border px-3 py-2">
                    <span dir="ltr">{a.email}</span>
                    <span className="text-xs text-muted-foreground">{fmt(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldOff className="h-3.5 w-3.5" />
              הרשאות שנשללו בסנכרון מגוגל
            </h3>
            {revocations.length === 0 ? (
              <p className="mt-2 text-muted-foreground">לא נשללה שום הרשאה מאז שהיומן נפתח.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {revocations.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border px-3 py-2">
                    <span dir="ltr">{r.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmt(r.revoked_at)}
                      {r.reason ? ` · ${r.reason}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessAttemptsCard;
