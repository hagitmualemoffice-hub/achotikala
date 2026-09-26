import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type SyncState = {
  last_synced_at: string | null;
  last_status: string | null;
  last_error: string | null;
  authorized_count: number | null;
};

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

/** מצב הסנכרון של רשימת המורשות ללוח הדירות מול Google Contacts. */
const ApartmentAccessCard = () => {
  const [state, setState] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("apartment_access_sync")
      .select("last_synced_at,last_status,last_error,authorized_count")
      .eq("id", 1)
      .maybeSingle();
    setState((data as SyncState) ?? null);
  }, []);
  useEffect(() => void load(), [load]);

  const syncNow = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("apartment-access-sync", {
      body: { action: "pull" },
    });
    setBusy(false);
    await load();
    if (error || (data as { error?: string } | null)?.error) toast.error("הסנכרון נכשל");
    else toast.success(`הסנכרון הושלם · ${(data as { authorizedCount?: number }).authorizedCount ?? 0} מורשות`);
  };

  const ok = state?.last_status === "ok";

  return (
    <div className="bg-background rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="font-medium">הרשאות לוח הדירות (Google Contacts)</h2>
          </div>
          {state?.last_synced_at ? (
            <div className="mt-3 space-y-1 text-sm">
              <div className={`flex items-center gap-2 ${ok ? "text-emerald-600" : "text-destructive"}`}>
                {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <span>{ok ? "הסנכרון האחרון הצליח" : "הסנכרון האחרון נכשל"}</span>
              </div>
              <div className="text-muted-foreground">
                {state.authorized_count ?? 0} כתובות מורשות · עודכן: {fmt(state.last_synced_at)}
              </div>
              {!ok && state.last_error && (
                <div className="text-xs text-destructive/80 break-all">{state.last_error}</div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">טרם בוצע סנכרון.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-accent disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          סנכרן עכשיו
        </button>
      </div>
    </div>
  );
};

export default ApartmentAccessCard;
