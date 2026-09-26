import { useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Headphones, PenLine, ArrowLeft, Sparkles } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { subscribeLead } from "@/lib/subscribeLead";
import ContactPopup, { type ContactTab } from "@/components/ContactPopup";
import MobileBottomNav from "@/components/MobileBottomNav";
import heroBg from "@/assets/hero-bg.webp";
import projectsBg from "@/assets/woman-beach-projects.webp";
import podcastCover from "@/assets/podcast-cover.png";

const emailSchema = z
  .string()
  .trim()
  .email("כתובת מייל לא תקינה")
  .max(255, "מייל ארוך מדי");

const lectureTopics = [
  "חיים בגלים",
  "להרוג חלומות",
  "חיבור לייעוד",
  "תנועה מתוך חרדה",
  "לחיות את הרגע הזה",
];

const pillars = [
  {
    icon: Mic,
    title: "הרצאות",
    text: "שיחות על חיים בתוך מורכבות, החלטות ותנועה מתוך חוסר ודאות",
  },
  {
    icon: Sparkles,
    title: "סדנאות",
    text: "מרחבים לחשיבה, חיבור ופעולה מתוך המציאות כפי שהיא",
  },
  {
    icon: PenLine,
    title: "תוכן",
    text: "כתיבה והקלטות על החיים כשהם לא מסתדרים",
  },
];

const IndexV2 = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [contactTab, setContactTab] = useState<ContactTab>("general");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openContact = (tab: ContactTab) => {
    setContactTab(tab);
    setContactOpen(true);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast({ title: "שגיאה", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await subscribeLead({ email: result.data, source: "inline_form" });
    setSubmitting(false);
    if (error) {
      toast({ title: "שגיאה", description: "אירעה שגיאה, נסו שוב", variant: "destructive" });
      return;
    }
    toast({ title: "תודה!", description: "נרשמתם בהצלחה." });
    setEmail("");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground font-light">
      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-background/95 via-background/70 to-background/30" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-28 w-full">
          <div className="max-w-2xl text-right ml-auto">
            <div className="w-12 h-px bg-primary mb-6 ml-auto" />
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-light leading-tight tracking-tight mb-3">
              לבנות את עצמך
              <br />
              מתוך המציאות כמו שהיא
            </h1>
            <p className="text-lg md:text-2xl text-foreground/70 font-light mb-6">
              גם כשהיא מורכבת
            </p>
            <p className="text-sm md:text-base text-foreground/60 leading-relaxed mb-10 max-w-xl ml-auto">
              הרצאות · סדנאות · תוכן על חיים בתוך מורכבות ותנועה מתוך חוסר ודאות
            </p>
            <div className="flex flex-wrap gap-3 justify-end">
              <Link
                to="/podcast"
                className="px-7 py-3 rounded-full bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-glow))] transition-all duration-500 shadow-md shadow-primary/20 text-sm tracking-wide"
              >
                להאזין / לקרוא
              </Link>
              <button
                onClick={() => openContact("lecture")}
                className="px-7 py-3 rounded-full border border-primary/40 text-foreground hover:bg-primary/5 transition-all duration-500 text-sm tracking-wide"
              >
                להזמנת הרצאה
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT'S HERE */}
      <section className="py-20 md:py-28 px-6 md:px-10 bg-card/40">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-12 h-px bg-primary mx-auto mb-6" />
          <h2 className="text-2xl md:text-4xl font-light tracking-tight mb-10">מה קורה כאן</h2>
          <div className="space-y-4 text-base md:text-lg text-foreground/75 leading-loose">
            <p>זה מרחב של מחשבה על החיים כפי שהם</p>
            <p>על תקופות שבהן דברים לא מסתדרים</p>
            <p>על מצבים שאין להם תשובה אחת נכונה</p>
            <p>על הפער בין מה שרצינו לבין מה שיש</p>
            <p className="text-foreground/90">ועל איך ממשיכים לחיות, לבחור ולנוע מתוך זה</p>
          </div>
        </div>
      </section>

      {/* WHERE TO MEET */}
      <section className="py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="w-12 h-px bg-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-4xl font-light tracking-tight">איפה פוגשים אותי</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="bg-card border border-border/60 rounded-2xl p-8 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-light mb-3">{title}</h3>
                <p className="text-sm text-foreground/65 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LECTURES & WORKSHOPS */}
      <section className="py-20 md:py-28 px-6 md:px-10 bg-card/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-12 h-px bg-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-4xl font-light tracking-tight mb-4">
              הרצאות וסדנאות
            </h2>
            <p className="text-foreground/65 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
              הרצאות וסדנאות על איך חיים, בוחרים ונעים
              <br />
              בתוך מציאות שלא תמיד מסתדרת
            </p>
          </div>

          <ul className="grid sm:grid-cols-2 gap-3 md:gap-4 mb-12">
            {lectureTopics.map((topic) => (
              <li
                key={topic}
                className="bg-card border border-border/60 rounded-xl px-5 py-4 text-right text-foreground/80 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                {topic}
              </li>
            ))}
          </ul>

          <div className="text-center">
            <Link
              to="/lectures"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-glow))] transition-all duration-500 shadow-md shadow-primary/20 text-sm tracking-wide"
            >
              לכל ההרצאות והסדנאות
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section className="py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="relative aspect-[4/5] rounded-3xl overflow-hidden order-last md:order-first">
            <img src={projectsBg} alt="פרויקטים" className="w-full h-full object-cover" />
          </div>
          <div className="text-right">
            <div className="w-12 h-px bg-primary mb-6 ml-auto" />
            <h2 className="text-2xl md:text-4xl font-light tracking-tight mb-6">
              פרויקטים ויוזמות
            </h2>
            <div className="space-y-3 text-foreground/75 leading-relaxed text-sm md:text-base">
              <p>לצד העבודה הקלינית, אני גם פועלת בעולם.</p>
              <p>היוזמות שאני בונה נולדות מתוך מפגש עם מציאות שבה חסר מענה - רגשי, חברתי או אנושי.</p>
              <p>זה ניסיון לקחת חוויה מורכבת ולהפוך אותה למשהו שאפשר לפגוש, לדבר עליו ולעבור אחרת.</p>
              <p className="text-foreground/85">
                בין היתר: קהילות ויוזמות סביב רווקות מאוחרת ושימור פוריות, כחלק מעיסוק רחב יותר בשאלות של זמן, בחירה וזהות.
              </p>
            </div>
            <div className="mt-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-primary/40 text-foreground hover:bg-primary/5 transition-all duration-500 text-sm tracking-wide"
              >
                לפרויקטים
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PODCAST & CONTENT */}
      <section className="py-20 md:py-28 px-6 md:px-10 bg-card/40">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="text-right">
            <div className="w-12 h-px bg-primary mb-6 ml-auto" />
            <h2 className="text-2xl md:text-4xl font-light tracking-tight mb-6">
              תוכן ופודקאסט
            </h2>
            <div className="space-y-3 text-foreground/75 leading-relaxed text-sm md:text-base mb-8">
              <p>פודקאסט וכתיבה על איך אנשים מוצאים בתוכם דרך</p>
              <p>לפגוש את המציאות - ולנוע מתוכה.</p>
              <p className="text-foreground/85">מחשבות ושיחות מתוך החיים עצמם.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/podcast"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-glow))] transition-all duration-500 shadow-md shadow-primary/20 text-sm tracking-wide"
              >
                <Headphones className="w-4 h-4" />
                להאזנה
              </Link>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-primary/40 text-foreground hover:bg-primary/5 transition-all duration-500 text-sm tracking-wide"
              >
                <PenLine className="w-4 h-4" />
                לקריאה
              </Link>
            </div>
          </div>
          <div className="relative aspect-square rounded-3xl overflow-hidden max-w-sm mx-auto w-full">
            <img src={podcastCover} alt="פודקאסט" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* SUBSCRIBE */}
      <section className="py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-12 h-px bg-primary mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-4">הצטרפות</h2>
          <div className="space-y-2 text-foreground/70 text-sm md:text-base leading-relaxed mb-8">
            <p>אני משתפת מחשבות על החיים תוך כדי תנועה</p>
            <p>לא כסיכומים סגורים, אלא כתהליך חי.</p>
            <p className="text-foreground/85">מוזמנת להצטרף.</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="כתובת מייל"
              className="flex-1 bg-background border border-border rounded-full py-3 px-5 text-right text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-3 rounded-full bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-glow))] transition-all duration-500 shadow-md shadow-primary/20 text-sm tracking-wide disabled:opacity-60"
            >
              {submitting ? "שולחת..." : "להצטרפות"}
            </button>
          </form>
        </div>
      </section>

      {/* CLOSING */}
      <section className="py-24 md:py-32 px-6 md:px-10 bg-gradient-to-b from-card/40 to-background">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-px bg-primary mx-auto mb-8" />
          <p className="text-xl md:text-3xl font-light leading-relaxed text-foreground/85">
            לא תמיד הדברים מסתדרים
            <br />
            אבל אפשר לבנות את עצמנו מתוכם
          </p>
        </div>
      </section>

      <div className="md:hidden h-20" />
      <MobileBottomNav />
      <ContactPopup open={contactOpen} onOpenChange={setContactOpen} defaultTab={contactTab} />
    </div>
  );
};

export default IndexV2;
