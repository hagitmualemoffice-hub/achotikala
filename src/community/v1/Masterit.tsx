/**
 * "מאסטרית" — a warm, quiet way to say: יש לי ניסיון כאן, ואני מוכנה שיפנו אליי.
 *
 * Not an admin role and not a title: choosing it only means new questions in
 * that space will reach her, in the way she picked.
 */
import { useEffect, useState } from "react";
import { Heart, HeartHandshake, Loader2, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import {
  MASTERIT_MODES,
  masteritMode,
  masteritModeLabel,
  setMasterit,
  type MasteritMode,
  type SpacePref,
  type SpacePrefsState,
} from "./spacePrefs";
import type { CommunitySpace } from "./spaces";

type Props = {
  space: CommunitySpace;
  pref: SpacePref;
  onChanged: (next: SpacePrefsState) => void;
};

const Chip = ({
  active,
  onClick,
  label,
  note,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  note: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`w-full rounded-2xl border px-4 py-3 text-start transition-colors ${
      active
        ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.08)]"
        : "border-border/70 bg-background hover:border-border"
    }`}
  >
    <span className={`block text-[13.5px] ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
    <span className="mt-0.5 block text-[11.5px] font-light text-muted-foreground">{note}</span>
  </button>
);

/** The join / edit panel, opened from a space or from the settings tab. */
export const MasteritDialog = ({
  open,
  onOpenChange,
  space,
  pref,
  onChanged,
}: Props & { open: boolean; onOpenChange: (v: boolean) => void }) => {
  // New מאסטריות default to email updates, so the asker always has a real
  // address that actually receives her question.
  const [mode, setMode] = useState<MasteritMode>(
    pref.masterit ? masteritMode(pref) : "each_both",
  );
  const [saving, setSaving] = useState(false);
  const [joined, setJoined] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      onChanged(await setMasterit(space.id, true, mode));
      if (pref.masterit) {
        toast.success("העדכונים שלך במרחב עודכנו 💗");
        onOpenChange(false);
      } else {
        setJoined(true);
      }
    } catch {
      toast.error("לא הצלחנו לשמור כרגע. אפשר לנסות שוב.");
    } finally {
      setSaving(false);
    }
  };

  const stop = async () => {
    setSaving(true);
    try {
      onChanged(await setMasterit(space.id, false));
      toast.success(`הפסקת להיות מאסטרית ב${space.shortName}`);
      onOpenChange(false);
    } catch {
      toast.error("לא הצלחנו לשמור כרגע. אפשר לנסות שוב.");
    } finally {
      setSaving(false);
    }
  };

  const chosen = MASTERIT_MODES.find((m) => m.key === mode);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setJoined(false);
      }}
      contentClassName="max-w-md"
    >
      <div dir="rtl" className="flex min-h-0 flex-1 flex-col">
        {joined ? (
          <div className="flex min-h-0 flex-1 flex-col text-start">
            <div className="popup-scroll space-y-4 p-6">
            <p className="text-[20px] font-light text-foreground">
              את מאסטרית ב{space.shortName} <Heart className="inline h-4 w-4 text-primary" fill="currentColor" />
            </p>
            <p className="text-[13.5px] font-light leading-relaxed text-muted-foreground">
              מעכשיו, כשמישהי תכתוב כאן שאלה חדשה, נדאג שתדעי.
              <br />
              הניסיון שלך יכול להיות בדיוק הדבר שמישהי אחרת צריכה ברגע הזה.
            </p>
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="text-[12px] tracking-[0.1em] text-muted-foreground">איך נעדכן אותך</p>
              <p className="mt-1 text-[13.5px] text-foreground">
                {chosen ? `${chosen.label} · ${chosen.note}` : ""}
              </p>
            </div>
            </div>
            <div className="popup-footer flex flex-wrap gap-2 px-6 py-4">
              <button
                onClick={() => setJoined(false)}
                className="rounded-full bg-muted px-4 py-2 text-[13px] font-light text-foreground transition-colors hover:bg-muted/70"
              >
                שינוי הגדרות
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-full bg-primary px-5 py-2 text-[13px] text-primary-foreground transition-opacity hover:opacity-90"
              >
                סגירה
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col text-start">
            <div className="popup-scroll space-y-4 p-6">
            <p className="text-[20px] font-light text-foreground">להיות מאסטרית ב{space.shortName}</p>
            <p className="text-[13.5px] font-light leading-relaxed text-muted-foreground">
              יש לך ניסיון שיכול לעזור לאחרות. כמאסטרית, נדאג שתדעי כשעולה כאן שאלה חדשה, כדי שתוכלי
              לקפוץ פנימה כשיש לך מה לתרום.
              <br />
              וזה משמעותי באמת: מי שמפרסמת שאלה יודעת שהדברים שלה לא נכתבים לריק — שיש כתובת אמיתית
              שמקבלת אותם. אין התחייבות לענות על כל שאלה. את פשוט עוזרת לנו לוודא שבקשות מגיעות גם
              לנשים שמכירות את התחום.
            </p>

            <div className="space-y-2 pt-1">
              <p className="text-[13px] text-foreground">איך תרצי שנעדכן אותך?</p>
              {MASTERIT_MODES.map((m) => (
                <Chip
                  key={m.key}
                  active={mode === m.key}
                  onClick={() => setMode(m.key)}
                  label={m.label}
                  note={m.note}
                />
              ))}
            </div>

            </div>
            <div className="popup-footer flex flex-wrap items-center gap-2 px-6 py-4">
              <button
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13.5px] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {pref.masterit ? "שמירה" : "אני רוצה להיות מאסטרית"}
              </button>
              {pref.masterit && (
                <button
                  onClick={() => void stop()}
                  disabled={saving}
                  className="rounded-full px-4 py-2.5 text-[13px] font-light text-muted-foreground transition-colors hover:text-destructive"
                >
                  הפסקת מאסטרית
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
};

/**
 * The small invitation / status line inside a space, plus the gentle
 * "יש כאן מי שמקשיבה" for whoever comes to ask.
 */
export const MasteritStrip = ({ space, pref, onChanged }: Props) => {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const listeners = pref.masterit_count;

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(`achotikala:masterit-strip:${space.id}`) === "1");
    } catch {
      // ignore
    }
  }, [space.id]);

  const dismiss = () => {
    try {
      localStorage.setItem(`achotikala:masterit-strip:${space.id}`, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-[hsl(var(--primary)/0.05)] px-4 py-3">
        {pref.masterit ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-primary">
              <Heart className="h-3.5 w-3.5" fill="currentColor" />
              את מאסטרית כאן
            </span>
            <span className="text-[12.5px] font-light text-muted-foreground">
              {masteritModeLabel(pref)}
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground">
              <HeartHandshake className="h-3.5 w-3.5 text-primary" />
              יש לך ניסיון ב{space.shortName}?
            </span>
            <span className="text-[12.5px] font-light text-muted-foreground">
              הפכי למאסטרית של המרחב ועזרי לשאלות להגיע למישהי שיודעת.
            </span>
          </>
        )}

        <div className="ms-auto flex items-center gap-1.5">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[12.5px] text-primary shadow-sm transition-opacity hover:opacity-80"
          >
            {pref.masterit ? <Settings2 className="h-3.5 w-3.5" /> : null}
            {pref.masterit ? "הגדרות" : "אני רוצה להיות מאסטרית"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="סגור"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-[hsl(var(--primary)/0.1)] hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {listeners > 0 && (
        <p className="mb-4 -mt-2 text-[12px] font-light text-muted-foreground">
          יש כאן מי שמקשיבה 💗{" "}
          {listeners === 1
            ? "מאסטרית אחת מקשיבה למרחב הזה"
            : `${listeners} מאסטריות מקשיבות למרחב הזה`}{" "}
          — הן יקבלו עדכון על השאלה שלך.
        </p>
      )}

      <MasteritDialog
        open={open}
        onOpenChange={setOpen}
        space={space}
        pref={pref}
        onChanged={onChanged}
      />
    </>
  );
};
