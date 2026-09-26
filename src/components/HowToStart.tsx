import { useState } from "react";
import { Copy, Check, Mail, FileText, Calendar, Stethoscope, Building2, Heart, ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ============================================================
 * HowToStart - "אז מה אני עושה עכשיו?"
 * A calm, step-by-step opener for women starting the process.
 * ============================================================ */

const RX_DOC_URL =
  "https://docs.google.com/document/d/1-3qWfQqgKQYwGn1q3kZ3JfL4Y0bC6jR8/edit"; // placeholder - "לרופא נשים"

const EMAIL_GP = `שלום,
אשמח לקבוע תור לרופא/ת נשים לצורך קבלת הפניות בלבד.

שם: __________
ת.ז: __________`;


const EMAIL_HOSPITAL = `שלום וברכה,
אשמח לקבוע תור לרופא פריון X עבור פתיחת תיק לתהליך שימור פוריות

שם: __________
ת.ז: __________
פלאפון: __________

תודה רבה!`;

const CopyableEmail = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="rounded-2xl bg-accent/40 border border-primary/15 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/10 bg-card/60">
        <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-foreground/80">
          <Mail className="w-4 h-4 text-primary" />
          {label}
        </div>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] md:text-xs font-light hover:bg-[hsl(var(--primary-glow))] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              הועתק
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              העתקה
            </>
          )}
        </button>
      </div>
      <pre className="p-4 md:p-5 text-xs md:text-sm text-foreground/85 font-light leading-relaxed whitespace-pre-wrap font-[inherit] text-right">
        {text}
      </pre>
    </div>
  );
};

const StepCard = ({
  num,
  title,
  icon: Icon,
  children,
}: {
  num: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <div className="relative bg-card rounded-3xl border border-border/60 shadow-[0_15px_40px_-20px_hsl(0_0%_0%_/_0.15)] p-6 md:p-8">
    <div className="flex items-center gap-3 mb-5 md:mb-6">
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-6 h-6 md:w-7 md:h-7" />
      </div>
      <div className="text-right">
        <div className="text-[11px] md:text-xs font-medium text-primary tracking-wide">
          שלב {num}
        </div>
        <h3 className="text-foreground text-lg md:text-2xl font-light leading-tight">
          {title}
        </h3>
      </div>
    </div>
    <div className="space-y-4 text-right">{children}</div>
  </div>
);

const examItems = [
  {

    title: "תור לכירורגית שד",
    icon: Heart,
    body: (
      <>
        <p>
          <span className="font-medium">מה צפוי לקרות?</span> בדיקה ידנית עדינה (ללא כאב),
          תיעוד התוצאות בכתב, ואת לוקחת איתך את המכתב המודפס לרופא/ה המטפל/ת.
        </p>
        <ul className="list-disc pr-5 space-y-1.5 marker:text-primary">
          <li>עדיף לקבוע דרך מזכירות סניף שבו עובדת כירורגית שד, ולציין שהתור לטיפולי פוריות.</li>
          <li>הרופאה עשויה להפנות לבדיקת המשך (למשל אולטרסאונד שד). זה נוהל מקובל ולא בהכרח מעיד על בעיה.</li>
        </ul>
      </>
    ),
  },
  {
    title: "אולטרסאונד, ספירת זקיקים ובדיקות דם (בימים 2-4 לווסת)",
    icon: Calendar,
    body: (
      <>
        <p>
          <span className="font-medium">מה צפוי לקרות?</span>
        </p>
        <p>
          <span className="font-medium text-primary">אולטרסאונד:</span> מתבצע לאחר שתיית
          מספר כוסות מים למילוי שלפוחית השתן (אין להתפנות עד אחרי הבדיקה). הטכנאית מניחה
          מתמר על הבטן עם ג'ל שקוף, סוקרת את הרחם והשחלות, סופרת ומודדת את הזקיקים.
        </p>
        <p>
          <span className="font-medium text-primary">בדיקות דם:</span> כרגיל - לאחר צום של
          כ-8 שעות, וכ-3 שעות ערנות.
        </p>
        <ul className="list-disc pr-5 space-y-1.5 marker:text-primary">
          <li>שעות הערנות משפיעות רק על ערך הפרולקטין. גם אם לא היית ערה 3 שעות לפני הבדיקה, אפשר לבצע אותה ולנצל את זמן הווסת, ולהשלים את הפרולקטין ביום אחר.</li>
        </ul>
      </>
    ),
  },
];


const HowToStart = () => {
  return (
    <section
      id="start-here"
      className="w-full pt-12 md:pt-20 pb-10 md:pb-16 px-5 md:px-6 bg-gradient-to-b from-accent/20 via-card to-card"
    >
      <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
        {/* Header */}
        <div className="text-right mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 mb-3 px-3.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] md:text-xs font-medium">
            <Heart className="w-3.5 h-3.5" />
            החלטתי לעשות שימור פוריות
          </div>
          <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-3">
            אז מה אני עושה <span className="text-primary font-semibold">עכשיו?</span>
          </h2>
          <p className="text-foreground/75 text-sm md:text-lg font-light leading-relaxed max-w-2xl">
            בכמה צעדים פשוטים. בלי בלגן, בלי לנחש - את עוקבת אחרי השלבים, ואנחנו איתך.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 md:space-y-8">
          {/* Step 1 */}
          <StepCard num="א'" title="קביעת תור לרופא/ת נשים בקופה" icon={Stethoscope}>
            <p className="text-foreground/85 text-sm md:text-base font-light leading-relaxed">
              מדפיסה את הדף שנקרא{" "}
              <a
                href={RX_DOC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                "לרופא נשים"
              </a>
              , קובעת תור בטלפון או במייל לרופא/ת נשים, ומביאה לו את הדף.
            </p>
            <CopyableEmail text={EMAIL_GP} label="נוסח למייל - תור לרופא/ת נשים" />
            <p className="text-foreground/75 text-xs md:text-sm font-light leading-relaxed">
              הרופא/ה ייתן/תיתן לך הפניות לבדיקות דם, אולטרסאונד ובדיקת שד.
            </p>

          </StepCard>

          {/* Step 2 - Exams */}
          <StepCard num="ב'" title="בדיקות מקדימות" icon={Calendar}>
            <p className="text-foreground/85 text-sm md:text-base font-light leading-relaxed">
              עם ההפניות מהקופה, את קובעת תורים לבדיקות הבאות: <span className="font-medium">בדיקות דם, אולטרסאונד ובדיקת שד</span>. אלו הבדיקות שעל סמכן תיבנה תכנית הטיפול שלך.
            </p>
            <Accordion
              type="single"
              collapsible
              className="bg-card/60 rounded-2xl border border-border/60 divide-y divide-border/50 overflow-hidden"
            >
              {examItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <AccordionItem
                    key={idx}
                    value={`item-${idx}`}
                    className="border-b-0 px-3 md:px-5"
                  >
                    <AccordionTrigger className="text-right hover:no-underline py-3.5 md:py-4 [&>svg]:hidden group">
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <span className="flex-1 text-right text-sm md:text-base font-medium text-foreground">
                          {item.title}
                        </span>
                        <ChevronDown className="w-4 h-4 text-foreground/50 transition-transform group-data-[state=open]:rotate-180 shrink-0" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-foreground/80 text-xs md:text-sm font-light leading-relaxed space-y-3 pr-12 md:pr-14 pb-5">
                      {item.body}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </StepCard>

          {/* Step 3 - Hospital */}
          <StepCard num="ג'" title="קביעת תור לרופא פריון בבית החולים שבחרת" icon={Building2}>
            <p className="text-foreground/85 text-sm md:text-base font-light leading-relaxed">
              אחרי שעשית בדיקות דם, אולטרסאונד ובדיקת שד - קובעת תור בטלפון או במייל לרופא הפריון שבחרת בבית החולים שבו בחרת לעשות את השימור.
            </p>
            <CopyableEmail text={EMAIL_HOSPITAL} label="נוסח למייל - תור לבית חולים" />
            <div className="mt-3 rounded-2xl bg-primary/5 border border-primary/15 p-4 md:p-5">
              <div className="flex items-start gap-2.5">
                <Heart className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground/85 text-xs md:text-sm font-light leading-relaxed">
                  אחרי התור, הרופאה תעבור על תוצאות הבדיקות ותיתן פרוטוקול לזריקות. בדרך כלל מדובר בכ-10 ימי זריקות, ואחריהם השאיבה.
                  <br />
                  <span className="font-medium text-foreground">
                    מכאן ואילך - בית החולים אחראי לקרוא לך להדרכת אחות ולהתחלת התהליך.
                  </span>
                </p>
              </div>
            </div>
          </StepCard>
        </div>
      </div>
    </section>
  );
};


export default HowToStart;
