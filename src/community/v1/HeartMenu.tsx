/**
 * 💗 הלב שלי בליבה — in the header.
 *
 * A small, always-visible button (heart icon + her heart count) that opens a
 * warm panel: where her heart stands, how many hearts she has, what she is a
 * מאסטרית in, and a gentle "אלופה" note. Never a ranking, never a comparison.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, Settings2, Sparkles, Trophy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { emptyHearts, heartsToNext, levelProgress, type HeartsState } from "./hearts";
import { myHearts } from "./api";
import { fetchSpacePrefs, masteritModeLabel, type SpacePref } from "./spacePrefs";
import { SPACES } from "./spaces";

const POLL_MS = 120_000;

const spaceName = (id: string) => SPACES.find((s) => s.id === id)?.name ?? id;

/** She is an אלופה when she carries a space for the others, or her heart is already פועם. */
const championLine = (hearts: HeartsState, masteries: SpacePref[]) => {
  if (masteries.length >= 2) return `את אלופה — מאסטרית ב-${masteries.length} מרחבים 🏆`;
  if (masteries.length === 1) return `את אלופה — מאסטרית ב"${spaceName(masteries[0].space)}" 🏆`;
  if (hearts.hearts >= 200) return "את אלופה — הלב שלך פועם כאן חזק 🏆";
  return null;
};

const HeartMenu = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hearts, setHearts] = useState<HeartsState>(emptyHearts());
  const [masteries, setMasteries] = useState<SpacePref[]>([]);

  const load = useCallback(async () => {
    try {
      setHearts(await myHearts());
    } catch {
      /* quiet */
    }
    try {
      const prefs = await fetchSpacePrefs();
      setMasteries(prefs.spaces.filter((s) => s.masterit));
    } catch {
      /* quiet */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  const pct = Math.round(levelProgress(hearts) * 100);
  const left = heartsToNext(hearts);
  const champion = championLine(hearts, masteries);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-1 transition-opacity hover:opacity-80"
          aria-label="הלב שלי בליבה"
          title="הלב שלי בליבה"
        >
          <Heart className="h-[18px] w-[18px] text-primary" strokeWidth={2} />
          <span className="text-[13px] font-medium text-primary">{hearts.hearts}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[19rem] rounded-3xl p-0">
        <div className="relative overflow-hidden rounded-3xl">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/[0.14] blur-3xl" />

          <div className="relative z-10 p-4">
            {/* level + count */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10.5px] font-semibold tracking-wider text-primary/80">
                  הלב שלי בליבה
                </span>
                <h4 className="mt-0.5 text-[18px] font-normal leading-tight text-foreground">
                  {hearts.level?.emoji} {hearts.level?.label}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.07] px-3 py-1.5">
                <Heart className="h-4 w-4 text-primary" strokeWidth={2} />
                <span className="text-[15px] font-semibold text-primary">{hearts.hearts}</span>
              </div>
            </div>

            {/* progress */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-end justify-between">
                <span className="text-[12px] font-medium text-primary">
                  {hearts.next
                    ? `עוד ${left} לבבות ל"${hearts.next.label}"`
                    : "הלב שלך כאן במלוא הפעימה"}
                </span>
                <span className="text-[12px] font-semibold text-foreground/70">{pct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/70 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-primary to-primary-glow transition-[width] duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* champion note */}
            {champion && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-primary/15 bg-primary/[0.06] p-3">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-[12.5px] font-medium leading-relaxed text-foreground/85">
                  {champion}
                </p>
              </div>
            )}

            {/* masteries */}
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
                המאסטריות שלי
              </p>
              {masteries.length ? (
                <ul className="space-y-1.5">
                  {masteries.map((m) => (
                    <li
                      key={m.space}
                      className="rounded-2xl bg-card/70 px-3 py-2 text-[12.5px] font-light"
                    >
                      <span className="font-medium text-foreground/90">{spaceName(m.space)}</span>
                      <span className="block text-[11.5px] text-muted-foreground">
                        {masteritModeLabel(m)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.04] p-3">
                  <p className="flex items-center gap-1.5 text-[12.5px] text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    עוד לא בחרת מאסטריות
                  </p>
                  <p className="mt-1 text-[11.5px] font-light leading-relaxed text-muted-foreground">
                    מאסטרית היא מי שנמצאת שם בשביל אחרות במרחב שהיא מבינה בו.
                  </p>
                </div>
              )}
            </div>

            {/* actions */}
            <div className="mt-4 space-y-1">
              <button
                onClick={() => go("/liba?settings=updates")}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] text-foreground transition-colors hover:bg-primary/[0.08] hover:text-primary"
              >
                <Settings2 className="h-3.5 w-3.5" />
                {masteries.length ? "לעדכן את המאסטריות שלי" : "להגדיר מאסטריות"}
                <ChevronLeft className="ms-auto h-3.5 w-3.5 opacity-60" />
              </button>
              <button
                onClick={() => go("/liba?settings=heart")}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] text-foreground transition-colors hover:bg-primary/[0.08] hover:text-primary"
              >
                <Heart className="h-3.5 w-3.5" strokeWidth={2} />
                לכל הפרטים על הלב שלי
                <ChevronLeft className="ms-auto h-3.5 w-3.5 opacity-60" />
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default HeartMenu;
