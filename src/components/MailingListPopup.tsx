import { useEffect, useState } from "react";
import { z } from "zod";
import { X } from "lucide-react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { subscribeLead } from "@/lib/subscribeLead";
import popupImage from "@/assets/popup-coffee-flowers.jpg";

const schema = z.object({
  name: z.string().trim().min(1, "נא להזין שם").max(100, "שם ארוך מדי"),
  email: z.string().trim().email("כתובת מייל לא תקינה").max(255, "מייל ארוך מדי"),
});

interface MailingListPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const inputCls =
  "w-full bg-background border border-border rounded-lg py-2.5 px-3 text-foreground placeholder:text-muted-foreground/60 font-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right text-sm";

const labelCls = "block text-foreground/80 text-xs font-light mb-1.5 text-right";

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/CnnZfOgi5yY7EDOvWF2aam";

const MailingListPopup = ({ open, onOpenChange }: MailingListPopupProps) => {
  const [form, setForm] = useState({ name: "", email: "" });
  const [wantsGroup, setWantsGroup] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [noAds, setNoAds] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [groupLinkReady, setGroupLinkReady] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: "", email: "" });
      setWantsGroup(false);
      setIsEligible(false);
      setNoAds(false);
      setGroupLinkReady(false);
    }
  }, [open]);

  const groupReady = wantsGroup && isEligible && noAds;

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
    if (wantsGroup && !groupReady) {
      toast({
        title: "רגע לפני ההצטרפות",
        description: "כדי להצטרף לקהילה בווצאפ יש לסמן את שני האישורים",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await subscribeLead({
      email: result.data.email,
      name: result.data.name,
      source: wantsGroup ? "mailing_popup_whatsapp" : "mailing_popup",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "שגיאה", description: "אירעה שגיאה, נסו שוב", variant: "destructive" });
      return;
    }
    if (groupReady) {
      toast({ title: "תודה!", description: "נרשמת לתפוצה. עכשיו אפשר להצטרף לקהילה בווצאפ." });
      window.open(WHATSAPP_GROUP_URL, "_blank", "noopener,noreferrer");
      setGroupLinkReady(true);
      return;
    }
    toast({ title: "תודה!", description: "נרשמתם בהצלחה לתפוצה." });
    setForm({ name: "", email: "" });
    setWantsGroup(false);
    setIsEligible(false);
    setNoAds(false);
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

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Image side */}
          <div className="md:w-5/12 relative min-h-[180px] md:min-h-full bg-muted overflow-hidden shrink-0">
            <img
              src={popupImage}
              alt="הצטרפות לתפוצה"
              loading="lazy"
              width={1024}
              height={1024}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/20" />
          </div>

          {/* Content side */}
          <div className="md:w-7/12 flex flex-col min-h-0">
            <div className="popup-scroll flex-1 overflow-y-auto px-8 py-10 md:px-12 md:py-12">
              <div className="text-center mb-8">
                <div className="w-12 h-px bg-primary mx-auto mb-5" />
                <h2 className="text-foreground text-2xl md:text-3xl font-light leading-tight tracking-tight mb-3">
                  כמה מתרגשות שאת מצטרפת אלינו
                </h2>
                <p className="text-foreground/70 text-sm md:text-base font-light leading-relaxed max-w-[36ch] mx-auto">
                  נשלח לך את כל העדכונים על אירועים, מפגשים, פרויקטים חדשים ותוכן שיזמין אותך<br />להתחבר לעצמך
                </p>
              </div>

              <form id="mailing-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={labelCls}>שם מלא</label>
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

                <div className="pt-2 border-t border-border/60">
                  <label className="flex items-start gap-3 cursor-pointer text-right">
                    <input
                      type="checkbox"
                      checked={wantsGroup}
                      onChange={(e) => setWantsGroup(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                    />
                    <span className="text-foreground text-sm font-light">
                      רוצה להצטרף גם לקהילה בווצאפ
                    </span>
                  </label>

                  {wantsGroup && (
                    <div className="mt-3 space-y-3 rounded-xl bg-muted/40 border border-border/60 p-3">
                      <p className="text-foreground/70 text-xs font-light text-right">
                        הקהילה מיועדת לרווקות חרדיות מגיל 28 ומעלה. כדי לשלוח בקשת הצטרפות יש לאשר:
                      </p>
                      <label className="flex items-start gap-3 cursor-pointer text-right">
                        <input
                          type="checkbox"
                          checked={isEligible}
                          onChange={(e) => setIsEligible(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                        />
                        <span className="text-foreground/80 text-xs font-light">
                          אני רווקה חרדית מעל גיל 28
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer text-right">
                        <input
                          type="checkbox"
                          checked={noAds}
                          onChange={(e) => setNoAds(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                        />
                        <span className="text-foreground/80 text-xs font-light">
                          אני מתחייבת לא לפרסם פרסומות מכל סוג בקבוצה הפעילה — פרסומות רק בקבוצת הפרסומות
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </form>


              {groupLinkReady && (
                <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-right">
                  <p className="text-foreground text-sm font-light mb-3">
                    נרשמת לתפוצה. אם חלון הווצאפ לא נפתח אוטומטית, אפשר להיכנס מכאן:
                  </p>
                  <a
                    href={WHATSAPP_GROUP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-primary text-primary-foreground py-3 rounded-full font-light tracking-wide hover:bg-[hsl(var(--primary-glow))] transition-all"
                  >
                    מעבר לקהילה בווצאפ
                  </a>
                </div>
              )}

              <p className="mt-8 text-center text-[11px] uppercase tracking-widest text-muted-foreground/70 font-light">
                פרטיות מובטחת • ניתן להסיר בכל עת
              </p>
            </div>

            {/* Sticky footer */}
            <div className="popup-footer sticky bottom-0 px-8 md:px-12 py-4 bg-card border-t border-border/60 shadow-[0_-8px_24px_-12px_hsl(0_0%_0%_/_0.08)]">
              {groupLinkReady ? (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="w-full bg-secondary text-foreground py-3.5 rounded-full font-light tracking-wide hover:bg-muted transition-all duration-500"
                >
                  סגירה
                </button>
              ) : (
                <button
                  type="submit"
                  form="mailing-form"
                  disabled={submitting || (wantsGroup && !groupReady)}
                  className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-light tracking-wide hover:bg-[hsl(var(--primary-glow))] transition-all duration-500 shadow-md shadow-primary/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "שולחת..." : wantsGroup ? "הצטרפות ושליחת בקשה לקהילה" : "הצטרפות"}
                </button>
              )}
            </div>
          </div>
        </div>
    </ResponsiveDialog>
  );
};

export default MailingListPopup;
