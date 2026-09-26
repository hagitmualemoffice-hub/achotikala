/**
 * מצב ריק אחד לכל ליבה.
 *
 * Every empty screen explains why it is empty, what will show up here later,
 * and — when there is something sensible to do — offers one way forward.
 * The wording and the actions always come from the screen itself, so no two
 * empty states feel identical.
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
  /** tighter version for inner lists and drawers */
  compact?: boolean;
  className?: string;
};

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondary,
  compact = false,
  className = "",
}: EmptyStateProps) => (
  <div
    dir="rtl"
    className={`flex flex-col items-center justify-center text-center ${
      compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14"
    } ${className}`}
  >
    {Icon && (
      <span
        className={`grid place-items-center rounded-full bg-primary/[0.08] text-primary/70 ${
          compact ? "h-10 w-10" : "h-14 w-14"
        }`}
      >
        <Icon className={compact ? "h-4.5 w-4.5" : "h-6 w-6"} strokeWidth={1.6} />
      </span>
    )}
    <p className={`font-light text-foreground ${compact ? "text-[14px]" : "text-[16.5px]"}`}>{title}</p>
    {description && (
      <p
        className={`max-w-sm font-light leading-relaxed text-muted-foreground ${
          compact ? "text-[12.5px]" : "text-[13.5px]"
        }`}
      >
        {description}
      </p>
    )}
    {(action || secondary) && (
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="rounded-full bg-primary px-4 py-2 text-[13px] font-normal text-primary-foreground transition-opacity hover:opacity-90"
          >
            {action.label}
          </button>
        )}
        {secondary && (
          <button
            type="button"
            onClick={secondary.onClick}
            className="rounded-full border border-border px-4 py-2 text-[13px] font-light text-foreground transition-colors hover:bg-muted"
          >
            {secondary.label}
          </button>
        )}
      </div>
    )}
  </div>
);

export default EmptyState;
