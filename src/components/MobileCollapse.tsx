import { useState, ReactNode } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";

interface MobileCollapseProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  ctaLabel?: string;
  children: ReactNode;
}

/**
 * Compact teaser card that expands on click - used on both mobile and desktop
 * so heavy tools don't bloat the page until the user opts in.
 */
const MobileCollapse = ({
  title,
  subtitle,
  icon: Icon,
  ctaLabel = "פתחי את הכלי",
  children,
}: MobileCollapseProps) => {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div>
        {children}
        <div className="w-full px-[42px] md:px-6 pb-2" dir="rtl">
          <div className="w-full md:w-[min(1000px,72%)] mx-auto flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-foreground/60 hover:text-primary text-xs font-medium transition-colors"
            >
              <ChevronDown className="w-4 h-4 rotate-180" />
              סגירה
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-[42px] md:px-6 pt-6 md:pt-8 pb-2" dir="rtl">
      <div className="w-full md:w-[min(1000px,72%)] mx-auto">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full bg-gradient-to-br from-card to-accent/30 rounded-2xl border border-primary/15 p-5 md:p-6 text-right shadow-sm hover:shadow-md hover:border-primary/25 active:scale-[0.99] transition-all"
          aria-expanded={open}
        >
          <div className="flex items-center justify-end gap-3">
            <div className="flex-1 text-right min-w-0">
              <h3 className="text-foreground text-base md:text-lg font-semibold leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-foreground/65 text-xs md:text-sm font-light leading-snug mt-1">
                  {subtitle}
                </p>
              )}
              <span className="inline-flex items-center gap-1 mt-3 text-primary text-xs md:text-sm font-medium">
                {ctaLabel} ←
              </span>
            </div>
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default MobileCollapse;
