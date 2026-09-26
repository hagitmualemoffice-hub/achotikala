import { Eye, X } from "lucide-react";
import { usePreviewMode, exitPreviewMode } from "@/lib/previewMode";

export default function PreviewBanner() {
  const on = usePreviewMode();
  if (!on) return null;
  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-full bg-foreground text-background shadow-lg px-4 py-2 text-sm"
    >
      <Eye className="h-4 w-4" />
      <span>מצב תצוגה מקדימה — מוצג גם תוכן שאינו מפורסם</span>
      <button
        onClick={exitPreviewMode}
        className="ms-1 rounded-full bg-background/10 hover:bg-background/20 p-1"
        aria-label="יציאה מתצוגה מקדימה"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
