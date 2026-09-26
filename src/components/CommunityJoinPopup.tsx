import { useState } from "react";
import { z } from "zod";
import { X } from "lucide-react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { subscribeLead } from "@/lib/subscribeLead";

const schema = z.object({
  name: z.string().trim().min(1, "נא להזין שם").max(100, "שם ארוך מדי"),
  email: z.string().trim().email("כתובת מייל לא תקינה").max(255, "מייל ארוך מדי"),
  phone: z
    .string()
    .trim()
    .min(7, "מספר טלפון לא תקין")
    .max(20, "מספר טלפון ארוך מדי")
    .regex(/^[0-9+\-\s()]+$/, "מספר טלפון לא תקין"),
  over28: z.literal(true, {
    errorMap: () => ({ message: "התפוצה מיועדת לגילאי 28+" }),
  }),
});

interface CommunityJoinPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional override for the audience line (e.g. "גילאי 23-28") */
  audience?: string;
}

const inputCls =
  "w-full bg-background border border-border rounded-lg py-2.5 px-3 text-foreground placeholder:text-muted-foreground/60 font-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right text-sm";

const labelCls = "block text-foreground/80 text-xs font-light mb-1.5 text-right";

const CommunityJoinPopup = ({
  open,
  onOpenChange,
  audience = "אחותי כלה לגילאי 28+",
}: CommunityJoinPopupProps) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", over28: false });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      toast({
        title: "שגיאה",
        description: result.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await subscribeLead({ email: result.data.email, name: (result.data as { name?: string }).name ?? null, source: "community_popup" });
    setSubmitting(false);
    if (error) {
      toast({ title: "שגיאה", description: "אירעה שגיאה, נסו שוב", variant: "destructive" });
      return;
    }
    toast({ title: "תודה!", description: "נרשמת בהצלחה לתפוצה." });
    setForm({ name: "", email: "", phone: "", over28: false });
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <button
        onClick={() => onOpenChange(false)}
        className="absolute top-5 left-5 z-30 p-2 rounded-full text-foreground/60 hover:text-foreground hover:bg-muted transition-colors bg-card/80 backdrop-blur-sm"
        aria-label="סגירה"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-8 py-10 md:px-12 md:py-12">
          <div className="text-center mb-8">
            <div className="w-12 h-px bg-primary mx-auto mb-5" />
            <h2 className="text-foreground text-2xl md:text-3xl font-light leading-tight tracking-tight mb-3">
              מתרגשות שאת מצטרפת אלינו
            </h2>
            <p className="text-foreground/80 text-sm md:text-base font-light leading-relaxed mb-2">
              לתפוצת {audience}
            </p>
            <p className="text-foreground/70 text-sm md:text-base font-light leading-relaxed max-w-[42ch] mx-auto">
              מחכות להכיר אותך מקרוב כדי להתעדכן באירועים מוזמנת למלא את הטופס
            </p>
          </div>

          <form id="community-join-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>השם שלך</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>כתובת מייל</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>טלפון</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </div>

            <label className="flex items-center gap-3 pt-2 cursor-pointer text-right">
              <input
                type="checkbox"
                checked={form.over28}
                onChange={(e) => setForm({ ...form, over28: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-foreground/80 text-sm font-light">
                האם את מעל גיל 28?
              </span>
            </label>
          </form>

          <p className="mt-8 text-center text-[11px] uppercase tracking-widest text-muted-foreground/70 font-light">
            פרטיות מובטחת • ניתן להסיר בכל עת
          </p>
        </div>

        <div className="sticky bottom-0 px-8 md:px-12 py-4 bg-card border-t border-border/60 shadow-[0_-8px_24px_-12px_hsl(0_0%_0%_/_0.08)]">
          <button
            type="submit"
            form="community-join-form"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-light tracking-wide hover:bg-[hsl(var(--primary-glow))] transition-all duration-500 shadow-md shadow-primary/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "שולחת..." : "שמחה להצטרף"}
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};

export default CommunityJoinPopup;
