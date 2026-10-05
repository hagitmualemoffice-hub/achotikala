import { useEffect, useState } from "react";
import { Flower2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { ETHNICITY_OPTIONS, ORIENTATION_OPTIONS, STATUS_OPTIONS } from "./baar";
import { fetchDailyState, setDailyPreferences, type DailyCadence, type DailyFilterKind } from "./dailyBaar";

export default function DailyBaarPreferences({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cadence, setCadence] = useState<DailyCadence>("every_other_day");
  const [kind, setKind] = useState<DailyFilterKind>("status");
  const [value, setValue] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchDailyState().then((state) => {
      if (cancelled) return;
      if (!state.authorized) { onOpenChange(false); return; }
      setCadence(state.cadence ?? "every_other_day");
      setKind(state.filter_kind ?? "status");
      setValue(state.filter_value ?? "");
      setMinAge(state.min_age?.toString() ?? "");
      setMaxAge(state.max_age?.toString() ?? "");
    }).catch(() => { if (!cancelled) toast.error("לא הצלחנו לטעון את ההעדפות"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, onOpenChange]);

  const save = async () => {
    const min = minAge === "" ? null : Number(minAge);
    const max = maxAge === "" ? null : Number(maxAge);
    if ((min !== null && (!Number.isInteger(min) || min < 18 || min > 100)) ||
        (max !== null && (!Number.isInteger(max) || max < 18 || max > 100)) ||
        (min !== null && max !== null && min > max)) {
      toast.error("בחרי טווח גילאים תקין בין 18 ל־100");
      return;
    }
    setSaving(true);
    try {
      await setDailyPreferences(cadence, value ? kind : null, value || null, min, max);
      toast.success("ההעדפות נשמרו 💗");
      onOpenChange(false);
    } catch {
      toast.error("לא הצלחנו לשמור כרגע");
    } finally { setSaving(false); }
  };

  const options = kind === "status" ? STATUS_OPTIONS : kind === "orientation" ? ORIENTATION_OPTIONS : ETHNICITY_OPTIONS;
  const inputClass = "min-w-0 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none focus:border-primary";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} desktopContentClassName="max-w-md">
      <div dir="rtl" className="space-y-6 px-6 pb-8 pt-7 md:px-8">
        <h2 className="flex items-center gap-2 text-[20px] text-foreground"><Flower2 className="h-5 w-5 text-primary" />העדפות ההשתדלות היומית</h2>
        {loading ? <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : <>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[14px] text-foreground">מתי להציג לי כרטיס באופן אוטומטי?</legend>
            {([ ["every_other_day", "אחת ליומיים"], ["daily", "כל יום"], ["muted", "ללא התראה אוטומטית"] ] as const).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 py-1.5 text-[14px] text-foreground">
                <input type="radio" name="daily-cadence" checked={cadence === key} onChange={() => setCadence(key)} className="accent-primary" />{label}
              </label>
            ))}
            <p className="text-[12px] text-muted-foreground">גם בלי התראה, הכרטיס שלך זמין תמיד בטור הצד.</p>
          </fieldset>
          <div className="space-y-2">
            <p className="text-[14px] text-foreground">העדפה אישית</p>
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="סוג העדפה" value={kind} onChange={(e) => { setKind(e.target.value as DailyFilterKind); setValue(""); }} className={inputClass}>
                <option value="status">סטטוס</option><option value="orientation">אוריינטציה</option><option value="ethnicity">עדה</option>
              </select>
              <select aria-label="ערך העדפה" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}>
                <option value="">ללא העדפה</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-[14px] text-foreground">טווח גילאים</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-[12px] text-muted-foreground">מגיל<input type="number" inputMode="numeric" min="18" max="100" value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="ללא הגבלה" className={inputClass} /></label>
              <label className="space-y-1 text-[12px] text-muted-foreground">עד גיל<input type="number" inputMode="numeric" min="18" max="100" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="ללא הגבלה" className={inputClass} /></label>
            </div>
          </fieldset>
          <Button onClick={() => void save()} disabled={saving} className="w-full rounded-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}שמירת ההעדפות
          </Button>
        </>}
      </div>
    </ResponsiveDialog>
  );
}