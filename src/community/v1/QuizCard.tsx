import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";
import {
  answerQuiz,
  fetchQuizState,
  saveQuizNote,
  type QuizState,
} from "./quiz";
import type { RotatingContent } from "./rotatingContent";

/** Original answers remain the fallback for the archived first template. */
const FALLBACK_OPTIONS = [
  {
    id: "א",
    text: "💬 צ'אט אישי – ראית מישהי שכתבה משהו שנגע בך? אפשר פשוט לכתוב לה בפרטי.\n📍 מקומות לדייטים – המלצות מהקהילה למקומות שבאמת נעים להיפגש בהם.\n📝 יומן דייטים – מקום פרטי לזכור עם מי יצאת, מתי ומה בעצם חשבת עליו.\n🚨 שיחת חילוץ – קובעת שעה מראש, ואם הדייט עוד נמשך ליבה מזכירה לחברה שלך להתקבר 😅",
  },
  {
    id: "ב",
    text: "✨ מאסטריות – נשים מהקהילה שבחרו להיות כתובת בתחום שהן ממש מבינות בו.\n💬 צ'אט אישי – אפשר לפנות למישהי מהקהילה ולהמשיך ביניכן בפרטי.\n🔔 חשבנו עלייך – ליבה מזהה שאלה בתחום שאת מכירה ומזמינה אותך לבוא לעזור.\n📍 מקומות לדייטים – מאגר המלצות של הקהילה, כולל שמירה של המקומות שאהבת.",
  },
  {
    id: "ג",
    text: "💧 הבאר – מאגר בחורים עם מידע והמלצות מנשים שבאמת מכירות אותם.\n🔎 אולי את מכירה? – צריכה בירור על בחור? שואלים את הקהילה ומגיעים למי שיודעת.\n💬 צ'אט אישי – אפשר לפנות למישהי מתוך ליבה ולהמשיך את השיחה ביניכן בפרטי.\n✨ מאסטריות – נשים עם ניסיון שבחרו להיות כתובת ולעזור לאחרות בתחום שהן מכירות.",
  },
  {
    id: "ד",
    text: "🤖 השדכנית של ליבה – מספרת מה את מחפשת והמערכת מחפשת לך התאמות מתוך המאגר.\n📊 נו, אז איך היה? – כמה שאלות אחרי הדייט, כדי לעזור לך להחליט אם לתת לזה עוד אחד.\n👯‍♀️ חכמת החברות – מתלבטת על בחור? שולחת לחברות הצבעה אנונימית: כן, לא, או \"תני צ'אנס\".\n🔕 מצב דייט – משתיק את כל ההתראות מליבה לערב אחד. כי באמת, יש גבול. 😄",
  },
];

const EXPLAIN = [
  { icon: "💧", title: "הבאר", text: "מאגר בחורים עם מידע והמלצות מנשים שבאמת מכירות אותם." },
  {
    icon: "🔎",
    title: "אולי את מכירה?",
    text: "צריכה בירור על בחור? שואלים את הקהילה ומגיעים למי שיודעת.",
  },
  {
    icon: "💬",
    title: "צ'אט אישי",
    text: "אפשר לפנות למישהי מתוך ליבה ולהמשיך את השיחה ביניכן בפרטי.",
  },
  {
    icon: "✨",
    title: "מאסטריות",
    text: "נשים עם ניסיון שבחרו להיות כתובת ולעזור לאחרות בתחום שהן מכירות.",
  },
];

export default function QuizCard({ item, onBack }: { item: RotatingContent; onBack?: () => void }) {
  const [state, setState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [justSolved, setJustSolved] = useState(false);

  const [note, setNote] = useState("");
  const [anon, setAnon] = useState(true);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchQuizState(item.id)
      .then((s) => {
        if (!alive) return;
        setState(s);
        setNote(s.note ?? "");
        setAnon(s.note_anonymous);
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [item.id]);

  const answer = async (id: string) => {
    setPicked(id);
    setWrong(null);
    setSending(true);
    try {
      const next = await answerQuiz(item.id, id);
      setState(next);
      if (next.correct) {
        setWrong(null);
        setJustSolved(true);
      } else {
        setWrong(id);
      }
    } catch {
      toast.error("לא הצלחנו לשמור את התשובה");
    } finally {
      setSending(false);
    }
  };

  const submitNote = async () => {
    setSavingNote(true);
    try {
      setState(await saveQuizNote(item.id, note, anon));
      toast.success("תודה ששיתפת");
    } catch {
      toast.error("התגובה לא נשמרה");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-card py-14">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!state?.authorized) return null;

  const solved = state.solved;
  const done = state.flamingo;
  const locked = !solved && state.locked;
  const configuredOptions = Array.isArray(item.config.options) ? item.config.options : [];
  const options = configuredOptions
    .filter((option): option is { id: string; text: string } => (
      typeof option === "object" && option !== null && "id" in option && "text" in option
      && typeof option.id === "string" && typeof option.text === "string"
    ))
    .filter((option) => option.text.trim());
  const visibleOptions = options.length >= 2 ? options : FALLBACK_OPTIONS;

  return (
    <div
      dir="rtl"
      className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
    >
      <div className="bg-gradient-to-bl from-primary/[0.09] via-primary/[0.04] to-transparent px-6 py-8 sm:px-10 sm:py-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-[11.5px] text-primary">
          יש פה חידה 👀
        </span>
        <h2 className="mt-4 text-[22px] font-light text-foreground sm:text-[25px]">
          {item.title}
        </h2>
        {!solved && (
          <p className="mt-2 whitespace-pre-line text-[13.5px] font-light leading-relaxed text-muted-foreground">
            {item.body}
          </p>
        )}
      </div>

      <div className="px-6 pb-9 pt-2 sm:px-10">
        {/* ------------------------------ STATE A ------------------------------ */}
        {locked && (
          <div className="mt-6 rounded-3xl bg-primary/[0.06] px-6 py-8 text-center sm:px-10">
            <p className="text-[17px] text-foreground">אופס... לא הפעם 😏</p>
            <p className="mt-2 text-[13.5px] font-light leading-relaxed text-muted-foreground">
              אבל יש דרך לגלות את התשובה.
            </p>
            <p className="mt-6 text-[12.5px] font-light text-muted-foreground">
              קחי איתך את הסימן הזה:
            </p>
            <p className="mt-1 text-[56px] leading-none" aria-label="אפרוח">
              🐣
            </p>
            <p className="mt-6 whitespace-pre-line text-[13.5px] font-light leading-relaxed text-foreground/85">
              {"חזרי לפורום, מצאי את חגית מועלם\nושלחי לי 🐣 בצ'אט האישי."}
            </p>
            <p className="mt-4 text-[13.5px] font-light text-foreground/85">
              מחכה לך שם התשובה 👀
            </p>
            <p className="mt-5 text-[13.5px] font-medium leading-relaxed text-foreground">
              💬 בצ'אט האישי — לא בתגובות לפורום
            </p>
            <Link
              to="/liba"
              onClick={() => onBack?.()}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-[13.5px] text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-glow))]"
            >
              חזרה לפורום ←
            </Link>
          </div>
        )}

        {!solved && !locked && (
          <>
            <ul className="mt-5 space-y-3">
              {visibleOptions.map((o) => {
                const isWrong = wrong === o.id;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => answer(o.id)}
                      className={`w-full rounded-2xl border px-5 py-4 text-start transition-colors disabled:opacity-60 ${
                        isWrong
                          ? "border-destructive/40 bg-destructive/[0.05]"
                          : "border-border/70 bg-background hover:border-primary/40 hover:bg-primary/[0.05]"
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/70 text-[13px] text-foreground/80">
                          {o.id}
                        </span>
                        <span className="whitespace-pre-line text-[13.5px] font-light leading-relaxed text-foreground">
                          {o.text}
                        </span>
                        {sending && picked === o.id && (
                          <Loader2 className="ms-auto h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

          </>
        )}

        {/* --------------------------- STATE B / C ---------------------------- */}
        {solved && (
          <div className="mt-6 space-y-8">
            <div>
              <p className="text-[18px] text-foreground">
                {done ? "את כבר בפנים 🦩💗" : justSolved ? "יש! עלית על זה 🎉" : "כבר פתרת 🎉"}
              </p>
              <p className="mt-2 whitespace-pre-line text-[13.5px] font-light leading-relaxed text-muted-foreground">
                {done
                  ? "נכנסת להגרלה על 2 כרטיסים לאירוע של אחותי כלה.\nמחזיקות לך אצבעות!"
                  : "הבאר, הצ'אט, הבירורים והמאסטריות —\nכולם מחכים לך בליבה החדשה."}
              </p>
            </div>

            {!done && (
              <>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {EXPLAIN.map((f) => (
                    <li
                      key={f.title}
                      className="rounded-2xl border border-border/60 bg-background px-5 py-4"
                    >
                      <p className="text-[14px] text-foreground">
                        <span className="me-1.5">{f.icon}</span>
                        {f.title}
                      </p>
                      <p className="mt-1 text-[12.5px] font-light leading-relaxed text-muted-foreground">
                        {f.text}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-border/60 pt-7 text-center">
                  <p className="text-[14.5px] text-foreground">
                    אבל כדי להיכנס להגרלה נשארה עוד משימה קטנה 👀
                  </p>
                  <p className="mt-5 text-[12.5px] font-light text-muted-foreground">
                    הסימן הסודי שלך:
                  </p>
                  <p className="mt-1 text-[56px] leading-none" aria-label="פלמינגו">
                    🦩
                  </p>
                  <p className="mt-5 whitespace-pre-line text-[13.5px] font-light leading-relaxed text-foreground/85">
                    {
                      "עכשיו חזרי לפורום,\nמצאי את חגית מועלם,\nופתחי איתה משם צ'אט אישי."
                    }
                  </p>
                  <p className="mt-4 whitespace-pre-line text-[13.5px] font-medium leading-relaxed text-foreground">
                    {"💬 את הפלמינגו שולחים לי בצ'אט האישי —\nלא כתגובה לפוסט."}
                  </p>
                  <p className="mt-4 whitespace-pre-line text-[13.5px] font-light leading-relaxed text-foreground/85">
                    {"שלחי לי בצ'אט רק:\n🦩"}
                  </p>
                  <Link
                    to="/liba"
                    onClick={() => onBack?.()}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-[13.5px] text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-glow))]"
                  >
                    חזרה לפורום ←
                  </Link>
                  <p className="mt-5 text-[11.5px] font-light text-muted-foreground">
                    זהו. שלחת? את בפנים 💗
                    <br />
                    ההגרלה היא על 2 כרטיסים לאירוע של אחותי כלה.
                  </p>
                </div>
              </>
            )}

            {/* --------------------- words of her own ------------------------- */}
            <div className="border-t border-border/60 pt-7">
              <p className="text-[15px] text-foreground">מה את מרגישה על ליבה החדשה?</p>
              <p className="mt-1 text-[11.5px] font-light text-muted-foreground">
                את בוחרת אם לשתף בשם שלך או בעילום שם
              </p>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="במילים שלי..."
                className="mt-3 w-full resize-none rounded-3xl border border-border bg-background px-5 py-4 text-[14px] font-light leading-relaxed outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[
                  { anon: false, label: "בשם שלי", icon: <User className="h-3.5 w-3.5" /> },
                  { anon: true, label: "בעילום שם", icon: <Lock className="h-3 w-3" /> },
                ].map((o) => (
                  <button
                    key={String(o.anon)}
                    type="button"
                    onClick={() => setAnon(o.anon)}
                    aria-pressed={anon === o.anon}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] transition-colors ${
                      anon === o.anon
                        ? "bg-primary/12 text-primary"
                        : "border border-border font-light text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.icon}
                    {o.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={submitNote}
                  disabled={savingNote}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-6 py-2 text-[12.5px] text-primary transition-colors hover:bg-primary/[0.07] disabled:opacity-40"
                >
                  {savingNote && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {state.note ? "עדכון התגובה שלי" : "שיתוף"}
                </button>
              </div>

              {state.notes.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {state.notes.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-2xl bg-muted/40 px-5 py-4 text-[13.5px] font-light leading-relaxed text-foreground/85"
                    >
                      <p className="mb-1 text-[11.5px] text-muted-foreground">
                        {n.name ?? "בעילום שם"}
                      </p>
                      {n.body}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
