import { useEffect, useState } from "react";
import { z } from "zod";
import { X } from "lucide-react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import generalImage from "@/assets/popup-contact-general.jpg";
import lectureImage from "@/assets/popup-contact-lecture.jpg";
import workshopImage from "@/assets/popup-contact-workshop.jpg";

export type ContactTab = "general" | "lecture" | "workshop";

const schema = z.object({
  name: z.string().trim().min(1, "נא להזין שם").max(100, "שם ארוך מדי"),
  email: z.string().trim().email("כתובת מייל לא תקינה").max(255, "מייל ארוך מדי"),
  phone: z.string().trim().min(1, "נא להזין טלפון").max(20, "טלפון ארוך מדי"),
  organization: z.string().trim().max(150, "שם ארוך מדי").optional().or(z.literal("")),
  contactPerson: z.string().trim().max(100, "ערך ארוך מדי").optional().or(z.literal("")),
  participants: z.string().trim().max(20, "ערך ארוך מדי").optional().or(z.literal("")),
  date: z.string().trim().max(50, "ערך ארוך מדי").optional().or(z.literal("")),
  topic: z.string().trim().max(200, "ערך ארוך מדי").optional().or(z.literal("")),
  message: z.string().trim().max(1000, "הודעה ארוכה מדי").optional().or(z.literal("")),
});

interface ContactPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: ContactTab;
}

const initial = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  contactPerson: "",
  participants: "",
  date: "",
  topic: "",
  message: "",
};

const tabConfig: Record<ContactTab, { title: string; subtitle: string; image: string; alt: string }> = {
  general: {
    title: "דברו איתי",
    subtitle: "כאן לכל שאלה או פנייה. אחזור אליכם בהקדם.",
    image: generalImage,
    alt: "דברו איתי",
  },
  lecture: {
    title: "להזמנת הרצאה",
    subtitle: "ספרו לי על הקהל והאירוע, ואחזור אליכם להתאמת ההרצאה.",
    image: lectureImage,
    alt: "להזמנת הרצאה",
  },
  workshop: {
    title: "בואו נתפור לכם חוויה במיוחד לצורך שלכם",
    subtitle: "ספרו לי על הקבוצה והנושא, ואבנה איתכם סדנה מותאמת.",
    image: workshopImage,
    alt: "בואו נתכנן סדנה",
  },
};

const inputCls =
  "w-full bg-background border border-border rounded-lg py-2 px-3 text-foreground placeholder:text-muted-foreground/60 font-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right text-xs";

const labelCls = "block text-foreground/80 text-[10px] font-light mb-1 text-right";

const ContactPopup = ({ open, onOpenChange, defaultTab = "general" }: ContactPopupProps) => {
  const [tab, setTab] = useState<ContactTab>(defaultTab);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);

  // Sync defaultTab when popup is opened
  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      toast({ title: "שגיאה", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({ email: result.data.email, name: (result.data as { name?: string }).name ?? null, source: "contact_popup" });
    setSubmitting(false);
    if (error) {
      toast({ title: "שגיאה", description: "אירעה שגיאה, נסו שוב", variant: "destructive" });
      return;
    }
    toast({ title: "תודה!", description: "ההודעה נשלחה, אחזור אליכם בהקדם." });
    setForm(initial);
    onOpenChange(false);
  };

  const cfg = tabConfig[tab];

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
              src={cfg.image}
              alt={cfg.alt}
              loading="lazy"
              width={1024}
              height={1024}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/20" />
          </div>

          {/* Content side */}
          <div className="md:w-7/12 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-5 md:px-12 md:py-10">
              <div className="text-center mb-4">
                <div className="w-12 h-px bg-primary mx-auto mb-3" />
                <h2 className="text-foreground text-xl md:text-[26px] font-light leading-tight tracking-tight mb-1.5">
                  {cfg.title}
                </h2>
                <p className="text-foreground/70 text-xs md:text-sm font-light leading-relaxed max-w-[36ch] mx-auto">
                  {cfg.subtitle}
                </p>
              </div>

              <form id="contact-popup-form" onSubmit={handleSubmit} className="space-y-2.5">
                <div>
                  <label className={labelCls}>השם שלכם</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    maxLength={100}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>טלפון</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    maxLength={20}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>כתובת מייל</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    maxLength={255}
                    className={inputCls}
                  />
                </div>

                {/* Lecture-specific fields */}
                {tab === "lecture" && (
                  <>
                    <div>
                      <label className={labelCls}>שם הארגון / הגוף</label>
                      <input
                        type="text"
                        value={form.organization}
                        onChange={(e) => setForm({ ...form, organization: e.target.value })}
                        maxLength={150}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>מספר משתתפים</label>
                      <input
                        type="text"
                        value={form.participants}
                        onChange={(e) => setForm({ ...form, participants: e.target.value })}
                        maxLength={20}
                        className={inputCls}
                      />
                    </div>
                  </>
                )}

                {/* Workshop-specific fields */}
                {tab === "workshop" && (
                  <>
                    <div>
                      <label className={labelCls}>שם הארגון</label>
                      <input
                        type="text"
                        value={form.organization}
                        onChange={(e) => setForm({ ...form, organization: e.target.value })}
                        maxLength={150}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>איש קשר</label>
                      <input
                        type="text"
                        value={form.contactPerson}
                        onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                        maxLength={100}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>מספר משתתפים</label>
                      <input
                        type="text"
                        value={form.participants}
                        onChange={(e) => setForm({ ...form, participants: e.target.value })}
                        maxLength={20}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>נושא הסדנה</label>
                      <input
                        type="text"
                        value={form.topic}
                        onChange={(e) => setForm({ ...form, topic: e.target.value })}
                        maxLength={200}
                        className={inputCls}
                      />
                    </div>
                  </>
                )}

                {/* תאריך רצוי - only for lecture/workshop */}
                {tab !== "general" && (
                  <div>
                    <label className={labelCls}>תאריך רצוי</label>
                    <input
                      type="text"
                      placeholder="לדוגמה: 15/06/2026"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      maxLength={50}
                      className={inputCls}
                    />
                  </div>
                )}

                <div>
                  <label className={labelCls}>
                    {tab === "general" ? "מה תרצו לכתוב לי" : "הודעה נוספת (אופציונלי)"}
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    maxLength={1000}
                    rows={tab === "general" ? 3 : 2}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </form>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 px-6 md:px-12 py-2.5 bg-card border-t border-border/60 shadow-[0_-8px_24px_-12px_hsl(0_0%_0%_/_0.08)]">
              <button
                type="submit"
                form="contact-popup-form"
                disabled={submitting}
                className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-light tracking-wide hover:bg-[hsl(var(--primary-glow))] transition-all duration-300 shadow-md shadow-primary/20 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "שולחת..." : "שליחה"}
              </button>
            </div>
          </div>
        </div>
    </ResponsiveDialog>
  );
};

export default ContactPopup;
