import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Loader2, Mail, RefreshCw, Trash2 } from "lucide-react";

type Lead = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  created_at: string;
};

const SOURCE_LABELS: Record<string, string> = {
  mailing_popup: "חלונית תפוצה",
  inline_form: "טופס באתר",
  contact_popup: "טופס יצירת קשר",
  hosting_popup: "אירוח מפגש",
  community_popup: "הצטרפות לקהילה",
  contact_form: "טופס יצירת קשר בדף הבית",
};

const sourceLabel = (s: string | null) => (s ? SOURCE_LABELS[s] ?? s : "—");

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("id, email, name, source, created_at")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("טעינת הנרשמות נכשלה");
      return;
    }
    setLeads((data ?? []) as Lead[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.email.toLowerCase().includes(q) ||
        (l.name ?? "").toLowerCase().includes(q) ||
        sourceLabel(l.source).toLowerCase().includes(q),
    );
  }, [leads, query]);

  const exportCsv = () => {
    const rows = [
      ["שם", "מייל", "מקור", "תאריך הרשמה"],
      ...filtered.map((l) => [l.name ?? "", l.email, sourceLabel(l.source), fmtDate(l.created_at)]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `נרשמות-לתפוצה-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הרשומה?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast.error("המחיקה נכשלה");
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("נמחק");
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            נרשמות לתפוצה
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            סה״כ {leads.length} נרשמות{query && ` · ${filtered.length} בסינון`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 ml-1" />
            רענון
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 ml-1" />
            ייצוא לאקסל
          </Button>
        </div>
      </div>

      <Input
        placeholder="חיפוש לפי שם, מייל או מקור..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">לא נמצאו נרשמות</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-right">
              <tr>
                <th className="px-4 py-3 font-medium">שם</th>
                <th className="px-4 py-3 font-medium">מייל</th>
                <th className="px-4 py-3 font-medium">מקור</th>
                <th className="px-4 py-3 font-medium">תאריך</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-4 py-3">{l.name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                    {l.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{sourceLabel(l.source)}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {fmtDate(l.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void remove(l.id)}
                      aria-label="מחיקה"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
