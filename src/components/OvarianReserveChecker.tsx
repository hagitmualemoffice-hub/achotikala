import { useMemo, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, HelpCircle, Info, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// סף AMH לפי גיל (אחוזון 25 - הסף הקליני בישראל לחשד לרזרבה נמוכה)
const AMH_THRESHOLDS: { maxAge: number; value: number }[] = [
  { maxAge: 24, value: 2.6 },
  { maxAge: 29, value: 2.1 },
  { maxAge: 34, value: 1.7 },
  { maxAge: 39, value: 1.1 },
  { maxAge: 99, value: 1.1 },
];

const getAmhThreshold = (age: number) =>
  AMH_THRESHOLDS.find((t) => age <= t.maxAge)?.value ?? 1.1;

type Status = "low" | "borderline" | "normal" | "unknown";

const evalAfc = (v?: number): Status => {
  if (v == null || isNaN(v)) return "unknown";
  if (v < 7) return "low";
  if (v <= 9) return "borderline";
  return "normal";
};
const evalFsh = (v?: number): Status => {
  if (v == null || isNaN(v)) return "unknown";
  if (v > 10) return "low";
  if (v >= 8) return "borderline";
  return "normal";
};
const evalAmh = (v: number | undefined, age: number): Status => {
  if (v == null || isNaN(v)) return "unknown";
  const t = getAmhThreshold(age);
  if (v < t) return "low";
  if (v < t * 1.15) return "borderline";
  return "normal";
};

const InfoLink = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline-offset-4 hover:underline font-medium"
      >
        {title}
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent
      side="top"
      align="start"
      className="w-[min(340px,90vw)] text-right text-sm leading-relaxed"
      dir="rtl"
    >
      {children}
    </PopoverContent>
  </Popover>
);

const StatusBadge = ({ status }: { status: Status }) => {
  if (status === "unknown") return null;
  const map = {
    low: { label: "מתחת לסף", cls: "bg-primary/15 text-primary border-primary/30" },
    borderline: { label: "גבולי", cls: "bg-amber-100 text-amber-800 border-amber-300" },
    normal: { label: "תקין", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  );
};

const OvarianReserveChecker = () => {
  const [age, setAge] = useState<string>("");
  const [afc, setAfc] = useState<string>("");
  const [fsh, setFsh] = useState<string>("");
  const [amh, setAmh] = useState<string>("");

  const ageNum = parseFloat(age);
  const afcNum = afc === "" ? undefined : parseFloat(afc);
  const fshNum = fsh === "" ? undefined : parseFloat(fsh);
  const amhNum = amh === "" ? undefined : parseFloat(amh);

  const validAge = !isNaN(ageNum) && ageNum >= 18 && ageNum <= 50;
  const amhThreshold = validAge ? getAmhThreshold(ageNum) : null;

  const result = useMemo(() => {
    if (!validAge) return null;
    const sAfc = evalAfc(afcNum);
    const sFsh = evalFsh(fshNum);
    const sAmh = evalAmh(amhNum, ageNum);

    const lows = [sAfc, sFsh, sAmh].filter((s) => s === "low").length;
    const borderlines = [sAfc, sFsh, sAmh].filter((s) => s === "borderline").length;
    const known = [sAfc, sFsh, sAmh].filter((s) => s !== "unknown").length;

    return { sAfc, sFsh, sAmh, lows, borderlines, known };
  }, [validAge, afcNum, fshNum, amhNum, ageNum]);

  const tips = useMemo(() => {
    if (!result) return [];
    const t: { tone: "info" | "action" | "good" | "warn"; text: string }[] = [];

    // 2 מתוך 3 - זכאית
    if (result.lows >= 2) {
      t.push({
        tone: "good",
        text: "לפי הערכים שהזנת - שניים מתוך שלושת המדדים מתחת לסף, וזה המצב שנכנס להתוויה רפואית בסל הבריאות. כדאי לגשת עם הבדיקות לרופא/ת פריון לאישור.",
      });
    }

    // אם מדד אחד נמוך והאחר גבולי + AMH חסר
    if (amhNum == null) {
      if (result.sAfc === "low" || result.sFsh === "low" || result.sAfc === "borderline" || result.sFsh === "borderline") {
        t.push({
          tone: "action",
          text: "AMH לא נבדק בדרך כלל בשלב הראשון, אבל הערכים שלך מצדיקים להוסיף אותו. בדיקת AMH פרטית עולה כמה מאות שקלים ויכולה לחסוך לך אלפים אם תיכנסי להתוויה רפואית.",
        });
      }
    }

    // AFC גבולי - לחזור על הבדיקה
    if (result.sAfc === "borderline") {
      t.push({
        tone: "action",
        text: "ספירת הזקיקים (AFC) משתנה מחודש לחודש - אם המספר גבולי, שווה לחזור על הבדיקה במחזור הבא. לפעמים זה ההבדל בין כניסה להתוויה רפואית לבין תשלום מלא.",
      });
    }

    // רק מדד אחד נמוך
    if (result.lows === 1 && result.known === 3) {
      t.push({
        tone: "info",
        text: "מדד אחד מתחת לסף לא מספיק להתוויה רפואית - צריך שניים מתוך שלושה. כדאי לחזור על הבדיקה הגבולית ולוודא שלא פספסת זכאות.",
      });
    }

    // כל הערכים תקינים
    if (result.lows === 0 && result.borderlines === 0 && result.known === 3) {
      t.push({
        tone: "good",
        text: "כל שלושת המדדים בטווח התקין לגילך. את לא נכנסת להתוויה רפואית כרגע, אבל את כן זכאית לשימור פוריות חברתי דרך סל הבריאות (גילאי 30-41).",
      });
    }

    return t;
  }, [result, amhNum]);

  return (
    <section
      id="reserve-check"
      className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6 scroll-mt-28"
    >
      <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
        <div className="text-right mb-8 md:mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs md:text-sm font-medium text-primary mb-2">
            <Activity className="h-3.5 w-3.5" />
            כלי אבחון אישי
          </span>
          <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-2 md:mb-3">
            בדיקת רזרבה שחלתית
          </h2>
          <p className="text-foreground/80 text-sm md:text-lg font-light">
            כלי שעוזר לך להבין האם את עשויה להיכנס להתוויה רפואית - ולממש זכויות שמגיעות לך.
          </p>
        </div>

        <article className="bg-gradient-to-br from-card via-card to-accent/20 rounded-[24px] md:rounded-[32px] shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.25)] border border-primary/10 overflow-hidden">
          {/* Top: explanation strip */}
          <div className="bg-primary/8 border-b border-primary/10 px-6 md:px-14 py-5 md:py-6 text-right">
            <div className="flex items-start gap-2.5">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-foreground font-bold text-base md:text-lg mb-1">למה זה חשוב?</h3>
                <p className="text-foreground/75 text-sm md:text-base font-light leading-relaxed">
                  שימור פוריות נכנס להתוויה רפואית וממומן במלואו על ידי סל הבריאות כאשר{" "}
                  <strong className="font-medium text-foreground">שניים מתוך שלושת המדדים</strong> מראים על
                  רזרבה שחלתית נמוכה. בדקי כאן מה המצב שלך.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-14 py-8 md:py-10">
            {/* Age - primary input, prominent */}
            <div className="mb-8 md:mb-10">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
                <Label htmlFor="age" className="text-foreground text-base md:text-lg font-medium text-right">
                  קודם כל - מה הגיל שלך?
                </Label>
                {amhThreshold && (
                  <span className="text-xs md:text-sm text-foreground/60 text-right">
                    סף AMH לגילך: <strong className="text-primary font-semibold">{amhThreshold}</strong>
                  </span>
                )}
              </div>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                min={18}
                max={50}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="לדוגמה: 32"
                className="text-right text-xl md:text-2xl font-medium h-14 md:h-16 rounded-2xl border-2 border-primary/30 focus-visible:border-primary bg-card"
                dir="rtl"
              />
            </div>

            {/* Divider with label */}
            <div className="relative mb-6 md:mb-8">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-xs md:text-sm text-foreground/60 font-light">
                  עכשיו הזיני את הערכים שיש לך מהבדיקות
                </span>
              </div>
            </div>

            {/* 3 metrics - clean cards in a row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 text-right">
              {/* AFC */}
              <div className="bg-card rounded-2xl border border-border p-4 md:p-5 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <InfoLink title="AFC">
                    <strong>מהי הבדיקה?</strong>
                    <br />
                    בדיקת אולטרסאונד וגינלי שמודדת את מספר הזקיקים האנטרליים הקטנים בשתי השחלות בתחילת
                    המחזור (יום 2-5).
                    <br />
                    <br />
                    <strong>איך עושים?</strong>
                    <br />
                    אצל גינקולוג/ית, בדרך כלל בקופה. צריך לתאם תור לימי הווסת הראשונים. הספירה משתנה
                    מחודש לחודש - שווה לחזור עליה אם התוצאה גבולית.
                  </InfoLink>
                  <span className="text-[10px] text-foreground/50 font-light">סף &lt; 7</span>
                </div>
                <p className="text-foreground/65 text-xs font-light leading-snug mb-3">
                  ספירת זקיקים באולטרסאונד
                </p>
                <Input
                  id="afc"
                  type="number"
                  inputMode="decimal"
                  step="1"
                  value={afc}
                  onChange={(e) => setAfc(e.target.value)}
                  placeholder="לדוגמה: 8"
                  className="text-right text-lg font-medium h-12 rounded-xl"
                  dir="rtl"
                />
              </div>

              {/* FSH */}
              <div className="bg-card rounded-2xl border border-border p-4 md:p-5 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <InfoLink title="FSH">
                    <strong>מהי הבדיקה?</strong>
                    <br />
                    בדיקת דם להורמון שמופרש מהמוח ומאותת לשחלות להבשיל זקיקים. כשהרזרבה יורדת, הגוף
                    מפריש יותר FSH כדי "לעורר" את השחלות - לכן ערך גבוה מעיד על ירידה.
                    <br />
                    <br />
                    <strong>איך עושים?</strong>
                    <br />
                    בדיקת דם פשוטה דרך הקופה, בימי הווסת הראשונים (יום 2-4). זו אחת מהבדיקות הראשונות
                    שעושים.
                  </InfoLink>
                  <span className="text-[10px] text-foreground/50 font-light">סף &gt; 10</span>
                </div>
                <p className="text-foreground/65 text-xs font-light leading-snug mb-3">
                  הורמון מגרה זקיקים (בדיקת דם)
                </p>
                <Input
                  id="fsh"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={fsh}
                  onChange={(e) => setFsh(e.target.value)}
                  placeholder="לדוגמה: 7.5"
                  className="text-right text-lg font-medium h-12 rounded-xl"
                  dir="rtl"
                />
              </div>

              {/* AMH */}
              <div className="bg-card rounded-2xl border border-border p-4 md:p-5 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <InfoLink title="AMH">
                    <strong>מהי הבדיקה?</strong>
                    <br />
                    בדיקת דם להורמון שמופרש מהזקיקים עצמם. ה-AMH משקף את הרזרבה הכוללת במאגר השחלתי
                    ולא תלוי במחזור.
                    <br />
                    <br />
                    <strong>איך עושים?</strong>
                    <br />
                    בדיקת דם שאפשר לעשות בכל יום בחודש. לא תמיד נכללת בסל הראשוני - לפעמים צריך הפניה
                    מיוחדת או לבצע פרטית (כמה מאות שקלים).
                    <br />
                    <br />
                    <strong>הסף משתנה לפי גיל</strong> (אחוזון 25):
                    <br />
                    עד 24: 2.6 · 25-29: 2.1 · 30-34: 1.7 · 35-39: 1.1
                  </InfoLink>
                  <span className="text-[10px] text-foreground/50 font-light">לפי גיל</span>
                </div>
                <p className="text-foreground/65 text-xs font-light leading-snug mb-3">
                  הורמון אנטי מולריאני <span className="text-foreground/45">(אופציונלי)</span>
                </p>
                <Input
                  id="amh"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={amh}
                  onChange={(e) => setAmh(e.target.value)}
                  placeholder={amhThreshold ? `הסף בגילך: ${amhThreshold}` : "לדוגמה: 1.5"}
                  className="text-right text-lg font-medium h-12 rounded-xl"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="mt-8 space-y-6">{/* results-wrapper */}



            {/* Results */}
            {!validAge && (
              <div className="text-sm text-foreground/60 text-right">
                הזיני גיל ולפחות מדד אחד כדי לראות תוצאה.
              </div>
            )}

            {validAge && result && (
              <div className="bg-secondary/30 rounded-2xl p-5 md:p-6 mb-2">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="text-foreground font-bold text-base md:text-lg">התוצאה שלך</h3>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mb-5 text-right">
                  <div className="bg-card rounded-xl p-3 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground/70">AFC</span>
                      <StatusBadge status={result.sAfc} />
                    </div>
                    <div className="text-foreground font-bold text-lg">
                      {afcNum ?? "-"}
                      <span className="text-xs font-light text-foreground/50 mr-1">סף &lt; 7</span>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl p-3 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground/70">FSH</span>
                      <StatusBadge status={result.sFsh} />
                    </div>
                    <div className="text-foreground font-bold text-lg">
                      {fshNum ?? "-"}
                      <span className="text-xs font-light text-foreground/50 mr-1">סף &gt; 10</span>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl p-3 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground/70">AMH</span>
                      <StatusBadge status={result.sAmh} />
                    </div>
                    <div className="text-foreground font-bold text-lg">
                      {amhNum ?? "-"}
                      <span className="text-xs font-light text-foreground/50 mr-1">
                        סף &lt; {amhThreshold}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Eligibility summary */}
                <div
                  className={`rounded-xl p-4 mb-4 text-right border ${
                    result.lows >= 2
                      ? "bg-emerald-50 border-emerald-200"
                      : result.lows === 1 || result.borderlines >= 2
                      ? "bg-amber-50 border-amber-200"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {result.lows >= 2 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-foreground font-medium text-sm md:text-base mb-1">
                        {result.lows >= 2
                          ? "נראה שאת עשויה להיכנס להתוויה רפואית"
                          : result.lows === 1
                          ? "עדיין לא עומדת בשני קריטריונים - אבל כדאי לבדוק עוד"
                          : "כרגע נראה שאת לא בהתוויה רפואית"}
                      </p>
                      <p className="text-foreground/70 text-xs md:text-sm font-light leading-relaxed">
                        {result.lows} מתוך {result.known || 3} מדדים שהזנת מתחת לסף · נדרשים שניים
                        לפחות. זו הערכה כללית - הקביעה הסופית היא של רופא/ת הפריון.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                {tips.length > 0 && (
                  <div className="space-y-2.5">
                    {tips.map((tip, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-right text-sm text-foreground/80 leading-relaxed bg-card rounded-lg p-3 border border-border"
                      >
                        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p>{tip.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Discrepancy explanation */}
            <Accordion type="single" collapsible className="mt-6">
              <AccordionItem value="discrepancy" className="border-border">
                <AccordionTrigger className="text-right text-sm md:text-base font-medium text-foreground hover:no-underline">
                  כשהנתונים לא מסתדרים - למה זה קורה?
                </AccordionTrigger>
                <AccordionContent className="text-right text-sm text-foreground/75 font-light leading-relaxed space-y-3">
                  <p>
                    כשבודקים רזרבה שחלתית, מקובל להיעזר בשלושה מדדים: AMH, AFC ו-FSH. כל אחד מהם מודד
                    היבט אחר של מערכת הפוריות, ולכן לעיתים נוצר פער ביניהם. הפער הזה אינו טעות - אלא
                    ביטוי למורכבות של הגוף הנשי.
                  </p>
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      AMH ו-AFC תקינים, אך FSH גבוה
                    </p>
                    <p>
                      מצב שכיח יחסית. הרבה פעמים הסימן הראשון לירידה ברזרבה הוא תחילת העלייה של FSH.
                      זה יכול להעיד על תגובה הורמונלית לא יעילה או על צורך בהערכה רחבה יותר, גם אם
                      הכמות נראית טובה.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      AMH נמוך, אך FSH ו-AFC תקינים
                    </p>
                    <p>
                      מצב שיכול להופיע אחרי שימוש ממושך בגלולות - שמכניס את השחלות למצב של דיכוי
                      וקיפאון זמני. הערך הנמוך לא בהכרח משקף ירידה אמיתית, אלא תגובה זמנית של השחלות.
                      אחרי הפסקת הגלולות וכשהפעילות חוזרת בהדרגה, ה-AMH עשוי להשתנות ולהתייצב.
                    </p>
                  </div>
                  <p className="pt-1 border-t border-border">
                    AMH מראה את המאגר הכללי, AFC מציג את התמונה החודשית הנראית לעין, ו-FSH משקף את
                    האיתות ההורמונלי. רק הסתכלות משולבת מאפשרת להבין באמת מה קורה בשחלות. פערים בין
                    הבדיקות אינם כישלון של הגוף - אלא הזמנה לקריאה עמוקה ומותאמת אישית. במקרים רבים,
                    סבב טיפול בפועל יראה תגובה שונה ממה שניבאו הבדיקות המקדימות.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <p className="text-foreground/50 text-xs font-light text-right mt-6">
              * הכלי הזה הוא להתמצאות בלבד ולא תחליף לייעוץ רפואי. הקריטריונים מבוססים על הפרקטיקה
              הקלינית הנהוגה בישראל. הקביעה הסופית להתוויה רפואית היא של רופא/ת פריון.
            </p>
            </div>{/* /results-wrapper */}
          </div>

        </article>
      </div>
    </section>
  );
};

export default OvarianReserveChecker;
