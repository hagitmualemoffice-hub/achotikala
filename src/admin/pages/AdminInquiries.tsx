import { useCallback, useEffect, useMemo, useState } from "react";
import { HandHeart, Loader2, Pin, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminInquiryAction, fetchInquiries, setInquiryStatus, type Inquiry } from "@/community/v1/inquiries";

export default function AdminInquiries() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchInquiries({ query, all: true })); }
    catch { toast.error("לא הצלחנו לטעון את הבירורים"); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), query ? 250 : 0); return () => window.clearTimeout(timer); }, [load, query]);
  const stats = useMemo(() => ({ open: items.filter((x) => x.status === "open").length, waiting: items.filter((x) => x.needs_help).length, helped: items.filter((x) => x.help_count > 0).length }), [items]);
  const patch = (next: Inquiry) => setItems((xs) => xs.map((x) => x.id === next.id ? next : x));
  const act = async (item: Inquiry, action: "pin" | "bump" | "remove") => {
    if (action === "remove" && !window.confirm("להסיר את הבירור?")) return;
    try { const next = await adminInquiryAction(item.id, action, action === "pin" ? { value: !item.pinned } : {}); action === "remove" ? setItems((xs) => xs.filter((x) => x.id !== item.id)) : patch(next); toast.success("הפעולה הושלמה"); }
    catch { toast.error("הפעולה לא הושלמה"); }
  };
  return <div dir="rtl" className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-light"><HandHeart className="h-5 w-5 text-primary"/>בירורים</h1><p className="mt-1 text-sm text-muted-foreground">{stats.open} פתוחים · {stats.waiting} מחכים לעזרה · {stats.helped} קיבלו מענה</p></div><Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4"/>רענון</Button></div>
    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי שם, עיר או ישיבה" className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"/>
    {loading ? <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-primary"/> : items.length === 0 ? <p className="py-16 text-center text-muted-foreground">לא נמצאו בירורים.</p> : <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="px-4 py-3 text-right font-medium">שם</th><th className="px-4 py-3 text-right font-medium">פרטים</th><th className="px-4 py-3 text-right font-medium">מענה</th><th className="px-4 py-3 text-right font-medium">מצב</th><th className="px-4 py-3"/></tr></thead><tbody>{items.map((q) => <tr key={q.id} className="border-t border-border/60"><td className="px-4 py-3 font-medium">{q.boy_name}</td><td className="px-4 py-3 text-muted-foreground">{[q.age ? `בן ${q.age}` : null,q.city,q.yeshiva].filter(Boolean).join(" · ") || "—"}</td><td className="px-4 py-3">{q.help_count} מסייעות</td><td className="px-4 py-3">{q.status === "open" ? "פתוח" : q.status === "resolved" ? "נפתר" : "סגור"}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" title={q.pinned ? "ביטול נעיצה" : "נעיצה"} onClick={() => void act(q,"pin")}><Pin className={`h-4 w-4 ${q.pinned ? "text-primary" : ""}`}/></Button><Button variant="ghost" size="sm" onClick={() => void act(q,"bump")}>הקפצה</Button>{q.status === "open" ? <Button variant="ghost" size="sm" onClick={async () => { try { patch(await setInquiryStatus(q.id,"resolved")); } catch { toast.error("לא הצלחנו לעדכן"); } }}>נפתר</Button> : null}<Button variant="ghost" size="icon" onClick={() => void act(q,"remove")}><Trash2 className="h-4 w-4 text-destructive"/></Button></div></td></tr>)}</tbody></table></div>}
  </div>;
}
