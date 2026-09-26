import * as React from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Classes applied to the inner container (Dialog content / Drawer content). */
  contentClassName?: string;
  /** Classes applied only on desktop (Dialog). */
  desktopContentClassName?: string;
  /** Classes applied only on mobile (Drawer). */
  mobileContentClassName?: string;
  /** Hide the built-in close button on desktop Dialog. */
  hideCloseButton?: boolean;
  /** Mobile: tapping the dimmed area closes the drawer (off for long forms). */
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
}

/**
 * Renders content inside a centered Dialog on desktop and a bottom Drawer on mobile.
 * Preserves visual styling of children - only the surrounding chrome changes.
 */
export const ResponsiveDialog = ({
  open,
  onOpenChange,
  contentClassName,
  desktopContentClassName,
  mobileContentClassName,
  hideCloseButton,
  closeOnBackdrop = true,
  children,
}: ResponsiveDialogProps) => {
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!isMobile || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobile, open, onOpenChange]);

  if (isMobile) {
    if (!open) return null;
    return createPortal(
      <div className="fixed inset-0 z-50" role="presentation">
        <div
          className="absolute inset-0 bg-foreground/50 backdrop-blur-[2px] animate-in fade-in-0 duration-300 motion-reduce:animate-none"
          onClick={() => closeOnBackdrop && onOpenChange(false)}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="פתיחה"
          dir="rtl"
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex h-auto max-h-[92dvh] flex-col overflow-hidden rounded-t-[28px] bg-card shadow-[var(--shadow-card)] animate-in slide-in-from-bottom-6 fade-in-0 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none",
            contentClassName,
            mobileContentClassName,
          )}
        >
            <div className="relative shrink-0">
              <div className="mx-auto mt-2.5 mb-1 h-1.5 w-12 rounded-full bg-muted" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="סגירה"
                className="absolute left-3 top-1 grid h-8 w-8 place-items-center rounded-full bg-muted/70 text-muted-foreground transition-colors active:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {children}
            </div>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className={cn(
          "max-w-[820px] p-0 overflow-hidden rounded-[32px] border-0 bg-card shadow-[0_32px_64px_-16px_hsl(0_0%_0%_/_0.18)] max-h-[92vh] flex flex-col gap-0",
          hideCloseButton && "[&>button]:hidden",
          contentClassName,
          desktopContentClassName,
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default ResponsiveDialog;
