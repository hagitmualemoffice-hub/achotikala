import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { identityAdmin, type IdentityAdminState } from "./identityExperiment";

export default function IdentityExperimentAdmin() {
  const [value, setValue] = useState<IdentityAdminState | null>(null);
  const [busy, setBusy] = useState(false);
  const update = async (allow?: boolean, announcement?: boolean) => {
    setBusy(true);
    try { setValue(await identityAdmin(allow, announcement)); }
    catch { toast.error("לא הצלחנו לשמור את הגדרות הניסוי"); }
    finally { setBusy(false); }
  };
  useEffect(() => { void update(); }, []);
  const stats = value?.stats;
  const percentage = (count: number) => stats?.responded ? `${Math.round(count * 100 / stats.responded)}%` : "0%";
  return <section className="space-y-5 border-b border-border pb-7">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-medium">ניסוי כתיבה בשם מלא בליבה</h3><Button variant="ghost" size="icon" aria-label="רענון סיכום הניסוי" disabled={busy} onClick={() => void update()}><RefreshCw className="h-4 w-4" /></Button></div>
    <div className="flex items-center justify-between gap-4"><div><Label htmlFor="liba-full-name">כתיבה בשם מלא בליבה</Label><p className="mt-1 text-xs text-muted-foreground">{value?.allow_nickname_posting ? "לא פעיל · ניתן לבחור שם או ניק" : "פעיל · תוכן חדש בשם המלא בלבד"}</p></div><Switch id="liba-full-name" disabled={busy || !value} checked={value?.allow_nickname_posting === false} onCheckedChange={(on) => void update(!on)} /></div>
    <div className="flex items-center justify-between gap-4"><div><Label htmlFor="liba-experiment-announcement">הודעת הניסוי</Label><p className="mt-1 text-xs text-muted-foreground">{value?.announcement_active ? "פעילה" : "לא פעילה"} · מוצגת רק בזמן ניסוי בשם מלא</p></div><Switch id="liba-experiment-announcement" disabled={busy || !value} checked={value?.announcement_active ?? false} onCheckedChange={(on) => void update(undefined, on)} /></div>
    {stats && <div className="space-y-2 text-sm">
      <h4 className="font-medium">תשובות החברות · ניסוי {value?.version}</h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <dt className="text-muted-foreground">ראו את ההודעה</dt><dd>{stats.shown}</dd>
        <dt className="text-muted-foreground">ענו</dt><dd>{stats.responded}</dd>
        <dt className="text-muted-foreground">אוהבת את זה ❤️</dt><dd>{stats.love} · {percentage(stats.love)}</dd>
        <dt className="text-muted-foreground">אוקיי, ננסה 🙂</dt><dd>{stats.try} · {percentage(stats.try)}</dd>
        <dt className="text-muted-foreground">ראו ולא ענו</dt><dd>{stats.unanswered}</dd>
        <dt className="text-muted-foreground">סגרו ללא תשובה</dt><dd>{stats.dismissed}</dd>
      </dl><p className="text-xs text-muted-foreground">האחוזים מתוך החברות שענו. כל חברה נספרת פעם אחת.</p>
    </div>}
  </section>;
}