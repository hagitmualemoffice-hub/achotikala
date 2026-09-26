/**
 * 💗 הלב שלי בליבה
 *
 * A quiet, warm corner of the personal area. It shows how her heart in Liba has
 * grown — never a score, never a ranking, never a comparison with anyone else.
 */
import { useState } from "react";
import { ChevronDown, Heart, Sparkles } from "lucide-react";
import { heartsToNext, levelProgress, type HeartsState } from "./hearts";

const HeartsHelp = ({ state }: { state: HeartsState }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[12px] font-light text-muted-foreground transition-colors hover:text-foreground"
      >
        איך הלבבות עובדים?
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2 rounded-2xl bg-card/70 p-4">
          <p className="text-[12.5px] font-light leading-relaxed text-muted-foreground">
            בליבה, הלבבות גדלים בעיקר כשאנחנו נמצאות אחת בשביל השנייה.
          </p>
          <ul className="space-y-1.5">
            {state.rules.map((r) => (
              <li
                key={r.action}
                className="flex items-center justify-between gap-3 text-[12.5px] font-light"
              >
                <span className="text-foreground/80">{r.label}</span>
                <span className={r.hearts ? "text-primary" : "text-muted-foreground/70"}>
                  {r.hearts ? `+${r.hearts}` : "לא מוסיף לבבות"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/** The heart itself: current stage, how many hearts, and what is gently ahead. */
export const MyHeartCard = ({ state }: { state: HeartsState }) => {
  const pct = Math.round(levelProgress(state) * 100);
  const left = heartsToNext(state);

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-card p-6 shadow-[var(--shadow-card)]">
      {/* soft decorative glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/[0.12] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-primary-glow/[0.10] blur-3xl" />

      <div className="relative z-10">
        {/* top header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <span className="mb-1 text-[11px] font-semibold tracking-wider text-primary/80">
              הרמה שלי בליבה
            </span>
            <h3 className="text-[26px] font-normal leading-tight text-foreground">
              {state.level?.emoji} {state.level?.label}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.07] px-3.5 py-2 shadow-sm">
            <Heart className="h-5 w-5 text-primary" strokeWidth={2} />
            <span className="text-[17px] font-semibold text-primary">{state.hearts}</span>
          </div>
        </div>

        {/* center heart */}
        <div className="mt-6 flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/25 blur-2xl" />
            <span
              className="relative flex h-28 w-28 items-center justify-center text-[84px] leading-none drop-shadow-[0_10px_18px_hsl(var(--primary)/0.28)]"
              role="img"
              aria-label={state.level?.label}
            >
              {state.level?.emoji ?? "♡"}
            </span>
          </div>
          <p className="mt-5 max-w-[18rem] text-center text-[13.5px] font-light leading-relaxed text-muted-foreground">
            הלב שלך גדל עם כל תרומה, שיתוף ומילה טובה בקהילה שלנו.
          </p>
        </div>

        {/* progress */}
        <div className="mt-6">
          <div className="mb-2 flex items-end justify-between px-0.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-muted-foreground/80">היעד הבא</span>
              <span className="text-[12.5px] font-medium text-primary">
                {state.next
                  ? `עוד ${left} לבבות ל"${state.next.label}"`
                  : "הלב שלך כאן במלוא הפעימה"}
              </span>
            </div>
            <span className="text-[13px] font-semibold text-foreground/80">{pct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted/70 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-l from-primary to-primary-glow transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* all the levels — what they are and what it takes to reach each */}
        <div className="mt-6 rounded-2xl bg-card/70 p-4">
          <p className="mb-2.5 text-[11px] font-semibold tracking-wider text-primary/80">
            הדרגות בלב של ליבה
          </p>
          <ul className="space-y-2">
            {state.levels.map((lvl) => {
              const reached = state.hearts >= lvl.min;
              const isCurrent = state.level?.key === lvl.key;
              const missing = lvl.min - state.hearts;
              return (
                <li
                  key={lvl.key}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[12.5px] ${
                    isCurrent
                      ? "bg-primary/[0.08] ring-1 ring-primary/20"
                      : reached
                        ? "bg-transparent"
                        : "bg-transparent opacity-75"
                  }`}
                >
                  <span className="flex items-center gap-2 font-light text-foreground/85">
                    <span>{lvl.emoji}</span>
                    <span className={isCurrent ? "font-medium text-foreground" : ""}>{lvl.label}</span>
                    {isCurrent && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        את כאן
                      </span>
                    )}
                  </span>
                  <span className="text-[11.5px] font-light text-muted-foreground">
                    {reached ? (
                      <span className="text-primary">הגעת ✓</span>
                    ) : (
                      `עוד ${missing} לבבות`
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2.5 text-[11px] font-light text-muted-foreground/80">
            הלב גדל דרך פעילות בקהילה — פרסום, תגובות, עזרה לאחרות וכניסה יומית.
          </p>
        </div>

        <HeartsHelp state={state} />
      </div>
    </section>
  );
};

/** A warm nudge for a woman who has not told us anything about herself yet. */
export const AboutInvitation = ({ hearts }: { hearts: number }) => (
  <div className="relative overflow-hidden rounded-[1.75rem] border border-dashed border-primary/25 bg-primary/[0.04] p-5">
    <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-primary/[0.08] blur-2xl" />
    <div className="relative z-10">
      <p className="flex items-center gap-2 text-[15px] text-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        תני לנו להכיר אותך קצת 💗
      </p>
      <p className="mt-2 text-[12.5px] font-light leading-relaxed text-muted-foreground">
        ספרי מי את, מה את אוהבת, במה את עוסקת ואיפה אפשר להיעזר בך.
      </p>
      <p className="mt-2.5 text-[12.5px] font-medium text-primary">+{hearts} לבבות בהשלמת הפרופיל</p>
    </div>
  </div>
);

export default MyHeartCard;
