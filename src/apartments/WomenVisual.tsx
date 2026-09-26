import { cn } from "@/lib/utils";
import type { Listing, ListingType } from "./types";

type Shape = { filled: number; open: number; caption: string };

export function womenShape(l: Listing): Shape {
  const t = l.listing_type as ListingType;
  if (t === "roommate_wanted") {
    const filled = l.current_women ?? 0;
    const open = l.seeking_count ?? 0;
    return {
      filled,
      open,
      caption: `${filled} בדירה · מחפשות עוד ${open}`,
    };
  }
  if (t === "building_new") {
    const open = l.seeking_count ?? 0;
    return { filled: 1, open, caption: `אני + ${open} שותפות` };
  }
  if (t === "sublet") {
    const filled = l.total_women ?? 0;
    return { filled, open: 0, caption: `${filled} בנות בדירה בתקופה` };
  }
  const open = l.max_roommates ?? 0;
  return {
    filled: 0,
    open,
    caption: open >= 5 ? "פתוחה ל-5 שותפות ומעלה" : `פתוחה לדירה של עד ${open} שותפות`,
  };
}

const CAP = 8;

/** סילואטה נשית מלאה: שיער ארוך רחב, ראש וכתפיים */
const HEAD_PATH =
  "M12 1.6c-3.9 0-6.4 2.9-6.4 6.9 0 1.9.1 3.3-.5 4.7-.3.8.1 1.4 1.1 1.7 1.4.4 2.8.6 3.6.7h4.4c.8-.1 2.2-.3 3.6-.7 1-.3 1.4-.9 1.1-1.7-.6-1.4-.5-2.8-.5-4.7 0-4-2.5-6.9-6.4-6.9z";
const SHOULDERS_PATH = "M12 15.1c-4.7 0-8.4 2.5-8.4 5.7V22.4h16.8v-1.6c0-3.2-3.7-5.7-8.4-5.7z";

/** מספר הבנות שיהיו בדירה — לתצוגה קומפקטית על הכרטיסיה */
export function womenCount(l: Listing): number | null {
  const t = l.listing_type as ListingType;
  if (t === "roommate_wanted") return (l.current_women ?? 0) + (l.seeking_count ?? 0) || null;
  if (t === "building_new") return 1 + (l.seeking_count ?? 0) || null;
  if (t === "sublet") return l.total_women ?? null;
  return l.max_roommates ?? null;
}

export const WomanFilled = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d={HEAD_PATH} fill="currentColor" />
    <path d={SHOULDERS_PATH} fill="currentColor" />
  </svg>
);

const WomanOpen = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeDasharray="2.5 2"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d={HEAD_PATH} />
    <path d={SHOULDERS_PATH} />
  </svg>
);

const WomenVisual = ({
  listing,
  size = "md",
  showCaption = true,
  className,
  color,
}: {
  listing: Listing;
  size?: "sm" | "md";
  showCaption?: boolean;
  className?: string;
  /** צבע הדמויות; ברירת מחדל ורוד של האתר */
  color?: string;
}) => {
  const { filled, open, caption } = womenShape(listing);
  if (filled + open <= 0) return null;

  const f = Math.min(filled, CAP);
  const o = Math.min(open, Math.max(0, CAP - f));
  const ico = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const style = color ? { color } : undefined;

  return (
    <div className={cn("space-y-1.5 text-right", className)}>
      <div
        className={cn("flex items-center gap-1.5 flex-wrap justify-start", !color && "text-primary")}
        style={style}
        aria-hidden
      >
        {Array.from({ length: f }).map((_, i) => (
          <WomanFilled key={`f${i}`} className={ico} />
        ))}
        {Array.from({ length: o }).map((_, i) => (
          <WomanOpen key={`o${i}`} className={cn(ico, "opacity-70")} />
        ))}
      </div>
      {showCaption && (
        <p className="text-xs text-muted-foreground truncate">
          {caption}
          <span className="sr-only"> (המחשה ויזואלית של מספר הבנות בדירה)</span>
        </p>
      )}
    </div>
  );
};

export default WomenVisual;
