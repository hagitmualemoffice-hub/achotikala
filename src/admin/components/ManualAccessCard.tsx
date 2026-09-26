import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Row = { email: string; authorized: boolean; note: string | null; updated_at: string };

const EMAIL_RE = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g;

/** Manual allow-list: paste emails of members who can't sign in. */
export default function ManualAccessCard() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("manual_authorized_emails")
      .select("email,authorized,note,updated_at")
      .order("updated_at", { ascending: false })
      .limit(300);
    setRows((data as Row[]) ?? []);
  }, []);
  useEffect(() => void load(), [load]);

  const add = async () => {
    const emails = Array.from(new Set((text.match(EMAIL_RE) ?? []).map((e) => e.trim().toLowerCase())));
    if (!emails.length) return toast.error("לא נמצאו כתובות מייל");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const { error } = await supabase.from("manual_authorized_emails").upsert(
      emails.map((email) => ({ email, authorized: true, note: "הוכנסה ידנית", approved_by: u.user?.id ?? null, updated_at: now })),
      { onConflict: "email" },
    );
    setBusy(false);
    if (error) return toast.error("השמירה נכשלה");
    toast.success(`${emails.length} כתובות קיבלו גישה`);
    setText("");
    void load();
  };

  const toggle = async (r: Row) => {
    const { error } = await supabase
      .from("manual_authorized_emails")
      .update({ authorized: !r.authorized, updated_at: new Date().toISOString() })
      .eq("email", r.email);
    if (error) return toast.error("העדכון נכשל");
    void load();
  };

  return (
    <div className="bg-background rounded-xl border p-5 space-y-4">
      <div>
        <h2 className="font-medium">הכנסה ידנית לרשימת הגישה</h2>
        <p className="text-xs text-muted-foreground mt-1">
          למי שנתקלת בבעיית כניסה. אפשר להדביק כמה כתובות יחד (שורה, פסיק או רווח ביניהן).
        </p>
      </div>
      <Textarea dir="ltr" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="name@example.com" />
      <Button onClick={add} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin me-2" />}
        מתן גישה
      </Button>
      <div className="divide-y">
        {rows.map((r) => (
          <div key={r.email} className="flex items-center justify-between py-2 gap-3">
            <div className="min-w-0">
              <div dir="ltr" className="text-sm truncate text-end">{r.email}</div>
              <div className="text-xs text-muted-foreground">{r.authorized ? "מורשית" : "הגישה בוטלה"}{r.note ? ` · ${r.note}` : ""}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => toggle(r)}>
              {r.authorized ? "ביטול גישה" : "החזרת גישה"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
