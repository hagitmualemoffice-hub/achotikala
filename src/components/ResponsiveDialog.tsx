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
            "fixed inset-x-0 bottom-0 z-50 flex h-auto max-h-[94dvh] flex-col overflow-hidden rounded-t-[24px] border-x border-t border-border/60 bg-card shadow-[0_-18px_55px_-24px_hsl(var(--foreground)_/_0.32)] animate-in slide-in-from-bottom-6 fade-in-0 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none",
            contentClassName,
            mobileContentClassName,
          )}
        >
            <div className="relative z-20 h-12 shrink-0 border-b border-border/50 bg-card/95 backdrop-blur-md">
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/25" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="סגירה"
                className="absolute left-3 top-2 grid h-8 w-8 place-items-center rounded-full bg-muted/80 text-foreground transition-colors active:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card [&_.popup-scroll]:min-h-0 [&_.popup-scroll]:flex-1 [&_.popup-scroll]:overflow-y-auto [&_.popup-scroll]:overscroll-contain [&_.popup-footer]:sticky [&_.popup-footer]:bottom-0 [&_.popup-footer]:z-10 [&_.popup-footer]:shrink-0 [&_.popup-footer]:border-t [&_.popup-footer]:border-border/60 [&_.popup-footer]:bg-card/95 [&_.popup-footer]:pb-[max(1rem,env(safe-area-inset-bottom))] [&_.popup-footer]:backdrop-blur-md">
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
          "max-w-[820px] p-0 overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-[0_32px_64px_-16px_hsl(var(--foreground)_/_0.18)] max-h-[92vh] flex flex-col gap-0 [&_.popup-scroll]:min-h-0 [&_.popup-scroll]:flex-1 [&_.popup-scroll]:overflow-y-auto [&_.popup-footer]:shrink-0 [&_.popup-footer]:border-t [&_.popup-footer]:border-border/60 [&_.popup-footer]:bg-card",
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
