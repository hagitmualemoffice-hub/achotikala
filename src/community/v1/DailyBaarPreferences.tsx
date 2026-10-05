import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { DRESS_STYLE_OPTIONS, ETHNICITY_OPTIONS } from "./baar";
import { fetchDailyState, setDailyPreferences, type DailyCadence, type DailyFilterKind } from "./dailyBaar";

export default function DailyBaarPreferences({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cadence, setCadence] = useState<DailyCadence>("every_other_day");
  const [hidden, setHidden] = useState(false);
  const [kind, setKind] = useState<DailyFilterKind>("age");
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
      setHidden(!!state.hidden);
      const savedKind = state.filter_kind;
      setKind(savedKind === "ethnicity" || savedKind === "dress_style" ? savedKind : "age");
      setValue(savedKind === "ethnicity" || savedKind === "dress_style" ? state.filter_value ?? "" : "");
      setMinAge(savedKind === "ethnicity" || savedKind === "dress_style" ? "" : state.min_age?.toString() ?? "");
      setMaxAge(savedKind === "ethnicity" || savedKind === "dress_style" ? "" : state.max_age?.toString() ?? "");
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
      await setDailyPreferences(
        cadence,
        kind === "age" ? null : value ? kind : null,
        kind === "age" ? null : value || null,
        kind === "age" ? min : null,
        kind === "age" ? max : null,
        hidden,
      );
      toast.success(hidden ? "ההשתדלות היומית הוסתרה. תמיד אפשר להחזיר אותה מההגדרות 💗" : "ההעדפות נשמרו 💗");
      onOpenChange(false);
    } catch {
      toast.error("לא הצלחנו לשמור כרגע");
    } finally { setSaving(false); }
  };

  const options = kind === "ethnicity" ? ETHNICITY_OPTIONS : DRESS_STYLE_OPTIONS;
  const inputClass = "min-w-0 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none focus:border-primary";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} desktopContentClassName="max-w-md">
      <div dir="rtl" className="flex min-h-0 flex-1 flex-col">
        <div className="popup-scroll space-y-6 px-6 pb-6 pt-7 md:px-8">
          <h2 className="text-[20px] text-foreground">העדפות ההשתדלות היומית</h2>
          {loading ? <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : <>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[14px] text-foreground">מתי להציג לי כרטיס באופן אוטומטי?</legend>
            {([ ["every_other_day", "אחת ליומיים"], ["daily", "כל יום"], ["muted", "ללא התראה אוטומטית"] ] as const).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 py-1.5 text-[14px] text-foreground">
                <input type="radio" name="daily-cadence" checked={!hidden && cadence === key} onChange={() => { setCadence(key); setHidden(false); }} className="accent-primary" />{label}
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-3 py-1.5 text-[14px] text-foreground">
              <input type="radio" name="daily-cadence" checked={hidden} onChange={() => setHidden(true)} className="accent-primary" />לא מעוניינת — להסתיר לגמרי
            </label>
            <p className="text-[12px] text-muted-foreground">
              {hidden
                ? "ההשתדלות היומית לא תוצג לך יותר — לא בטור הצד ולא בחלונות קופצים. תמיד אפשר להחזיר אותה כאן."
                : "גם בלי התראה, הכרטיס שלך זמין תמיד בטור הצד."}
            </p>
          </fieldset>
          {!hidden && (
          <fieldset className="space-y-3">
            <legend className="mb-2 text-[14px] text-foreground">לפי מה תרצי לסנן?</legend>
            <div className="grid grid-cols-3 gap-2">
              {([ ["age", "גיל"], ["ethnicity", "עדה"], ["dress_style", "סגנון"] ] as const).map(([key, label]) => (
                <label key={key} className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-[13px] transition-colors ${kind === key ? "border-primary bg-primary/[0.07] text-primary" : "border-border bg-background text-foreground"}`}>
                  <input type="radio" name="daily-filter-kind" checked={kind === key} onChange={() => { setKind(key); setValue(""); setMinAge(""); setMaxAge(""); }} className="sr-only" />{label}
                </label>
              ))}
            </div>
            {kind === "age" ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="space-y-1 text-[12px] text-muted-foreground">מגיל<input type="number" inputMode="numeric" min="18" max="100" value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="ללא הגבלה" className={inputClass} /></label>
                <label className="space-y-1 text-[12px] text-muted-foreground">עד גיל<input type="number" inputMode="numeric" min="18" max="100" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="ללא הגבלה" className={inputClass} /></label>
              </div>
            ) : (
              <select aria-label={kind === "ethnicity" ? "בחירת עדה" : "בחירת סגנון"} value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}>
                <option value="">ללא סינון</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <p className="text-[12px] text-muted-foreground">אפשר לבחור סוג סינון אחד ולשנות אותו בכל עת.</p>
          </fieldset>
          )}
          </>}
        </div>
        {!loading && <div className="popup-footer px-6 pt-4 md:px-8">
          <Button onClick={() => void save()} disabled={saving} className="h-12 w-full rounded-xl">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}שמירת ההעדפות
          </Button>
        </div>}
      </div>
    </ResponsiveDialog>
  );
}