import { useEffect, useState } from "react";
import { Activity, GripVertical, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { savePulse, type PulseCheck, type PulseInput } from "@/community/v1/api";
import { SPACES, type SpaceId } from "@/community/v1/spaces";

type Draft = {
  id: string;
  label: string;
  note: string;
};

const newOption = (): Draft => ({
  id: `o${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
  label: "",
  note: "",
});

/** Admin-only: create or edit a "בדיקת דופק" without touching code. */
export default function PulseCheckEditor({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing?: PulseCheck | null;
  onSaved: (p: PulseCheck) => void;
}) {
  const [space, setSpace] = useState<SpaceId>("discussions");
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [options, setOptions] = useState<Draft[]>([newOption(), newOption()]);
  const [anonymous, setAnonymous] = useState(true);
  const [multi, setMulti] = useState(false);
  const [hideResults, setHideResults] = useState(true);
  const [followup, setFollowup] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [followupAnon, setFollowupAnon] = useState(true);
  const [followupVisible, setFollowupVisible] = useState(true);
  const [pinned, setPinned] = useState(true);
  const [featured, setFeatured] = useState(true);
  const [closesAt, setClosesAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSpace(editing.space);
      setTitle(editing.title);
      setIntro(editing.intro ?? "");
      setOptions(
        editing.options.map((o) => ({ id: o.id, label: o.label, note: o.note ?? "" })),
      );
      setAnonymous(editing.anonymous);
      setMulti(editing.multi);
      setHideResults(editing.hide_results);
      setFollowup(editing.followup_question ?? "");
      setPlaceholder(editing.followup_placeholder ?? "");
      setFollowupAnon(editing.followup_anonymous);
      setFollowupVisible(editing.followup_visible);
      setPinned(editing.pinned);
      setFeatured(editing.featured);
      setClosesAt(editing.closes_at ? editing.closes_at.slice(0, 16) : "");
    } else {
      setSpace("discussions");
      setTitle("");
      setIntro("");
      setOptions([newOption(), newOption()]);
      setAnonymous(true);
      setMulti(false);
      setHideResults(true);
      setFollowup("");
      setPlaceholder("");
      setFollowupAnon(true);
      setFollowupVisible(true);
      setPinned(true);
      setFeatured(true);
      setClosesAt("");
    }
  }, [open, editing]);

  const move = (index: number, dir: -1 | 1) => {
    setOptions((cur) => {
      const next = [...cur];
      const to = index + dir;
      if (to < 0 || to >= next.length) return cur;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  const filled = options.filter((o) => o.label.trim().length > 0);
  const valid = title.trim().length >= 4 && filled.length >= 2;

  const publish = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const input: PulseInput = {
        space,
        title: title.trim(),
        intro: intro.trim() || null,
        options: filled.map((o) => ({
          id: o.id,
          label: o.label.trim(),
          note: o.note.trim() || null,
        })),
        anonymous,
        multi,
        hide_results: hideResults,
        followup_question: followup.trim() || null,
        followup_placeholder: placeholder.trim() || null,
        followup_anonymous: followupAnon,
        followup_visible: followupVisible,
        pinned,
        featured,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      };
      const saved = await savePulse(input, editing?.id ?? null);
      toast.success(editing ? "בדיקת הדופק עודכנה" : "בדיקת הדופק פורסמה");
      onSaved(saved);
      onClose();
    } catch {
      toast.error("הפרסום לא הושלם");
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({
    label,
    hint,
    value,
    onChange,
  }: {
    label: string;
    hint?: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-start justify-between gap-4 rounded-2xl border border-border/70 px-4 py-3 text-start transition-colors hover:border-primary/30"
    >
      <span className="min-w-0">
        <span className="block text-[13.5px] font-light text-foreground">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[11.5px] font-light leading-snug text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      <span
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          value ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`block h-4 w-4 translate-y-0.5 rounded-full bg-card transition-transform ${
            value ? "-translate-x-[2px]" : "-translate-x-[18px]"
          }`}
        />
      </span>
    </button>
  );

  const field =
    "w-full rounded-2xl border border-border bg-background px-4 py-3 text-[13.5px] font-light outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

  return (
    <ResponsiveDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <div dir="rtl" className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <p className="flex items-center gap-2 text-[14px] font-light text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            {editing ? "עריכת בדיקת דופק" : "בדיקת דופק חדשה"}
          </p>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
          <div className="space-y-1.5">
            <label className="text-[12px] font-light text-muted-foreground">השאלה</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="איפה אנחנו תופסות אותך?"
              className={field}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-light text-muted-foreground">מבוא קצר (לא חובה)</label>
            <textarea
              rows={2}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              className={`${field} resize-none`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-light text-muted-foreground">מרחב</label>
            <select value={space} onChange={(e) => setSpace(e.target.value as SpaceId)} className={field}>
              {SPACES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-light text-muted-foreground">אפשרויות תשובה</label>
            {options.map((o, i) => (
              <div key={o.id} className="rounded-2xl border border-border/70 p-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  <input
                    value={o.label}
                    onChange={(e) =>
                      setOptions((cur) =>
                        cur.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)),
                      )
                    }
                    placeholder={`אפשרות ${i + 1}`}
                    className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    onClick={() => move(i, -1)}
                    aria-label="העלאה"
                    className="rounded-full px-1.5 text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    aria-label="הורדה"
                    className="rounded-full px-1.5 text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setOptions((cur) => cur.filter((x) => x.id !== o.id))}
                    aria-label="הסרה"
                    className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={o.note}
                  onChange={(e) =>
                    setOptions((cur) =>
                      cur.map((x) => (x.id === o.id ? { ...x, note: e.target.value } : x)),
                    )
                  }
                  placeholder="הסבר קצר (לא חובה)"
                  className="mt-1.5 w-full bg-transparent ps-6 text-[12.5px] font-light outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            ))}
            <button
              onClick={() => setOptions((cur) => [...cur, newOption()])}
              className="inline-flex items-center gap-1.5 text-[13px] font-light text-primary transition-opacity hover:opacity-70"
            >
              <Plus className="h-3.5 w-3.5" /> הוספת אפשרות
            </button>
          </div>

          <div className="space-y-2">
            <Toggle
              label="הצבעה אנונימית"
              hint="אף אחת לא רואה מי בחרה מה"
              value={anonymous}
              onChange={setAnonymous}
            />
            <Toggle
              label="אפשר לבחור כמה תשובות"
              value={multi}
              onChange={setMulti}
            />
            <Toggle
              label="התוצאות נחשפות רק אחרי ההצבעה"
              value={hideResults}
              onChange={setHideResults}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-light text-muted-foreground">
              שאלת המשך בכתיבה חופשית (לא חובה)
            </label>
            <input
              value={followup}
              onChange={(e) => setFollowup(e.target.value)}
              placeholder="התחושה שלי, במילים שלי"
              className={field}
            />
            <input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="טקסט רמז בתוך תיבת הכתיבה"
              className={field}
            />
          </div>

          <div className="space-y-2">
            <Toggle label="הכתיבה אנונימית" value={followupAnon} onChange={setFollowupAnon} />
            <Toggle
              label="הכתיבה מוצגת לחברות הקהילה"
              hint="אחרי שהן מצביעות"
              value={followupVisible}
              onChange={setFollowupVisible}
            />
            <Toggle label="נעוץ למעלה במרחב" value={pinned} onChange={setPinned} />
            <Toggle label='מוצג גם ב״הכול״' value={featured} onChange={setFeatured} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-light text-muted-foreground">
              סגירה אוטומטית (לא חובה)
            </label>
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className={field}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-6 py-4">
          <button
            onClick={onClose}
            className="text-[13px] font-light text-muted-foreground transition-colors hover:text-foreground"
          >
            ביטול
          </button>
          <button
            onClick={publish}
            disabled={!valid || saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[13.5px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))] disabled:opacity-40"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {editing ? "שמירה" : "פרסום"}
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
