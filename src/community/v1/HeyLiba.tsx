/**
 * "היי, ליבה 👋" — a small, warm channel for telling us what's broken, what she
 * dreams of, and what could be nicer. Not support, not a ticket system: a tab on
 * the edge of the screen, three choices, a sentence or two, done.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bug, Camera, ImagePlus, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  captureScreen,
  collectContext,
  loadDraft,
  saveDraft,
  sendFeedback,
  shotFromFile,
  type FeedbackKind,
} from "./feedback";

const choices: { kind: FeedbackKind; emoji: string; title: string; note: string; Icon: typeof Bug }[] = [
  {
    kind: "bug",
    emoji: "🐞",
    title: "משהו לא עובד",
    note: "נתקלת בתקלה? ספרי לנו מה קרה.",
    Icon: Bug,
  },
  {
    kind: "idea",
    emoji: "✨",
    title: "יש לי רעיון",
    note: "חשבת על משהו שיכול להיות כאן?",
    Icon: Sparkles,
  },
  {
    kind: "improvement",
    emoji: "🪄",
    title: "הייתי משפרת משהו",
    note: "יש משהו שאפשר לעשות יותר נוח או יותר טוב?",
    Icon: Wand2,
  },
];

const prompts: Record<FeedbackKind, { question: string; placeholder: string; thanks: string }> = {
  bug: {
    question: "מה קרה?",
    placeholder: "ספרי לנו מה ניסית לעשות ומה לא עבד...",
    thanks: "תודה שאמרת לנו. הדיווח שלך עוזר לנו להפוך את ליבה לטובה ונוחה יותר.",
  },
  idea: {
    question: "מה חשבת?",
    placeholder: "ספרי לנו על הרעיון שלך...",
    thanks: "תודה על הרעיון. ככה ליבה ממשיכה לגדול גם מתוך הדברים שאתן מביאות אליה.",
  },
  improvement: {
    question: "מה היית רוצה שיעבוד אחרת?",
    placeholder: "מה היה הופך את זה לנוח או טוב יותר עבורך?",
    thanks: "תודה שעזרת לנו לראות איפה אפשר לעשות את זה טוב יותר.",
  },
};

const HeyLiba = () => {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [body, setBody] = useState("");
  const [shot, setShot] = useState<string | null>(null);
  const [shooting, setShooting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<FeedbackKind | null>(null);
  const [heldDraft, setHeldDraft] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* the channel belongs to women who are already inside ליבה */
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* bring back anything she wrote before the panel closed */
  useEffect(() => {
    if (!open) return;
    const draft = loadDraft();
    if (draft && draft.body.trim()) {
      setKind(draft.kind);
      setBody(draft.body);
      setHeldDraft(true);
    }
  }, [open]);

  useEffect(() => {
    if (!kind || !body.trim()) return;
    const t = setTimeout(() => saveDraft({ kind, body, savedAt: new Date().toISOString() }), 500);
    return () => clearTimeout(t);
  }, [kind, body]);

  const where = useMemo(() => (open ? collectContext().feature : ""), [open]);

  const reset = () => {
    setKind(null);
    setBody("");
    setShot(null);
    setSent(null);
    setHeldDraft(false);
  };

  const close = () => {
    setOpen(false);
    setSent(null);
    setShooting(false);
  };

  const grabScreen = async () => {
    setShooting(true);
    try {
      setShot(await captureScreen());
    } catch {
      toast.error("לא הצלחנו לצלם את המסך. אפשר להעלות צילום מהמחשב.");
    } finally {
      setShooting(false);
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setShooting(true);
    try {
      setShot(await shotFromFile(file));
    } catch {
      toast.error("הקובץ הזה לא נראה כמו תמונה.");
    } finally {
      setShooting(false);
    }
  };

  const send = async () => {
    if (!kind || body.trim().length < 3) return;
    setSending(true);
    try {
      await sendFeedback(kind, body.trim(), shot);
      saveDraft(null);
      setSent(kind);
      setBody("");
      setShot(null);
      setKind(null);
      setHeldDraft(false);
    } catch (e) {
      const offlineish = !navigator.onLine || String((e as Error)?.message ?? "").includes("Failed to fetch");
      if (offlineish) {
        saveDraft({ kind, body, savedAt: new Date().toISOString() });
        toast("אין כרגע חיבור לרשת. נשמור לך את מה שכתבת כדי שתוכלי לשלוח כשיהיה חיבור.");
      } else {
        toast.error("השליחה לא הושלמה. שמרנו לך את מה שכתבת — אפשר לנסות עוד רגע.");
      }
    } finally {
      setSending(false);
    }
  };

  if (!signedIn || typeof document === "undefined") return null;

  /* rendered straight into the page, so the blurred bars above never trap it */
  return createPortal(
    <>
      {/* the tab on the edge of the screen — the same place on phones and desktop */}
      <button
        onClick={() => setOpen(true)}
        data-heyliba="1"
        aria-label="היי, ליבה"
        className="fixed bottom-28 left-0 z-30 flex items-center gap-1.5 rounded-l-none rounded-r-2xl border border-l-0 border-primary/25 bg-card/95 px-1.5 py-3.5 text-[11.5px] font-light text-primary shadow-[var(--shadow-card)] backdrop-blur transition-colors hover:bg-primary/[0.07] md:bottom-8 md:px-2 md:py-4 md:text-[12.5px]"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        היי, ליבה 👋
      </button>

      {open && (
        <div
          data-heyliba="1"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-[2px] animate-in fade-in duration-300 motion-reduce:animate-none md:items-end md:justify-end md:p-8"
          onClick={close}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92dvh] w-full max-w-[400px] overflow-y-auto rounded-t-[28px] border border-border/60 bg-card p-8 shadow-[var(--shadow-card)] animate-in slide-in-from-bottom-4 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none md:max-h-[88vh] md:rounded-[26px] md:p-10 md:zoom-in-[0.98]"
          >
            <div className="relative mb-1 flex items-start gap-3 ps-11">
              <div>
                <h2 className="text-[16px] font-light text-foreground">
                  {sent ? "קיבלנו 💗" : "היי, מה תרצי לספר לנו?"}
                </h2>
                {!sent && (
                  <p className="mt-1 text-[12.5px] font-light text-muted-foreground">
                    משהו לא עובד? יש לך רעיון? אנחנו רוצות לשמוע.
                  </p>
                )}
              </div>
              <button
                onClick={close}
                aria-label="סגירה"
                className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {sent ? (
              <div className="pt-3">
                <p className="text-[13.5px] font-light leading-relaxed text-foreground/85">
                  {prompts[sent].thanks}
                </p>
                <button
                  onClick={close}
                  className="mt-5 w-full rounded-full bg-primary py-2.5 text-[13px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))]"
                >
                  חזרה לליבה
                </button>
              </div>
            ) : !kind ? (
              <ul className="mt-4 space-y-2">
                {choices.map((c) => (
                  <li key={c.kind}>
                    <button
                      onClick={() => setKind(c.kind)}
                      className="w-full rounded-2xl border border-border/60 px-3.5 py-3 text-right transition-colors hover:border-primary/40 hover:bg-primary/[0.05]"
                    >
                      <span className="flex items-center gap-2 text-[13.5px] font-normal text-foreground">
                        <span aria-hidden>{c.emoji}</span>
                        {c.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] font-light text-muted-foreground">
                        {c.note}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13.5px] font-normal text-foreground">{prompts[kind].question}</p>
                  <button
                    onClick={reset}
                    className="text-[11.5px] font-light text-muted-foreground transition-colors hover:text-primary"
                  >
                    שינוי
                  </button>
                </div>

                {heldDraft && (
                  <p className="mb-2 rounded-xl bg-primary/[0.07] px-3 py-2 text-[11.5px] font-light text-foreground/75">
                    שמרנו לך את מה שכתבת בפעם הקודמת.
                  </p>
                )}

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder={prompts[kind].placeholder}
                  className="w-full resize-none rounded-2xl border border-border/70 bg-background px-3.5 py-3 text-[13.5px] font-light leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
                />

                {shot ? (
                  <div className="mt-3 rounded-2xl border border-border/60 p-2">
                    <img
                      src={shot}
                      alt="הצילום שיישלח"
                      className="max-h-44 w-full rounded-xl object-contain object-top"
                    />
                    <div className="mt-2 flex items-center gap-3 px-1">
                      <button
                        onClick={grabScreen}
                        className="text-[11.5px] font-light text-primary transition-colors hover:underline"
                      >
                        להחליף צילום
                      </button>
                      <button
                        onClick={() => setShot(null)}
                        className="text-[11.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
                      >
                        להסיר
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={grabScreen}
                      disabled={shooting}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[12px] font-light text-foreground/85 transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {shooting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                      צרפי את מה שאת רואה עכשיו
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[12px] font-light text-foreground/85 transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      העלאת צילום מהמחשב
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void pickFile(e.target.files?.[0])}
                    />
                  </div>
                )}

                <p className="mt-2 text-[11px] font-light leading-relaxed text-muted-foreground">
                  הצילום נשלח רק אחרי שראית אותו כאן ולחצת שליחה. {where ? `נשמור גם מאיפה כתבת (${where}).` : ""}
                </p>

                <button
                  onClick={send}
                  disabled={sending || body.trim().length < 3}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-[13px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))] disabled:opacity-50"
                >
                  {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                  שלחי לליבה
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};

export default HeyLiba;
