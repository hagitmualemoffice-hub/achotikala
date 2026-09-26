/**
 * "עדכונים ומאסטריות" — the quiet place where each woman decides what reaches
 * her from ליבה: per space, inside ליבה and by email, plus the spaces she chose
 * to be a מאסטרית of.
 */
import { useEffect, useMemo, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MasteritDialog } from "./Masterit";
import {
  EMAIL_FREQ_LABEL,
  emptyPref,
  fetchSpacePrefs,
  masteritModeLabel,
  setSpacePref,
  type EmailFreq,
  type SpacePref,
  type SpacePrefsState,
} from "./spacePrefs";
import { SPACES, spaceById, type SpaceId } from "./spaces";

const FREQS: EmailFreq[] = ["each", "daily", "weekly", "none"];

const SpaceUpdates = () => {
  const [state, setState] = useState<SpacePrefsState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<SpaceId | null>(null);

  useEffect(() => {
    let alive = true;
    fetchSpacePrefs()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState({ authorized: false, spaces: [] }));
    return () => {
      alive = false;
    };
  }, []);

  const prefOf = useMemo(
    () => (id: string) => state?.spaces.find((s) => s.space === id) ?? emptyPref(id),
    [state],
  );

  const patch = async (space: string, next: { inApp?: boolean; emailFreq?: EmailFreq }) => {
    setBusy(space);
    try {
      setState(await setSpacePref(space, next));
    } catch {
      toast.error("לא הצלחנו לשמור כרגע. אפשר לנסות שוב.");
    } finally {
      setBusy(null);
    }
  };

  const masterits: SpacePref[] = (state?.spaces ?? []).filter((s) => s.masterit);

  if (!state) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <section className="space-y-8">
      {/* --------------------------- המאסטריות שלי --------------------------- */}
      <div>
        <h3 className="text-[13px] tracking-[0.12em] text-muted-foreground">המאסטריות שלי</h3>

        <div className="mt-2 rounded-2xl bg-[hsl(var(--primary)/0.05)] p-4">
          <p className="text-[13px] font-light leading-relaxed text-foreground">
            מאסטרית היא אישה שאומרת: "בתחום הזה אני מכירה, ואשמח שיפנו אליי".
          </p>
          <p className="mt-2 text-[12.5px] font-light leading-relaxed text-muted-foreground">
            כשעולה שאלה חדשה במרחב שבחרת, מגיע אליך עדכון — בתוך ליבה או במייל, איך שנוח לך — כדי
            שתוכלי לענות אם יש לך מה לתרום. וזה משמעותי לשתי הכיוונים: מי שמפרסמת שאלה במרחב שיש בו
            מאסטריות יודעת שהדברים שלה לא נכתבים לריק — שיש כתובת אמיתית שמקבלת אותם. ואת, מצד שני,
            יכולה להיות בדיוק הידע שמישהי אחרת מחפשת ברגע הזה.
          </p>
          <p className="mt-2 text-[12.5px] font-light leading-relaxed text-muted-foreground">
            זה לא תפקיד ניהולי, לא נותן הרשאות מיוחדות, ואין שום התחייבות לענות. מי שמפרסמת רואה רק
            "יש כאן מי שמקשיבה" — בלי שמות. אפשר לשנות או להפסיק בכל רגע.
          </p>
        </div>

        <p className="mt-4 text-[12.5px] text-foreground">להיות מאסטרית במרחב:</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SPACES.filter((s) => !prefOf(s.id).masterit).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setEditing(s.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--primary)/0.08)] px-3 py-1.5 text-[12px] text-primary transition-opacity hover:opacity-80"
            >
              <Heart className="h-3 w-3" />
              {s.shortName}
            </button>
          ))}
          {SPACES.every((s) => prefOf(s.id).masterit) && (
            <span className="text-[12px] font-light text-muted-foreground">
              את מאסטרית בכל המרחבים 💗
            </span>
          )}
        </div>

        {masterits.length > 0 && (
          <div className="mt-4 grid gap-2.5 md:grid-cols-2">
            {masterits.map((p) => {
              const s = spaceById(p.space as SpaceId);
              const Icon = s.icon;
              return (
                <div key={p.space} className="rounded-2xl border border-[hsl(var(--primary)/0.18)] bg-[hsl(var(--primary)/0.05)] p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-[13.5px] text-foreground">{s.shortName}</span>
                    <span className="ms-auto inline-flex items-center gap-1 text-[12px] text-primary">
                      <Heart className="h-3 w-3" fill="currentColor" />
                      את מאסטרית כאן
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] font-light text-muted-foreground">
                    העדכונים שלך: {masteritModeLabel(p)}
                  </p>
                  <button
                    onClick={() => setEditing(p.space as SpaceId)}
                    className="mt-2.5 rounded-full bg-card px-4 py-1.5 text-[12.5px] text-primary shadow-sm transition-opacity hover:opacity-80"
                  >
                    שינוי או הפסקה
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------------------- העדכונים שלי ---------------------------- */}
      <div>
        <h3 className="text-[13px] tracking-[0.12em] text-muted-foreground">העדכונים שלי</h3>
        <p className="mt-1.5 text-[12px] font-light leading-relaxed text-muted-foreground">
          את בוחרת על מה לשמוע ואיך. בתוך ליבה זה סימון עדין בפעילות שלך, ובמייל את בוחרת אם לקבל
          כל פרסום, סיכום יומי, סיכום שבועי — או כלום.
        </p>

        <div className="mt-4 divide-y divide-border/60 rounded-2xl border border-border/60 bg-background">
          {SPACES.map((s) => {
            const p = prefOf(s.id);
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-[13.5px] text-foreground">{s.shortName}</span>
                {p.masterit && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary)/0.1)] px-2 py-0.5 text-[11px] text-primary">
                    <Heart className="h-3 w-3" fill="currentColor" />
                    מאסטרית
                  </span>
                )}
                {busy === s.id && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}

                <div className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button
                    type="button"
                    aria-pressed={p.in_app}
                    onClick={() => void patch(s.id, { inApp: !p.in_app })}
                    className="flex items-center gap-2 text-[12.5px] font-light text-muted-foreground"
                  >
                    עדכון בתוך ליבה
                    <span
                      className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                        p.in_app ? "bg-primary" : "bg-muted-foreground/25"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full bg-background transition-transform ${
                          p.in_app ? "-translate-x-4" : ""
                        }`}
                      />
                    </span>
                  </button>

                  <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12.5px] font-light text-muted-foreground">במייל:</span>
                    {FREQS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => void patch(s.id, { emailFreq: f })}
                        aria-pressed={p.email_freq === f}
                        className={`rounded-full px-2.5 py-1 text-[11.5px] transition-colors ${
                          p.email_freq === f
                            ? "bg-[hsl(var(--primary)/0.12)] text-primary"
                            : "bg-muted/60 font-light text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {EMAIL_FREQ_LABEL[f]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editing && (
        <MasteritDialog
          open
          onOpenChange={(v) => !v && setEditing(null)}
          space={spaceById(editing)}
          pref={prefOf(editing)}
          onChanged={setState}
        />
      )}
    </section>
  );
};

export default SpaceUpdates;
