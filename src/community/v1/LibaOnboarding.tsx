import IdentityPostingNotice from "./IdentityPostingNotice";
import { useIdentityExperiment } from "./identityExperiment";
/**
 * "ליבה, נעים להכיר" — ההיכרות וההתאמה האישית של ליבה.
 *
 * זו לא מערכת העדפות חדשה: התחומים נשמרים על הפרופיל, "על מה לעדכן אותי" כותב
 * להעדפות המרחבים הקיימות, ההתראות על בירורים ודירות כותבות ל-notify_prefs
 * הקיימות, והמאסטריות מדליקות את המנגנון הקיים.
 *
 * ההיכרות מגורסאית: כל חברה — גם ותיקה — רואה את הגרסה החדשה פעם אחת.
 * התקנון עצמו נשאר במסך שלו ולא נוגעים בו; ההיכרות מחכה עד שהוא אושר.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Heart,
  Loader2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SPACES, accentBg, accentColor, spaceById } from "./spaces";
import type { SpaceId } from "./spaces";
import { fetchSpacePrefs, setMasterit, setSpacePref, type EmailFreq, type SpacePref } from "./spacePrefs";
import { avatarColor, avatarInitials } from "./Avatar";
import { myHearts, updateProfile, type NotifyPrefs } from "./api";
import { emptyHearts, type HeartsState } from "./hearts";
import obChat from "@/assets/onboarding/chat.webp";
import obIdentity from "@/assets/onboarding/identity.webp";
import obHearts from "@/assets/onboarding/hearts.webp";
import obMasterit from "@/assets/onboarding/masterit.webp";
import obEcosystem from "@/assets/onboarding/ecosystem.webp";

/** גרסת ההיכרות הנוכחית — העלאה שלה מציגה אותה מחדש לכולן, פעם אחת. */
const ONBOARDING_VERSION = 3;

type State = {
  authorized: boolean;
  needs_onboarding?: boolean;
  has_agreement?: boolean;
};

const rpc = async <T,>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data as T;
};

/* --------------------------------- pieces --------------------------------- */

const Chip = ({
  id,
  label,
  on,
  onClick,
}: {
  id: string;
  label: string;
  on: boolean;
  onClick: () => void;
}) => {
  const s = spaceById(id as SpaceId);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] transition-all ${
        on ? "font-normal" : "border border-border font-light text-foreground/85 hover:bg-muted/70"
      }`}
      style={on ? { backgroundColor: accentBg(s, 0.18), color: accentColor(s) } : undefined}
    >
      {on && <Check className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
};

const Switch = ({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onToggle}
    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3 text-right transition-colors hover:bg-muted/50"
  >
    <span className="text-[13.5px] font-light leading-relaxed text-foreground/90">{label}</span>
    <span
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-muted-foreground/25"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${
          on ? "right-0.5" : "right-4"
        }`}
      />
    </span>
  </button>
);

/** שלב היכרות אחד — איור חמוד במרכז למעלה, כותרת ותוכן. */
const Slide = ({
  img,
  title,
  children,
}: {
  img: string;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex justify-center">
      <img
        src={img}
        alt=""
        loading="lazy"
        width={640}
        height={512}
        className="h-36 w-auto rounded-3xl object-contain sm:h-44 md:h-52"
      />
    </div>
    <p className="mt-3 text-center text-[19px] font-light text-foreground sm:mt-5">{title}</p>
    <div className="mt-3">{children}</div>
  </div>
);

/** קטע בהיכרות — הרעיון גלוי, וההרחבה נפתחת רק למי שרוצה. */
const Reveal = ({
  title,
  children,
  label = "רוצה לדעת עוד",
}: {
  title: string;
  children: React.ReactNode;
  label?: string;
}) => {
  const { allowNickname } = useIdentityExperiment();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="text-[15px] font-normal text-foreground">{title}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-light text-primary"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 text-[13px] font-light leading-relaxed text-muted-foreground">{children}</div>
      )}
    </div>
  );
};

/**
 * הדגמה בלבד — אישה בדיונית, בלי שיחה אמיתית, בלי הודעה ובלי שמירה בשרת.
 * הדפוס זהה לזה שהיא תפגוש בליבה: לוחצים על התמונה ונפתחת האפשרות לשיחה.
 */
const ChatDemo = () => {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const name = "תמר";
  return (
    <div className="rounded-3xl border border-border/60 bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStage(stage === 0 ? 1 : stage)}
          aria-label="הדגמה"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[15px] text-white transition-transform hover:scale-105"
          style={{ backgroundColor: avatarColor("demo-tamar") }}
        >
          {avatarInitials(name)}
        </button>
        <div className="min-w-0">
          <p className="text-[14px] text-foreground">{name}</p>
          <p className="text-[12px] font-light text-muted-foreground">מאסטרית בפיננסים · הדגמה</p>
        </div>
      </div>

      {stage === 0 && (
        <p className="mt-3 text-[12.5px] font-light text-primary">נסי ללחוץ על התמונה שלה</p>
      )}

      {stage === 1 && (
        <div className="mt-3 rounded-2xl border border-border/60 bg-card p-3">
          <p className="text-[12.5px] font-light text-muted-foreground">
            ככה נראה הכרטיס שלה בליבה:
          </p>
          <Button
            className="mt-2 h-9 rounded-full px-4 text-[13px] font-light"
            onClick={() => setStage(2)}
          >
            <MessageCircle className="me-1.5 h-3.5 w-3.5" />
            התחילי שיחה
          </Button>
        </div>
      )}

      {stage === 2 && (
        <p className="mt-3 rounded-2xl bg-accent/50 p-3 text-[13px] font-light leading-relaxed text-accent-foreground">
          בדיוק ככה ❤️
          <br />
          מכל מקום בליבה תוכלי להגיע לשיחה אישית.
        </p>
      )}
    </div>
  );
};

/** הדגמה של בחירת הזהות — בלי לפרסם דבר. */
const IdentityDemo = ({ name }: { name: string }) => {
  const { allowNickname } = useIdentityExperiment();
  const [as, setAs] = useState<"name" | "nick">("name");
  if (!allowNickname) return <IdentityPostingNotice />;
  return (
    <div className="inline-flex rounded-full border border-border/70 p-1">
      {(
        [
          ["name", `בשמי${name ? ` — ${name}` : ""}`],
          ["nick", "בניק שלי"],
        ] as const
      ).map(([k, l]) => (
        <button
          key={k}
          type="button"
          onClick={() => setAs(k)}
          className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
            as === k ? "bg-primary text-primary-foreground" : "font-light text-muted-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
};

const FREQ: { key: EmailFreq; label: string }[] = [
  { key: "each", label: "בכל פעם שמתפרסם משהו" },
  { key: "daily", label: "סיכום אחד ביום" },
  { key: "weekly", label: "סיכום אחד בשבוע" },
  { key: "none", label: "רק בתוך ליבה, בלי מייל" },
];

const ECOSYSTEM = [
  "שיחות ודיונים",
  "ידע מהקהילה",
  "מאסטריות",
  "צ׳אט אישי",
  "בירורים",
  "דירות",
  "שמורים",
  "כלים מהקהילה",
];

/* ------------------------------- the flow -------------------------------- */

const LibaOnboarding = ({
  blocked = false,
  displayName = "",
  notifyPrefs,
}: {
  /** נכון כל עוד התקנון עוד לא אושר — ההיכרות מחכה בשקט */
  blocked?: boolean;
  displayName?: string;
  notifyPrefs?: NotifyPrefs;
}) => {
  const [open, setOpen] = useState(false);
  const [returning, setReturning] = useState(false);
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<SpacePref[]>([]);
  const [hearts, setHearts] = useState<HeartsState>(() => emptyHearts());

  const [interests, setInterests] = useState<string[]>([]);
  const [updates, setUpdates] = useState<string[]>([]);
  const [freq, setFreq] = useState<EmailFreq>("none");
  const [notify, setNotify] = useState<NotifyPrefs>({});
  const [mastery, setMastery] = useState<string[]>([]);
  const [about, setAbout] = useState({ area: "", work: "", loves: "", help: "" });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (blocked) return;
    let alive = true;
    (async () => {
      try {
        const st = await rpc<State>("community_onboarding_state");
        if (!alive || !st?.authorized || !st.needs_onboarding) return;
        setReturning(!!st.has_agreement);
        const [p, h] = await Promise.all([
          fetchSpacePrefs().catch(() => null),
          myHearts().catch(() => null),
        ]);
        if (!alive) return;
        if (p) setPrefs(p.spaces);
        if (h) setHearts(h);
        setOpen(true);
      } catch {
        /* quiet — never block the way in */
      }
    })();
    return () => {
      alive = false;
    };
  }, [blocked]);

  useEffect(() => {
    if (notifyPrefs) setNotify((n) => ({ ...notifyPrefs, ...n }));
  }, [notifyPrefs]);

  const spaces = useMemo(() => {
    const known = SPACES.map((s) => s.id as string);
    const extra = prefs.map((p) => String(p.space)).filter((s) => !known.includes(s));
    return [...known, ...extra];
  }, [prefs]);

  const toggle = (list: string[], set: (v: string[]) => void, id: string, max?: number) => {
    if (list.includes(id)) return set(list.filter((x) => x !== id));
    if (max && list.length >= max) return;
    set([...list, id]);
  };

  const label = (id: string) => spaceById(id as SpaceId).shortName || id;
  const aboutFilled = Object.values(about).some((v) => v.trim().length > 0);

  const savedMastery = useRef<string[]>([]);
  const savedUpdates = useRef<string[]>([]);

  const writeChoices = async () => {
    for (const s of updates) await setSpacePref(s, { inApp: true, emailFreq: freq });
    for (const s of savedUpdates.current.filter((s) => !updates.includes(s)))
      await setSpacePref(s, { inApp: false, emailFreq: "none" });
    savedUpdates.current = updates;

    for (const s of mastery) await setMasterit(s, true, "each_app");
    for (const s of savedMastery.current.filter((s) => !mastery.includes(s)))
      await setMasterit(s, false, "each_app");
    savedMastery.current = mastery;

    if (Object.keys(notify).length || aboutFilled) {
      await updateProfile({
        notifyPrefs: Object.keys(notify).length ? notify : undefined,
        about: aboutFilled
          ? {
              area: about.area || null,
              work: about.work || null,
              loves: about.loves || null,
              help: about.help || null,
            }
          : undefined,
      });
    }
  };

  // שומרת את מה שנבחר עד כה — גם בהתקדמות בין השלבים, וגם ביציאה באמצע
  const saveAll = async (mode: "progress" | "done" | "skip") => {
    // First persist the actual choices. Only after every write succeeds may the
    // onboarding be marked complete, otherwise a failed preference write would
    // hide the flow even though the woman was told that saving failed.
    await writeChoices();
    await rpc("community_save_onboarding", {
      _interests: interests,
      _done: mode === "done",
      _skipped: mode === "skip",
      _version: mode === "progress" ? null : ONBOARDING_VERSION,
    });
  };

  const advance = (to: number) => {
    setStep(to);
    void saveAll("progress").catch(() => {
      /* quiet — נשמר שוב בשלב הבא או בסיום */
    });
  };

  const persist = async () => {
    setBusy(true);
    try {
      await saveAll("done");
      setSaved(true);
      setStep(11);
    } catch {
      toast.error("לא הצלחנו לשמור את הבחירות. אפשר לנסות שוב מההגדרות.");
    } finally {
      setBusy(false);
    }
  };

  const close = async (mode: "done" | "skip") => {
    setOpen(false);
    if (saved) return;
    try {
      await saveAll(mode);
    } catch {
      /* quiet — הכול נשאר זמין בהגדרות */
    }
  };


  const Nav = ({
    next,
    nextLabel = "הלאה",
    back,
  }: {
    next: () => void;
    nextLabel?: string;
    back?: () => void;
  }) => (
    <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex items-center gap-1.5 border-t border-border/40 bg-card/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm md:static md:mx-0 md:mt-7 md:gap-2 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
      <Button className="rounded-full px-6 font-light" onClick={next}>
        {nextLabel}
      </Button>
      {back ? (
        <Button variant="ghost" className="rounded-full font-light" onClick={back}>
          חזרה
        </Button>
      ) : null}
      <Button
        variant="ghost"
        className="rounded-full font-light text-muted-foreground"
        onClick={() => void close("skip")}
      >
        אחר כך
      </Button>
    </div>
  );

  const heartRules = hearts.rules.filter((r) => r.hearts > 0);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) void close("skip");
      }}
      desktopContentClassName="max-w-2xl"
    >
      <div
        dir="rtl"
        className="popup-scroll animate-in fade-in px-5 pb-6 pt-4 duration-300 md:px-12 md:pb-10 md:pt-10"
      >
        {/* 0 — פתיחה */}
        {step === 0 && (
          <>
            <Heart className="h-7 w-7 text-primary" fill="currentColor" strokeWidth={1.2} />
            <p className="mt-4 text-[24px] font-light leading-snug text-foreground">
              {returning ? "ליבה התחדשה ❤️" : "ליבה, נעים להכיר ❤️"}
            </p>
            <p className="mt-3 text-[14.5px] font-light leading-relaxed text-muted-foreground">
              {returning
                ? "הוספנו לליבה כמה דברים חדשים שיעזרו לך להכיר, להתייעץ, לקבל בדיוק את העדכונים שמתאימים לך וגם להיות שם בשביל אחרות."
                : "יש כאן כמה דברים שבנינו במיוחד כדי שיהיה לך קל יותר להכיר, לשאול, להתייעץ וגם להיות שם בשביל אחרות."}
            </p>
            <p className="mt-4 text-[15px] font-light text-foreground">תרצי שנכיר לך קצת יותר?</p>
            <Nav next={() => setStep(1)} nextLabel={returning ? "כן, תכירי לי" : "בואי נכיר"} />
          </>
        )}

        {/* 1 — אפשר לדבר גם אחת על אחת */}
        {step === 1 && (
          <>
            <Slide img={obChat} title="אפשר לדבר גם אחת על אחת">
              <p className="text-[13.5px] font-light leading-relaxed text-muted-foreground">
                ראית מישהי שמעניין אותך להכיר או להמשיך איתה שיחה? לחצי על התמונה שלה ובחרי
                ״התחילי שיחה״. מכאן תוכלו להמשיך בצ׳אט פרטי ביניכן.
              </p>
              <div className="mt-3">
                <ChatDemo />
              </div>
            </Slide>
            <Nav next={() => setStep(2)} nextLabel="הבנתי" back={() => setStep(0)} />
          </>
        )}

        {/* 2 — את בוחרת איך להופיע */}
        {step === 2 && (
          <>
            <Slide img={obIdentity} title={allowNickname ? "את בוחרת איך להופיע" : "בתקופה הקרובה כותבות בשם מלא"}>
              <p className="text-[13.5px] font-light leading-relaxed text-muted-foreground">
                {allowNickname ? "בכל פעם שאת כותבת בליבה, תוכלי לבחור אם לכתוב בשם שלך או בניק הקבוע שלך." : "במסגרת הניסוי הזמני, פוסטים ותגובות חדשים יופיעו בשם המלא שלך."}
              </p>
              <div className="mt-3">
                <IdentityDemo name={displayName} />
              </div>
              <p className="mt-3 text-[13px] font-light leading-relaxed text-muted-foreground">
                וכשמתאים לך, נשמח לפגוש גם את השם שלך ❤️ ליבה נעשית קרובה יותר כשאנחנו מתחילות
                להכיר את הנשים שמאחורי המילים.
              </p>
            </Slide>
            <Nav next={() => setStep(3)} nextLabel="הבנתי" back={() => setStep(1)} />
          </>
        )}

        {/* 3 — הלבבות של ליבה */}
        {step === 3 && (
          <>
            <Slide img={obHearts} title="הלבבות של ליבה ❤️">
              <p className="text-[13.5px] font-light leading-relaxed text-muted-foreground">
                כשאת משתתפת, עוזרת, משתפת ונוכחת בליבה, את יכולה לקבל לבבות. הלבבות הם הדרך שלנו
                להגיד: ראינו אותך. היית כאן. הוספת משהו למרחב. והם גם מקדמים אותך בדרך ל״לב
                נוכח״.
              </p>
              <div className="mt-2">
                <Reveal title="" label="איך מקבלים לבבות?">
                  <ul className="space-y-1">
                    {heartRules.map((r) => (
                      <li key={r.action} className="flex items-center justify-between gap-3">
                        <span>{r.label}</span>
                        <span className="shrink-0 text-foreground/70">{r.hearts}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[12.5px]">
                    {hearts.levels.map((l) => `${l.emoji} ${l.label}`).join(" · ")}
                  </p>
                </Reveal>
              </div>
            </Slide>
            <Nav next={() => setStep(4)} nextLabel="הבנתי" back={() => setStep(2)} />
          </>
        )}

        {/* 4 — מאסטריות */}
        {step === 4 && (
          <>
            <Slide img={obMasterit} title="ויש כאן גם מאסטריות">
              <p className="text-[13.5px] font-light leading-relaxed text-muted-foreground">
                מאסטריות הן נשים שבחרו להיות כתובת בתחום שהן מכירות היטב. יצרנו את זה כדי שכשאת
                שואלת שאלה, לא תצטרכי רק לקוות שמישהי מתאימה תראה אותה.
              </p>
              <div className="mt-2">
                <Reveal title="" label="מה זה אומר להיות מאסטרית?">
                  מאסטרית היא לא בהכרח בעלת תעודה. היא יכולה להיות מקצועית בתחום, מנוסה בו, מכירה
                  אותו מקרוב או פשוט עברה אותו בעצמה. כך אפשר להפנות שאלות גם לנשים שמכירות את
                  התחום — והמאסטרית מצידה יכולה להיות שם בדיוק במקומות שבהם יש לה מה לתת, בלי
                  לעקוב אחרי כל המרחב.
                </Reveal>
              </div>
            </Slide>
            <Nav next={() => setStep(5)} nextLabel="הבנתי" back={() => setStep(3)} />
          </>
        )}

        {/* 5 — מה תמצאי בליבה */}
        {step === 5 && (
          <>
            <Slide img={obEcosystem} title="מה תמצאי בליבה?">
              <div className="flex flex-wrap gap-2">
                {ECOSYSTEM.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-muted/60 px-3 py-1.5 text-[12.5px] font-light text-foreground/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-[15px] font-light text-foreground">
                ועכשיו, בואי נעשה את ליבה קצת יותר שלך.
              </p>
            </Slide>
            <Nav next={() => setStep(6)} nextLabel="מתאימה את ליבה אליי" back={() => setStep(4)} />
          </>
        )}

        {/* 6 — תחומי עניין */}
        {step === 6 && (
          <>
            <p className="text-[20px] font-light text-foreground">מה מעניין אותך בליבה?</p>
            <p className="mt-2 text-[13.5px] font-light text-muted-foreground">
              סמני מה שהיית שמחה לראות יותר.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {spaces.map((s) => (
                <Chip
                  key={s}
                  id={s}
                  label={label(s)}
                  on={interests.includes(s)}
                  onClick={() => toggle(interests, setInterests, s)}
                />
              ))}
            </div>
            <Nav
              next={() => {
                setUpdates((u) => (u.length ? u : interests));
                advance(7);
              }}
              back={() => setStep(5)}
            />
          </>
        )}

        {/* 7 — עדכונים ותדירות */}
        {step === 7 && (
          <>
            <p className="text-[20px] font-light text-foreground">על מה תרצי לדעת כשקורה משהו חדש?</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {spaces.map((s) => (
                <Chip
                  key={s}
                  id={s}
                  label={label(s)}
                  on={updates.includes(s)}
                  onClick={() => toggle(updates, setUpdates, s)}
                />
              ))}
            </div>
            <p className="mt-6 text-[14px] font-light text-foreground">ובאיזו תדירות?</p>
            <div className="mt-2.5 space-y-2">
              {FREQ.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFreq(f.key)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-right text-[13.5px] transition-colors ${
                    freq === f.key
                      ? "border-primary/60 bg-primary/5 text-foreground"
                      : "border-border/60 font-light text-foreground/85 hover:bg-muted/50"
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                      freq === f.key ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {freq === f.key && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </span>
                  {f.label}
                </button>
              ))}
            </div>
            <Nav next={() => advance(8)} back={() => setStep(6)} />
          </>
        )}

        {/* 8 — בירורים ודירות */}
        {step === 8 && (
          <>
            <p className="text-[20px] font-light text-foreground">ויש שני דברים שכדאי לא לפספס</p>
            <p className="mt-2 text-[13.5px] font-light leading-relaxed text-muted-foreground">
              בירורים על בחורים ולוח הדירות מתעדכנים כל הזמן. אפשר לבחור על מה נעדכן אותך.
            </p>
            <div className="mt-5 space-y-2.5">
              {(
                [
                  ["inquiry_all", "על כל בחור חדש בפורום הבירורים"],
                  ["inquiry_ashkenazi", "רק על בחור אשכנזי"],
                  ["inquiry_sephardi", "רק על בחור ספרדי"],
                  ["new_apartment", "כשמתפרסמת דירה חדשה בלוח הדירות"],
                ] as const
              ).map(([k, l]) => (
                <Switch
                  key={k}
                  label={l}
                  on={!!notify[k]}
                  onToggle={() => setNotify((n) => ({ ...n, [k]: !n[k] }))}
                />
              ))}
            </div>
            <Nav next={() => advance(9)} back={() => setStep(7)} />
          </>
        )}

        {/* 9 — מאסטריות */}
        {step === 9 && (
          <>
            <p className="text-[20px] font-light text-foreground">אולי גם את מאסטרית במשהו?</p>
            <p className="mt-2 text-[13.5px] font-light leading-relaxed text-muted-foreground">
              יש תחום שאת מכירה טוב, צברת בו ניסיון או שפשוט תמיד פונות אלייך עליו? את יכולה לבחור
              להיות כתובת לנשים אחרות בליבה.
            </p>
            <div className="mt-2">
              <Reveal title="" label="מה זה אומר להיות מאסטרית?">
                לא צריך תעודה — מספיק להכיר את התחום מקרוב, מניסיון או מהחיים עצמם. אין התחייבות
                לענות: רק הזדמנות להיות שם כשיש לך מה לתת.
              </Reveal>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {spaces.map((s) => (
                <Chip
                  key={s}
                  id={s}
                  label={label(s)}
                  on={mastery.includes(s)}
                  onClick={() => toggle(mastery, setMastery, s, 2)}
                />
              ))}
            </div>
            <p className="mt-3 text-[12.5px] font-light leading-relaxed text-muted-foreground">
              כשעולה שאלה מתאימה, נוכל לעזור לה להגיע גם אלייך — כדי שתוכלי להיות שם בדיוק במקומות
              שבהם יש לך מה לתת. אפשר לבחור עד שני תחומים.
            </p>
            <Nav next={() => advance(10)} back={() => setStep(8)} />
          </>
        )}

        {/* 10 — תכירו אותי */}
        {step === 10 && (
          <>
            <p className="text-[20px] font-light text-foreground">ועכשיו, שנכיר אותך קצת ❤️</p>
            <p className="mt-2 text-[13.5px] font-light leading-relaxed text-muted-foreground">
              כשמכירים אותך, קל יותר להתחבר אלייך. פרופיל מלא גם יכול לתת לך לבבות ולקדם אותך בדרך
              ל״לב נוכח״.
            </p>
            <div className="mt-5 space-y-3">
              {(
                [
                  ["area", "מאיפה את?", "ירושלים, שכונת הבוכרים"],
                  ["work", "במה את עוסקת?", "מנהלת חשבונות"],
                  ["loves", "מה את אוהבת?", "ריצה בבוקר, ספרים"],
                  ["help", "במה תשמחי לעזור?", "קורות חיים, בירוקרטיה"],
                ] as const
              ).map(([k, l, ph]) => (
                <label key={k} className="block">
                  <span className="mb-1.5 block text-[12.5px] font-light text-muted-foreground">
                    {l}
                  </span>
                  <input
                    value={about[k]}
                    maxLength={80}
                    placeholder={ph}
                    onChange={(e) => setAbout((a) => ({ ...a, [k]: e.target.value }))}
                    className="w-full rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-[14px] outline-none transition-colors placeholder:font-light placeholder:text-muted-foreground/60 focus:border-border"
                  />
                </label>
              ))}
            </div>
            <div className="mt-7 flex items-center gap-2">
              <Button
                className="rounded-full px-6 font-light"
                disabled={busy}
                onClick={() => void persist()}
              >
                {busy && <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" />}
                סיום
              </Button>
              <Button variant="ghost" className="rounded-full font-light" onClick={() => setStep(9)}>
                חזרה
              </Button>
            </div>
          </>
        )}

        {/* 11 — סיום */}
        {step === 11 && (
          <>
            <Sparkles className="h-6 w-6 text-primary" />
            <p className="mt-4 text-[23px] font-light text-foreground">ליבה מחכה לך ❤️</p>
            <p className="mt-3 text-[14.5px] font-light leading-relaxed text-muted-foreground">
              הכרנו אותך קצת יותר, וליבה כבר קצת יותר שלך.
              <br />
              מכאן אפשר פשוט להיכנס, להכיר, לשאול, לשתף ולהיות חלק.
            </p>

            <div className="mt-6 space-y-2 rounded-3xl bg-muted/40 p-5 text-[13px] font-light text-foreground/85">
              {interests.length > 0 && <p>מעניין אותך: {interests.map(label).join(" · ")}</p>}
              {updates.length > 0 && (
                <p>
                  נעדכן אותך על: {updates.map(label).join(" · ")} ·{" "}
                  {FREQ.find((f) => f.key === freq)?.label}
                </p>
              )}
              {mastery.length > 0 && <p>מאסטרית ב: {mastery.map(label).join(" · ")}</p>}
              {aboutFilled && <p>הוספת פרטים ל״תכירו אותי״</p>}
              <p className="text-muted-foreground">הכול נשאר לשינוי בכל רגע בהגדרות.</p>
            </div>

            <Button className="mt-7 rounded-full px-6 font-light" onClick={() => setOpen(false)}>
              מתרגשת להצטרף לליבה ❤️
              <ArrowLeft className="ms-2 h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
};

export default LibaOnboarding;
