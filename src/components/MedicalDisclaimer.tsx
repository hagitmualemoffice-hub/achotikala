import { Info } from "lucide-react";

/**
 * Medical / liability disclaimer.
 * Reused on the main fertility page and on every series page so the
 * "this is knowledge, not medical advice" framing is unmissable.
 *
 * variant="inline"  - subtle banner inside the page flow
 * variant="footer"  - stronger framed box for the bottom of a page
 */
const MedicalDisclaimer = ({
  variant = "inline",
}: {
  variant?: "inline" | "footer";
}) => {
  const isFooter = variant === "footer";

  return (
    <aside
      dir="rtl"
      role="note"
      aria-label="הבהרה חשובה"
      className={
        isFooter
          ? "w-[calc(100%-84px)] md:w-[min(1000px,72%)] mx-auto my-10 md:my-14 px-5 md:px-7 py-5 md:py-6 rounded-2xl border border-primary/20 bg-accent/40"
          : "w-[calc(100%-84px)] md:w-[min(1000px,72%)] mx-auto mt-4 mb-2 px-4 md:px-5 py-3 md:py-3.5 rounded-xl border border-border/70 bg-card/70"
      }
    >
      <div className="flex items-start gap-2.5 md:gap-3">
        <Info
          className={`${isFooter ? "w-5 h-5" : "w-4 h-4"} text-primary shrink-0 mt-0.5`}
          aria-hidden="true"
        />
        <div className="text-foreground/75 text-[12px] md:text-[13px] font-light leading-relaxed">
          <span className="font-semibold text-foreground/90">חשוב לדעת: </span>
          המידע באתר הזה הוא <span className="font-medium">הצעה של ידע</span> -
          הוא נאסף באהבה, מתוך הקשבה לנשים שעברו את התהליך, ומתוך רצון להציע לך
          מקום להבין ולבחור.
          <span className="block mt-1">
            <span className="font-medium">אין לראות בו ייעוץ רפואי, אבחנה רפואית או "שורה תחתונה"</span>
            , והוא אינו מחליף התייעצות עם רופאה, רופא פוריות או כל גורם רפואי
            מוסמך אחר. כל החלטה רפואית כדאי לקבל בליווי הצוות שמכיר אותך ואת
            הנתונים שלך.
          </span>
        </div>
      </div>
    </aside>
  );
};

export default MedicalDisclaimer;
