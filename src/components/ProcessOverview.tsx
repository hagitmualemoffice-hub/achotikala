import { Stethoscope, HeartPulse, Snowflake, Telescope } from "lucide-react";

/* ============================================================
 * ProcessOverview - "מבט על"
 * High-level 3-phase map of the fertility preservation process.
 * Mobile uses the page's standard px-[42px] margins; the timeline
 * collapses into a stacked icon+title header so the body text keeps
 * a comfortable measure even inside the narrower column.
 * ============================================================ */

type Phase = {
  title: string;
  duration: string;
  icon: React.ComponentType<{ className?: string }>;
  body: string;
};

const phases: Phase[] = [
  {
    title: "הכנה ובדיקות",
    duration: "תיאום ציפיות",
    icon: Stethoscope,
    body: "התהליך מתחיל בפגישה עם רופאת פוריות ובביצוע בדיקות מקדימות. הבדיקות נועדו להכיר את הגוף שלך, להבין את מצב השחלות, ולהתאים עבורך תכנית טיפול אישית. זהו שלב של איסוף מידע ותיאום ציפיות, ולא של פעולה אינטנסיבית. עבור רבות מהנשים, עצם ההתחלה כבר מעוררת רגשות - התרגשות לצד חשש - ושניהם לגיטימיים.",
  },
  {
    title: "טיפול הורמונלי ומעקב רפואי",
    duration: "10-14 ימים",
    icon: HeartPulse,
    body: "לאחר שלב ההכנה מתחיל הטיפול עצמו. במקביל מתקיימים טיפול הורמונלי בזריקות יומיות ומעקב רפואי צמוד. הטיפול נמשך לרוב בין עשרה ימים לשבועיים, ומטרתו לגרום לכך שבאותו מחזור חודשי יבשילו כמה ביציות במקביל, ולא רק ביצית אחת.\n\nבמהלך התקופה הזו את מגיעה לבדיקות דם ואולטרסאונד, שמאפשרות לצוות לראות כיצד הגוף מגיב לטיפול, להתאים מינונים, ולבחור את העיתוי המדויק לשלב הבא. שלב שדורש התארגנות, הקפדה על זמנים ולעיתים גם סבלנות - אך הוא מלווה מקרוב, ולא מתרחש לבד.",
  },
  {
    title: "שאיבת הביציות",
    duration: "אשפוז יום",
    icon: Snowflake,
    body: "כאשר הביציות מגיעות לבשלות, מתבצעת שאיבת ביציות בהרדמה קצרה, במסגרת אשפוז יום. ההליך עצמו אורך זמן קצר, ולאחריו יש שהות בהתאוששות והשגחה. בסיום השאיבה הביציות הבשלות מועברות להקפאה ונשמרות לשימוש עתידי.",
  },
];

const ProcessOverview = () => {
  return (
    <section
      id="process-overview"
      className="w-full pt-12 md:pt-20 pb-10 md:pb-16 px-[42px] md:px-6"
    >
      <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
        {/* Header */}
        <div className="text-right mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 mb-3 px-3.5 py-1 rounded-full bg-accent text-accent-foreground text-[11px] md:text-xs font-medium">
            <Telescope className="w-3.5 h-3.5" />
            מבט על
          </div>
          <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-3">
            כל התהליך <span className="text-primary font-semibold">בשלושה שלבים</span>
          </h2>
          <p className="text-foreground/75 text-sm md:text-lg font-light leading-relaxed max-w-2xl">
            תהליך שימור הפוריות הוא תהליך רפואי תחום בזמן, שמורכב ממספר שלבים ברורים. יש לו התחלה, אמצע וסיום - וזה בדיוק מה שעושה אותו פשוט יותר.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* vertical rail - desktop only; mobile uses a stacked header per card */}
          <div className="hidden md:block absolute top-2 bottom-2 right-[31px] w-px bg-gradient-to-b from-primary/40 via-primary/25 to-transparent" />

          <div className="space-y-5 md:space-y-8">
            {phases.map((phase) => {
              const Icon = phase.icon;
              return (
                <div key={phase.title} className="relative md:flex md:gap-6">
                  {/* Desktop dot */}
                  <div className="hidden md:block relative shrink-0 z-10">
                    <div className="w-[62px] h-[62px] rounded-full bg-gradient-to-br from-card to-accent/40 border border-primary/25 shadow-[0_10px_25px_-10px_hsl(var(--primary)/0.45)] flex items-center justify-center text-primary">
                      <Icon className="w-7 h-7 stroke-[1.4]" />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-card rounded-3xl border border-border/60 shadow-[0_15px_40px_-20px_hsl(0_0%_0%_/_0.12)] p-5 md:p-7 text-right">
                    {/* Mobile header: icon + title in one row, duration pill below */}
                    <div className="md:hidden flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-accent/60 to-card border border-primary/25 shadow-[0_6px_14px_-6px_hsl(var(--primary)/0.45)] flex items-center justify-center text-primary">
                        <Icon className="w-5 h-5 stroke-[1.4]" />
                      </div>
                      <h3 className="text-foreground text-lg font-light leading-tight flex-1">
                        {phase.title}
                      </h3>
                    </div>
                    <div className="md:hidden mb-3">
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-accent/60 text-accent-foreground text-[10px] font-medium">
                        {phase.duration}
                      </span>
                    </div>

                    {/* Desktop header */}
                    <div className="hidden md:flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                      <h3 className="text-foreground text-2xl font-light leading-tight">
                        {phase.title}
                      </h3>
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-accent/60 text-accent-foreground text-xs font-medium">
                        {phase.duration}
                      </span>
                    </div>

                    <p className="text-foreground/80 text-sm md:text-base font-light leading-relaxed whitespace-pre-line">
                      {phase.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Closing note */}
        <div className="mt-8 md:mt-12 rounded-3xl bg-primary/5 border border-primary/15 p-5 md:p-7 text-right">
          <p className="text-foreground/85 text-sm md:text-base font-light leading-relaxed">
            גם אם התהליך דורש התמסרות זמנית, הידיעה שיש לו גבולות מוגדרים וליווי צמוד יכולה להעניק תחושת יציבות וביטחון בתוך הדרך.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProcessOverview;

