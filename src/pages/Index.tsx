import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sprout, Lightbulb, Users, Rocket, MessageCircleHeart, Heart, Gem, UserRound } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { subscribeLead } from "@/lib/subscribeLead";
import MailingListPopup from "@/components/MailingListPopup";

import ContactPopup, { type ContactTab } from "@/components/ContactPopup";
import HostingPopup from "@/components/HostingPopup";
import MobileBottomNav from "@/components/MobileBottomNav";
import SiteHeader from "@/components/SiteHeader";
import logo from "@/assets/logo-achoti-kala.png";
import ExpandableText from "@/components/ExpandableText";
import MagazinesStrip from "@/components/MagazinesStrip";
import heroBg from "@/assets/hero-sisters.webp";
import { FileText, Mic, CalendarDays, ArrowLeft } from "lucide-react";
import lectureBg from "@/assets/woman-beach.webp";
import projectsBg from "@/assets/woman-beach-projects.webp";
import podcastCover from "@/assets/podcast-cover.png";
import yotzotYearImg from "@/assets/yotzot-laor-year.jpg";
import contactHeart from "@/assets/contact-heart-bubble.png";
import aboutBg from "@/assets/image-91.png.asset.json";
import girlHug from "@/assets/girl-hug.png";

import heartBubble from "@/assets/heart-bubble.png";
import concernBubble from "@/assets/concern-bubble.png";
import testimonialSmile from "@/assets/testimonial-smile.png";
import testimonialHearts from "@/assets/testimonial-hearts.png";
import testimonialHeart from "@/assets/testimonial-heart.png";

import testimonialLove from "@/assets/testimonial-love.png";
import { blogPosts as allBlogPosts } from "@/data/blogPosts";
import { useEvents } from "@/hooks/useEvents";
import { useDbPosts } from "@/hooks/useDbPosts";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import DonationCTA from "@/components/DonationCTA";

const podcastEpisodes = [
  {
    num: "1",
    title: "על חיבור לגוף עם נעם ארז",
    driveUrl: "https://drive.google.com/file/d/1kEgTm8iRMiUmhaZ6Si4HXalrsmF2HKR5/view?usp=drive_link",
  },
  {
    num: "2",
    title: 'על הקשבה לגוף עם ד"ר מיכל פרנסט',
    driveUrl: "https://drive.google.com/file/d/1w628JudX26Cx5_1szSSlCpO4mOGlolo7/view?usp=sharing",
  },
  {
    num: "3",
    title: "על חרדה והימנעות עם דורית בנגד אלבד",
    driveUrl: "https://drive.google.com/file/d/1sobWuQQdj3UCgq0z40kI2zZxSchr1pyQ/view?usp=drive_link",
  },
  {
    num: "4",
    title: 'על התהליך עצמו עם ד"ר ירדנה היימן',
    driveUrl: "https://drive.google.com/file/d/1E6uK-c1ABAzDFdKcBvgJRcXMAIPskOxk/view?usp=drive_link",
  },
  {
    num: "5",
    title: 'מערכת, חברה וחדשנות עם ד"ר אביה רוזנטל',
    driveUrl: "https://drive.google.com/file/d/1bszskgaChQgQ5iQRr8eYFwzTNvo5a8Cj/view?usp=sharing",
  },

];


type ProjectButton = {
  label: string;
  href?: string;
  action?: "mailing" | "hosting";
};

const projectCards: Array<{
  title: string;
  paragraphs: string[];
  buttons: ProjectButton[];
}> = [
  {
    title: "אחותי כלה- פרויקט חדשני לרווקות מאוחרת",
    paragraphs: [
      "אחותי כלה הוא פרויקט יוזמי-קהילתי שנבנה מתוך הקשבה עמוקה לצורך ממשי, חי ופועם. מעטפת חדשנית לנשים רווקות מהמגזר החרדי מעל גיל 28, הפרויקט נולד מתוך הקשבה לצורך ממשי, עמוק ומתמשך - צורך שלא קיבל מענה מערכתי, רגשי וקהילתי, על אף היקפו הרחב.",
      "היוזמה אינה תוצר של מבנה ארגוני קיים, אלא תהליך יוזמי מודע שנבנה צעד-צעד: מתוך אפיון עמוק של הצרכים, הקשבה מתמשכת לנשים עצמן, עבודה עם אמפתיה ודיוק עצמי - והתאמה מתמדת של הפתרונות תוך כדי תנועה. זהו ביטוי חי ליזמות קשובה: יזמות שאינה מתחילה בפתרון, אלא בהבנה. לא במודל מראש, אלא בנכונות לשהות בשאלה, לדייק, ולהנהיג תהליך שיש בו אחריות, עומק וראייה אנושית.",
      "כיום, אחותי כלה היא תנועה חיה של קרוב ל-1,000 נשים, תנועה שמתרחבת הודות לכוח המיוחד של השותפות לפרויקט הזה ומתמשכת מתוך הקשבה, דיוק והליכה עקבית בדרך.",
    ],
    buttons: [
      { label: "להצטרפות לתפוצה", href: "https://achotikala.com/#grup" },
      { label: "בקרי באתר אחותי כלה", href: "https://achotikala.com/" },
    ],
  },
  {
    title: "שימור פוריות - מוצאות בתוכנו דרך להתחבר לזה.\nפרויקט שנולד מתוך מחקר אקדמי, הקשבה ויישום בשטח.",
    paragraphs: [
      "הפרויקט צמח מתוך עבודת התזה שלי, שעסקה בשימור פוריות ובחוויה הנפשית של נשים ושאלה שאלה בסיסית שעוד לא נשאלה: איך אישה מרגישה אחרי שימור פוריות?",
      "המחקר חשף את האתגרים הרגשיים והחרדה המלווים את התהליך, והצביע על הצורך בליווי, החזקה וכלים שיאפשרו לנשים להיות בתוך התהליך ולא להישאר בו לבד. כיישום של המחקר, אני מפתחת ומובילה פרויקטים המשלבים הבנה פסיכולוגית, מחקר אקדמי ויישום מדויק בשדה.",
      "בין הפרויקטים: פודקאסט ייעודי, קובץ מידע נגיש, מקרר תרופות שיתופי, יזמות ליווי קהילתיות, פעילות לשינוי מדיניות, והכשרת צוותים רפואיים על החוויה הנפשית בתהליכי שימור פוריות.",
    ],
    buttons: [
      {
        label: "לאתר יודעת - שימור פוריות",
        href: "/shimur-poriut",
      },
      {
        label: "הפודקאסט",
        href: "https://open.spotify.com/show/2FIal7yOO7htlBkKUwCbxW?si=dtVPb1AQQomBBOTazo3hWA",
      },
      {
        label: "מקרר התרופות השיתופי",
        href: "https://docs.google.com/spreadsheets/d/1fgakciTdJORHhOip1MwBzUrU4k0H15f5IZY6Liewdi0/edit?gid=0#gid=0&fvid=709051320",
      },
    ],
  },
  {
    title: "רפואה רגישה: כשידע רפואי פוגש חוויה אנושית",
    paragraphs: [
      "סדנאות והרצאות לצוותות רפואיים המלווים תהליכים נשיים ותהליכי פריון - בהם מחלקות IVF, צוותי אולטרסאונד, מרפאות נשים וצוותים רב-מקצועיים בבתי חולים. העבודה מבוססת על מחקר, ידע פסיכולוגי וחשיבה מערכתית, וממוקדת בהבנת החוויה הנפשית של נשים בתוך תהליכים רפואיים אינטנסיביים. הסדנאות מעניקות כלים להקשבה, הכלה ותקשורת מותאמת, מתוך הבנה שהמפגש האנושי משפיע באופן ישיר על איכות הטיפול, שיתוף הפעולה וההתליך הרפואי כולו.",
      "העבודה מותאמת לצרכים הייחודיים של כל צוות - במטרה לאפשר טיפול מקצועי, אנושי ומדויק יותר. מתאים לישיבות צוות, כנסים אירועים מחלקתיים או הרצאת אורח כחלק מתהליך עומק.",
    ],
    buttons: [{ label: "אשמח להתארח אצלכם במחלקה", action: "hosting" }],
  },
];

type LectureCard = {
  title: string;
  subtitle: string;
  desc: string;
  audience: string;
  badges?: string[];
};

const lectureCards: LectureCard[] = [
  {
    title: "החיים שנועדו לי",
    subtitle: "חיבור לייעוד, לבהירות פנימית ולכיוון אישי - ככוח לחיים מלאים ומשמעותיים",
    desc: "הרצאה על היכולת לחיות חיים שלמים מתוך חיבור לעצמי - לא כמצב יציב, אלא כתנועה שנעה בגלים: בין בהירות לחוסר ודאות, בין שמחה לקושי. על הקשבה פנימית, בחירה, והאפשרות לבנות דרך גם כשהכול לא לגמרי ברור.",
    audience: "קבוצות מתמודדות, ארגונים, מוסדות לימוד, ימי עיון, צעירים, גיל זהב.",
    badges: ["חיבור פנימי"],
  },
  {
    title: "יזמות קשובה",
    subtitle: "על יזמות שנובעת מהקשבה, מצורך אמיתי ומדיוק מתמשך",
    desc: "הרצאה על יזמות שמתחילה בהבנה ולא בפתרון - על הקשבה לשטח, זיהוי נקודות כאב, ועל בניית פתרונות שצומחים יחד עם המציאות.",
    audience: "ארגונים, פעילות חברתיות, צוותים יזמיים, קהילות עשייה.",
    badges: ["הרצאה מומלצת"],
  },
  {
    title: "לחיות בעולם של AI",
    subtitle: "איך נשארים מחוברים ופועלים בעידן של שינוי מואץ",
    desc: "הרצאה על האתגר האנושי בעידן של AI - כשהקצב מהיר, האפשרויות מתרבות, וההשוואה מתמדת. על חרדה ו-FOMO, ועל התחושה שזה \"לא בשבילי\" - ואיך אפשר לבנות כיוון בעולם משתנה. ",
    audience: "ארגונים, צוותים, יזמים, עובדים בעולמות משתנים.",
    badges: ["ארגונים"],
  },
];

const blogPosts = [
  allBlogPosts.find((p) => p.section === "torim"),
  allBlogPosts.find((p) => p.section === "shirim"),
  allBlogPosts.filter((p) => p.section === "torim")[1] ?? allBlogPosts.find((p) => p.section === "tochen"),
].filter(Boolean) as typeof allBlogPosts;

const topNav = [
  { label: "אודות", href: "#about" },
  { label: "פעילות", href: "#activities" },
  { label: "פרויקטים", href: "#projects" },
  { label: "הקהילה", href: "#communities" },
  { label: "שנדבר חששות?", href: "#concerns" },
  { label: "בלוג", href: "/blog" },
  { label: "פודקאסט", href: "/podcast" },
  { label: "היזמת", href: "#about-me" },
];

const inlineSchema = z.object({
  name: z.string().trim().min(1, "נא להזין שם").max(100, "שם ארוך מדי"),
  email: z.string().trim().email("כתובת מייל לא תקינה").max(255, "מייל ארוך מדי"),
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "נא להזין שם").max(100, "שם ארוך מדי"),
  email: z.string().trim().email("כתובת מייל לא תקינה").max(255, "מייל ארוך מדי"),
  phone: z
    .string()
    .trim()
    .min(7, "מספר טלפון לא תקין")
    .max(20, "מספר טלפון ארוך מדי")
    .regex(/^[0-9+\-\s()]+$/, "מספר טלפון לא תקין"),
  message: z.string().trim().min(1, "נא לכתוב הודעה").max(1000, "ההודעה ארוכה מדי"),
});

// Data for the hero quick-links card
const latestBlogPost = allBlogPosts[0];
const latestPodcastEpisode = podcastEpisodes[podcastEpisodes.length - 1];
function useNextUpcomingEvent() {
  const events = useEvents();
  return useMemo(() => {
    if (!events.length) {
      return { title: "לאירועים הקרובים", date: "לפרטים נוספים", href: "/events" };
    }
    const next = [...events].sort((a, b) => a.date.localeCompare(b.date))[0];
    return {
      title: next.title.replace(/\n/g, " "),
      date: format(parseISO(next.date), "EEEE", { locale: he }).replace("יום שבת", 'מוצ"ש'),
      href: "/events",
    };
  }, [events]);
}

// Reusable card with three quick links inside the hero
const HeroQuickLinksCard = ({
  latestPost,
  latestEpisode,
  upcomingEvent,
}: {
  latestPost: typeof allBlogPosts[number];
  latestEpisode: (typeof podcastEpisodes)[number];
  upcomingEvent: { title: string; date: string; href: string };
}) => {
  const itemBase =
    "flex-1 min-w-0 px-2.5 py-3 md:px-4 md:py-3 text-right rounded-xl border border-border/60 transition-all duration-200 hover:border-border hover:bg-accent/40 hover:shadow-md flex items-center md:items-start gap-2.5 md:gap-3";
  const eyebrow =
    "text-[9px] md:text-[11px] uppercase tracking-[0.14em] md:tracking-[0.18em] text-primary font-medium mb-0 md:mb-1";
  const titleCls =
    "text-foreground text-[11px] md:text-[15px] font-light leading-snug line-clamp-1 md:line-clamp-2";
  const latestSong = useDbPosts().find((p) => p.section === "shirim");
  const iconWrap =
    "shrink-0 w-7 h-7 md:w-9 md:h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center md:mt-0.5";

  return (
    <div className="group bg-card rounded-2xl shadow-[0_15px_50px_-10px_hsl(0_0%_0%_/_0.25)] hover:shadow-[0_25px_70px_-10px_hsl(0_0%_0%_/_0.4)] transition-shadow duration-300 px-2.5 py-4 md:px-6 md:py-6 flex flex-col md:flex-row items-stretch gap-2.5 md:gap-3">
      <Link to="/blog/sukkot-simcha" className={itemBase}>
        <span className={iconWrap} aria-label="פוסט אחרון">
          <FileText className="w-4 h-4" />
        </span>
        <span className="min-w-0">
          <p className={eyebrow}>פוסט אחרון</p>
          <span className={titleCls}>חג סוכות, שמחה ואיפה אני בתוך כל זה 🩷</span>
        </span>
      </Link>

      <div className={itemBase}>
        <span className={iconWrap}><Mic className="w-4 h-4" /></span>
        <span className="min-w-0 flex-1">
          <p className={eyebrow}>שיר חדש · יוצאות לאור</p>
          <Link to={latestSong ? `/blog/${latestSong.slug}` : "/blog/section/shirim"} className={`${titleCls} block hover:text-primary`}>
            {latestSong ? latestSong.title.replace(/\n/g, " ") : "שירים של יוצאות לאור"}
          </Link>
          <Link to="/blog/section/shirim" className="text-primary text-[10px] md:text-xs font-medium hover:underline">
            לכל השירים ←
          </Link>
        </span>
      </div>
      <Link to={upcomingEvent.href} className={itemBase}>
        <span className={iconWrap}><CalendarDays className="w-4 h-4" /></span>
        <span className="min-w-0">
          <p className={eyebrow}>אירוע קרוב</p>
          <p className={titleCls}>
            <span>{upcomingEvent.title}</span>
            <span className="block">{upcomingEvent.date}</span>
          </p>
        </span>
      </Link>
    </div>
  );
};

const Index = () => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactTab, setContactTab] = useState<ContactTab>("general");
  const [hostingOpen, setHostingOpen] = useState(false);
  const [inlineForm, setInlineForm] = useState({ name: "", email: "" });
  const [inlineSubmitting, setInlineSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [aboutMeExpanded, setAboutMeExpanded] = useState(false);

  const upcomingEvent = useNextUpcomingEvent();


  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(contactForm);
    if (!result.success) {
      toast({ title: "שגיאה", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }
    setContactSubmitting(true);
    const { error } = await supabase.from("leads").insert({ email: result.data.email, name: (result.data as { name?: string }).name ?? null, source: "contact_form" });
    setContactSubmitting(false);
    if (error) {
      toast({ title: "שגיאה", description: "אירעה שגיאה, נסי שוב", variant: "destructive" });
      return;
    }
    toast({ title: "תודה!", description: "ההודעה נשלחה בהצלחה." });
    setContactForm({ name: "", email: "", phone: "", message: "" });
  };

  const handleInlineSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = inlineSchema.safeParse(inlineForm);
    if (!result.success) {
      toast({ title: "שגיאה", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }
    setInlineSubmitting(true);
    const { error } = await subscribeLead({ email: result.data.email, name: (result.data as { name?: string }).name ?? null, source: "inline_form" });
    setInlineSubmitting(false);
    if (error) {
      toast({ title: "שגיאה", description: "אירעה שגיאה, נסי שוב", variant: "destructive" });
      return;
    }
    toast({ title: "תודה!", description: "נרשמת בהצלחה לתפוצה." });
    setInlineForm({ name: "", email: "" });
  };

  const openContact = (tab: ContactTab) => {
    setContactTab(tab);
    setContactOpen(true);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="hidden lg:block">
        <SiteHeader />
      </div>

      {/* Mobile-only header logo strip */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-center px-5 py-3">
          <a href="#top" aria-label="אחותי כלה - דף הבית">
            <img src={logo} alt="אחותי כלה" className="h-7 w-auto" />
          </a>
        </div>
      </header>


      {/* Hero */}
      <section id="top" className="relative w-full h-[100vh] md:h-[760px] group md:overflow-hidden">
        {/* Background image covers entire section */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={heroBg}
            alt="חגית מועלם - פסיכולוגית קלינית"
            className="absolute inset-0 w-full h-full object-cover scale-110 md:scale-100 [object-position:center_top] md:[object-position:center] transition-transform duration-[2500ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/80" />
        </div>

        {/* Mobile: titles start mid-strip, white card pushed to bottom */}
        <div className="md:hidden relative z-10 h-full flex flex-col items-center text-center px-[42px] pt-[calc(50vh-50px)] pb-4">
          <h1 className="text-white text-[2.625rem] font-light tracking-wide leading-[1.15]">
            <span className="text-primary font-semibold">אחותי</span> כלה
          </h1>
          <p className="text-white/90 text-[0.85rem] font-light leading-snug mt-3">
            מקום חדשני לרווקות חרדיות
          </p>
          <p className="text-white text-[1.05rem] font-light leading-snug mt-2">
            מקום להיות בו כמו שאת,
            <br />
            ליצור קשרים, ולמצוא תוכן, כלים ומענים
            <br />
            שנוצרו במיוחד בשבילך.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap" dir="rtl">
            <button
              onClick={() => setPopupOpen(true)}
              className="px-8 py-3 rounded-full bg-primary text-primary-foreground text-base font-light hover:bg-[hsl(var(--primary-glow))] transition-all shadow-lg shadow-primary/30"
            >
              הצטרפי אלינו
            </button>

            <a
              href="https://www.matara.pro/nedarimplus/online/?mosad=7018043"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 text-white text-sm font-light hover:bg-white/20 hover:border-white/50 transition-all"
            >
              <Heart className="w-4 h-4 fill-primary text-primary group-hover:scale-110 transition-transform" />
              <span>להיות שותפים שלנו</span>
            </a>
          </div>

          {/* Quick links card attached right below hero CTA */}
          <div className="w-full mt-5 -mb-16 relative z-20">
            <HeroQuickLinksCard
              latestPost={latestBlogPost}
              latestEpisode={latestPodcastEpisode}
              upcomingEvent={upcomingEvent}
            />
          </div>
        </div>

        {/* Desktop hero content */}
        <div className="hidden md:flex relative z-10 h-full flex-col items-center text-center px-6 justify-center">
          <h1 className="text-white text-5xl lg:text-7xl font-light tracking-wide mb-[14px] leading-tight">
            <span className="text-primary font-semibold">אחותי</span> כלה
          </h1>
          <p className="text-white/90 text-base lg:text-lg font-light">
            מקום חדשני לרווקות חרדיות
          </p>
          <p className="text-white text-2xl lg:text-3xl font-light leading-snug mt-3">
            מקום להיות בו כמו שאת,
            <br />
            ליצור קשרים, ולמצוא תוכן, כלים ומענים
            <br />
            שנוצרו במיוחד בשבילך.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap" dir="rtl">
            <button
              onClick={() => setPopupOpen(true)}
              className="px-10 py-3.5 rounded-full bg-primary text-primary-foreground text-base lg:text-lg font-light hover:bg-[hsl(var(--primary-glow))] transition-all shadow-lg shadow-primary/30"
            >
              הצטרפי אלינו
            </button>

            <a
              href="https://www.matara.pro/nedarimplus/online/?mosad=7018043"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white text-sm lg:text-base font-light hover:bg-white/20 hover:border-white/60 hover:shadow-lg hover:shadow-primary/20 transition-all"
            >
              <Heart className="w-4 h-4 lg:w-[18px] lg:h-[18px] fill-primary text-primary group-hover:scale-110 transition-transform" />
              <span>להיות שותפים שלנו</span>
            </a>
          </div>

          {/* Quick links bar (no card frame) sits inside the image, raised a bit */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[min(1000px,94%)] z-20">
            <HeroQuickLinksCard
              latestPost={latestBlogPost}
              latestEpisode={latestPodcastEpisode}
              upcomingEvent={upcomingEvent}
            />
          </div>
        </div>
      </section>

      {/* About section */}
      <section
        id="about"
        className="relative w-full pt-[12.25rem] pb-[2.5rem] md:pt-[7.25rem] md:pb-16 px-[42px] md:px-6 overflow-hidden min-h-[711px] md:min-h-[632px] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${aboutBg.url})` }}
      >
        <div className="relative w-full md:w-[min(1000px,72%)] mx-auto">
          <div className="text-right text-white md:w-[58%] md:mr-0 md:ml-auto md:pt-4 pb-[160px] md:pb-12">
            <h2 className="text-[1.75rem] md:text-5xl font-light leading-tight mb-5 md:mb-7 text-foreground">
              לא רק להחזיק מעמד
            </h2>

            <ExpandableText
              mobileLines={4}
              className="text-foreground text-sm md:text-base font-light leading-relaxed"
            >
              <div className="space-y-4 md:space-y-5">
                <p>
                  להיות רווקה יכול לפעמים להיות לא פשוט.
                  <br />
                  ואנחנו לא צריכות לספר לך על זה.
                </p>
                <p>
                  אחותי כלה נולדה מתוך החיים עצמם - כדי ליצור מקום שיש בו שייכות, תוכן, מפגשים, שיח אמיתי ומענים מדוייקים בשבילך.
                </p>
              </div>
            </ExpandableText>

            <div className="mt-6 md:mt-8">
              <button
                onClick={() => setPopupOpen(true)}
                className="px-7 py-3 rounded-full bg-primary text-primary-foreground text-sm md:text-base font-light hover:bg-[hsl(var(--primary-glow))] transition-all shadow-lg shadow-primary/30"
              >
                הצטרפי אלינו
              </button>
            </div>

          </div>
        </div>

        <img
          src={girlHug}
          alt="אחותי כלה - חיבוק עצמי"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[18%] w-[180px] md:w-[340px] h-auto pointer-events-none select-none"
        />
      </section>

      {/* Power of Together section */}
      <section id="together" className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6 bg-background">
        <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-start">
            <div className="order-first md:order-2 flex justify-center md:justify-start">
              <img
                src={heartBubble}
                alt="עוצמה שנוצרת מהכוח של הביחד"
                className="w-[180px] md:w-[380px] h-auto select-none pointer-events-none"
              />
            </div>

            <div className="order-2 md:order-1 text-right text-foreground">
              <h2 className="text-[1.75rem] md:text-5xl font-light leading-tight mb-5 md:mb-7">
                מה יש כאן בשבילי?
              </h2>

              <div className="text-foreground/85 text-sm md:text-base font-light leading-relaxed space-y-4 md:space-y-5">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">קהילה וחיבורים</p>
                  <p>נשים שמבינות את העולם שלך באמת.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">מפגשים וסדנאות</p>
                  <p>מרחבים נעימים להתפתחות, נשימה וחיבור.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">תוכן ושיח אמיתי</p>
                  <p>על רווקות, נשיות, אמונה, עצמאות והחיים עצמם.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">תמיכה סביב שימור פוריות</p>
                  <p>מידע, ליווי וכלים רגשיים לאורך הדרך.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">כלים לחיים</p>
                  <p>התפתחות אישית, יוזמה ובניית חיים שטובים לך.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">פשוט מקום להיות בו</p>
                  <p>בלי להסביר את עצמך כל הזמן.</p>
                </div>
              </div>

              <div className="mt-6 md:mt-8">
                <button
                  onClick={() => setPopupOpen(true)}
                  className="px-7 py-3 rounded-full bg-primary text-primary-foreground text-sm md:text-base font-light hover:bg-[hsl(var(--primary-glow))] transition-all shadow-lg shadow-primary/30"
                >
                  הצטרפי אלינו
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Magazines section */}
      <section id="magazines" className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6">
        <div className="w-full md:w-[min(1000px,72%)] mx-auto">
          <MagazinesStrip />
        </div>
      </section>


      {/* Blog section */}
      <section id="blog" className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6">
        <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
          <div className="text-right mb-6 md:mb-12 px-1">
            <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-2 md:mb-3">
              <span className="font-light">מילים שפוגשות חיים</span>
              <span className="mx-2 md:mx-3 font-light">|</span>
              <span className="font-light">בלוג</span>
            </h2>
            <p className="text-foreground/80 text-sm md:text-lg font-light">
              פוסטים אישיים, טורים מהמגזין וכתיבה מתוך קבוצת הכתיבה של אחותי כלה - מילים שנולדות מהחיים עצמם.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {blogPosts.map((post) => (
              <Link
                to={`/blog/${post.slug}`}
                key={post.slug}
                className="group bg-card rounded-2xl md:rounded-3xl shadow-[0_15px_40px_-15px_hsl(0_0%_0%_/_0.12)] overflow-hidden text-right flex flex-col transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_25px_50px_-15px_hsl(var(--primary)/0.25)] cursor-pointer"
              >
                <div className="h-40 md:h-44 overflow-hidden bg-accent">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="px-5 md:px-8 py-5 md:py-8 flex flex-col flex-1">
                  <div className="mb-3 md:mb-4">
                    <span className="inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-md bg-accent text-primary text-[10px] md:text-xs font-light">
                      {post.category}
                    </span>
                  </div>
                  <h3 className="text-foreground text-base md:text-xl font-bold leading-tight mb-2 md:mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <ExpandableText
                    mobileLines={4}
                    className="text-foreground/75 text-xs md:text-sm font-light leading-relaxed mb-4 md:mb-6 flex-1"
                  >
                    {post.subtitle}
                  </ExpandableText>
                  <span className="text-primary text-xs md:text-sm font-medium group-hover:text-[hsl(var(--primary-glow))] transition-colors text-right">
                    להמשיך לקרוא ←
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <Link
            to="/yotzot-laor-year"
            className="block mt-6 md:mt-8 rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-l from-[hsl(340_50%_95%)] to-[hsl(0_0%_100%)] border border-primary/10 shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.12)] hover:shadow-[0_16px_40px_-12px_hsl(var(--primary)/0.2)] transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex flex-col md:flex-row items-stretch">
              <div className="md:w-1/3 aspect-[4/3] md:aspect-auto">
                <img
                  src={yotzotYearImg}
                  alt="יוצאות לאור - שנה"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 p-6 md:p-8 text-right flex flex-col justify-center">
                <span className="inline-block self-start px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-light mb-3">
                  אוסף מיוחד
                </span>
                <h3 className="text-foreground text-lg md:text-2xl font-light tracking-tight mb-2">
                  יוצאות לאור - שנה
                </h3>
                <p className="text-foreground/70 text-sm md:text-base font-light leading-relaxed mb-4">
                  91 משפטים נבחרים משיריהן של נשים מהקהילה, לרגל שנה ל"יוצאות לאור". מילים שנכתבו בקול אמיתי.
                </p>
                <span className="self-start text-primary text-sm font-medium hover:text-[hsl(var(--primary-glow))] transition-colors">
                  לצפייה באוסף ←
                </span>
              </div>
            </div>
          </Link>

          <div className="mt-8 md:mt-12 flex justify-center">
            <Link to="/blog" className="px-8 md:px-10 py-3 rounded-lg bg-primary text-primary-foreground text-sm md:text-base font-light hover:bg-[hsl(var(--primary-glow))] transition-colors">
              לכל הפוסטים
            </Link>
          </div>
        </div>
      </section>


      {/* Podcast section */}
      <section id="podcast" className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-0 overflow-hidden">
        <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
          <div className="text-right mb-6 md:mb-12 px-1 md:px-0">
            <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-2 md:mb-3">
              <span className="font-light">יודעת</span>
              <span className="mx-2 md:mx-3 font-light">|</span>
              <span className="font-light">פודקאסט</span>
            </h2>
            <p className="text-foreground/80 text-sm md:text-lg font-light leading-relaxed">
              פודקאסט שנולד כדי לעשות סדר בתוך תהליך שימור הפוריות - להסביר, להרגיע, ולתת לך תחושה שאת לא לבד בתוך זה. כאן תמצאי שיחות שמחברות בין מידע ברור לבין החוויה הרגשית, ויעזרו לך להבין את הדרך, צעד אחרי צעד, בקצב שלך. 
            </p>
          </div>
        </div>

        <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {podcastEpisodes.slice(0, 3).map((ep, idx) => (
              <Link
                to="/podcast"
                key={idx}
                className="flex flex-col group cursor-pointer transition-all duration-300 ease-out hover:scale-[1.03]"
              >
                <img
                  src={podcastCover}
                  alt="יודעת פודקאסט"
                  loading="lazy"
                  width={1080}
                  height={607}
                  className="w-full h-auto rounded-2xl md:rounded-3xl shadow-[0_15px_40px_-15px_hsl(0_0%_0%_/_0.15)] transition-shadow duration-300 group-hover:shadow-[0_25px_50px_-15px_hsl(var(--primary)/0.3)]"
                />
                <div className="mt-3 md:mt-5 text-right text-foreground text-sm md:text-base">
                  <span className="font-bold">פרק {ep.num}</span>
                  <span className="text-foreground/50 mx-2">|</span>
                  <span className="font-light group-hover:text-primary transition-colors">{ep.title}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 md:mt-12 flex justify-center">
            <Link
              to="/podcast"
              className="px-8 md:px-10 py-3 rounded-lg bg-primary text-primary-foreground text-sm md:text-base font-light hover:bg-[hsl(var(--primary-glow))] transition-colors"
            >
              לכל הפרקים
            </Link>
          </div>
        </div>
      </section>

      {/* Activity scope strip */}
      <section id="scope" className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-12">
        <div className="w-full md:w-[min(1200px,86%)] mx-auto" dir="rtl">
          <div
            className="rounded-[28px] md:rounded-[36px] px-8 py-[4.5rem] md:px-16 md:py-[7.5rem] shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.3)]"
            style={{
              background:
                "linear-gradient(90deg, hsl(5 79% 74%) 0%, hsl(354 76% 74%) 25%, hsl(344 75% 72%) 50%, hsl(335 75% 70%) 75%, hsl(326 75% 69%) 100%)",
            }}
          >
            <h2 className="text-right text-white text-[1.75rem] md:text-5xl font-light leading-tight mb-10 md:mb-14">
              היקף פעילות
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
              {[
                { num: "836+", label: "משתתפות בפרויקט" },
                { num: "1,458+", label: "משתתפות באירועים בשנה" },
                { num: "76+", label: "אירועים בשנה" },
                { num: "4+", label: "שנות פעילות" },
              ].map((item) => (
                <div key={item.label} className="text-center text-white">
                  <div className="text-4xl md:text-6xl font-light leading-none mb-3 md:mb-4">
                    {item.num}
                  </div>
                  <div className="text-sm md:text-base font-light text-white/95">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leading projects section */}
      <section id="projects" className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6 bg-background">
        <div className="w-full md:w-[min(1100px,80%)] mx-auto" dir="rtl">
          <div className="text-right mb-8 md:mb-12">
            <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight">
              פרויקטים מובילים
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
            {([
              {
                title: "מרחב מחוללות",
                body: "להיות, להתפתח להתחבר. מרחב חדשני וייחודי לרווקות חרדיות מעל גיל 28. פעילות אחת לשבועיים",
                cta: "מפגשים קרובים",
                href: "https://tickchak.co.il/96341",
                chip: "pink",
              },
              {
                title: "מפגשי לימוד ושיח",
                body: 'קבוצות לימוד אינטימיות המאפשרות חיבור לעצמינו, אחת לשניה ולהקב"ה בתוך הרווקות. שיח פתוח ומחבר',
                cta: "לעדכון על מפגשים",
                action: "mailing" as const,
                chip: "pink",
              },
              {
                title: "יודעת- שימור פוריות",
                body: "כל מה שאת רוצה לדעת על שימור פוריות. מידע יחודי טכני ורגשי ופודקאסט שיתנו לך כוח להמשיך קדימה",
                cta: "לאתר יודעת",
                href: "/shimur-poriut",
                chip: "pink-light",
              },
              {
                title: "יוצאות לאור",
                body: "קבוצת כתיבה יצירתית. אתגרי כתיבה דו שבועיים, סדנאות מקצועיות תערוכות ומרחב וירטואלי",
                cta: "הצטרפות לקבוצה",
                href: "https://docs.google.com/forms/d/e/1FAIpQLSdCgow53IQwaMYGDKAJD1Cl9mDMGAgS-L8KuPbmgOO6qrreVA/viewform?usp=header",
                chip: "rose",
              },
              {
                title: "רווקה עצמאית",
                body: "להיות רווקה זה מאתגר, להיות רווקה עצמאית זה עוד משהו. קהילה, סדנאות, הרצאות מקצועיות בועות עבודה ועוד",
                cta: "הצטרפות לקבוצה",
                href: "https://docs.google.com/forms/d/e/1FAIpQLSeGFIyBwG2Rr2IdxVXEsOjFdNwPLtuc9w6-qkuiMm1yZ0xumQ/viewform?usp=header",
                chip: "peach",
              },
              {
                title: "פסטיבל יחפות",
                body: "ימי חוויה, הרצאות, יצירה ופעילות צפופה ואטרקטיבית. בזמנים מדויקים: חגים, חופשים ובין הזמנים",
                cta: "אירועים קודמים",
                href: "https://tickchak.co.il/88849",
                chip: "purple",
              },
              {
                title: "באות שבת",
                body: "קבוצת חיבור לעצמינו ולשבת דרך פרשת שבוע. מייל עדכון שבועי, קבוצת שיתופים וקליגרפיה יצירתית",
                cta: "הצטרפות לקבוצה",
                href: "https://docs.google.com/forms/d/e/1FAIpQLSdd1MoWFEUsN4ZCRbDaWw2SaMv_3nCiIK0HmDeTiZR9B0E9zA/viewform?usp=header",
                chip: "pink-light",
              },
              {
                title: "לוח חיפוש דירות",
                body: "פרסום שבועי של חיפושי דירות שותפות ופתיחת דירות חדשות. ככה תמצאי שותפות איכותיות מהקהילה",
                cta: "פרסום חיפוש",
                href: "https://docs.google.com/forms/d/e/1FAIpQLSf6UQnHyXDqwYhtO44idJ6BhZ5WvFI5iqIgJaMAxTohpGXzLw/viewform?usp=header",
                chip: "peach",
              },
              {
                title: "נותנות דרייב",
                body: "מעטפת לך ולרכב שלך. קבוצות דחיפה להוצאת רשיון וקניית רכב, פרויקט ליווי נהיגה ומוסכית נשית",
                cta: "תאום ליווי נהיגה",
                href: "https://docs.google.com/spreadsheets/d/1hWf4yIua5LmvA8TgRQnHpm3GVhB8QqLLxwrKLFawEwI/edit?usp=sharing",
                chip: "rose",
              },
            ] as Array<{ title: string; body: string; cta: string; href?: string; action?: "mailing"; chip: "pink" | "pink-light" | "rose" | "peach" | "purple" }>).map((p) => {
              const chipStyles: Record<string, string> = {
                pink: "bg-[hsl(343_70%_88%)] text-[hsl(343_55%_42%)]",
                "pink-light": "bg-[hsl(340_60%_94%)] text-[hsl(343_55%_50%)]",
                rose: "bg-[hsl(343_75%_92%)] text-[hsl(343_55%_45%)]",
                peach: "bg-[hsl(20_70%_90%)] text-[hsl(15_55%_45%)]",
                purple: "bg-[hsl(280_50%_92%)] text-[hsl(280_45%_45%)]",
              };
              return (
                <div
                  key={p.title}
                  className="group relative bg-gradient-to-b from-card to-[hsl(var(--accent)/0.35)] rounded-2xl md:rounded-3xl shadow-[0_15px_45px_-15px_hsl(0_0%_0%_/_0.12)] px-6 md:px-7 pt-8 md:pt-9 pb-7 md:pb-8 text-right flex flex-col transition-all duration-500 ease-out hover:shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.28)] hover:-translate-y-1.5 border border-primary/5"
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 right-8 h-1 w-12 bg-gradient-to-l from-primary to-[hsl(var(--primary-glow))] rounded-b-full" />

                  <h3 className="text-foreground text-xl md:text-2xl font-bold leading-tight mb-3 md:mb-4">
                    {p.title}
                  </h3>

                  {/* Subtle divider */}
                  <div className="h-px w-8 bg-primary/30 mb-3 md:mb-4" />

                  <p className="text-foreground/75 text-sm md:text-[15px] font-light leading-relaxed mb-5 md:mb-6 flex-1">
                    {p.body}
                  </p>

                  <div className="flex justify-start">
                    {p.action === "mailing" ? (
                      <button
                        onClick={() => setPopupOpen(true)}
                        className={`px-5 py-2 rounded-full text-sm font-light transition-colors ${chipStyles[p.chip]}`}
                      >
                        {p.cta}
                      </button>
                    ) : p.href?.startsWith("/") ? (
                      <Link
                        to={p.href}
                        className={`px-5 py-2 rounded-full text-sm font-light transition-colors ${chipStyles[p.chip]}`}
                      >
                        {p.cta}
                      </Link>
                    ) : (
                      <a
                        href={p.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-5 py-2 rounded-full text-sm font-light transition-colors ${chipStyles[p.chip]}`}
                      >
                        {p.cta}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core activity areas strip */}
      <section id="activities" className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-12">
        <div className="w-full md:w-[min(1200px,80%)] mx-auto" dir="rtl">
          <div className="bg-primary rounded-[28px] md:rounded-[36px] px-8 py-10 md:px-24 md:py-24">
            <h2 className="text-right text-primary-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-8 md:mb-12">
              תחומי פעילות מרכזיים
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-7 md:gap-6">
              {[
                {
                  Icon: UserRound,
                  title: "קהילת איכות",
                  body: "מפגשים מגוונים, יצירת קשרים איכותיים קידום שידוכים הדדי",
                },
                {
                  Icon: Gem,
                  title: "התפתחות אישית",
                  body: "מפגשים מקצועיים, נשיות ברווקות, הרצאות, מפגשי שיח",
                },
                {
                  Icon: Heart,
                  title: "שימור פוריות",
                  body: "מידע, תמיכה רגשית פודקאסט, פרויקט תרופות, שינוי מדיניות",
                },
                {
                  Icon: MessageCircleHeart,
                  title: "העצמה רוחנית",
                  body: "מפגשי לימוד, קבוצות לימוד וירטואליות, חיבור לשבתות וחגים",
                },
                {
                  Icon: Rocket,
                  title: "צמיחה מקצועית",
                  body: "פיתוח עסקי ויזמות, קהילת עצמאיות, כלכלה נכונה",
                },
              ].map(({ Icon, title, body }) => (
                <div key={title} className="text-center text-primary-foreground">
                  <Icon className="mx-auto mb-3 md:mb-4" strokeWidth={1.25} style={{ width: 36, height: 36 }} />
                  <h3 className="text-xl md:text-lg font-light mb-2 md:mb-3">{title}</h3>
                  <p className="text-sm md:text-sm font-light leading-relaxed text-primary-foreground/90">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials section */}
      <section id="testimonials" className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6 bg-background">
        <div className="w-full md:w-[min(1100px,80%)] mx-auto" dir="rtl">
          <div className="text-right mb-8 md:mb-12">
            <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-4">
              מה קורה כשיש מקום שנבנה בשבילך?
            </h2>
            <p className="text-foreground/70 text-sm md:text-base font-light leading-relaxed max-w-2xl">
              לפעמים הדרך הכי טובה להבין מה אחותי כלה עושה היא פשוט להקשיב לנשים שנמצאות כאן.
            </p>
          </div>

          <div className="space-y-5 md:space-y-7">
            {[
              {
                title: "להרגיש שייכת",
                icon: testimonialSmile,
                short: "\"יצאתי עם הרגשה שאני לא לבד בהתמודדות הזו.\"",
                long: "\"יצאתי עם תחושת שייכות, דבר שהיה כל כך חסר במגזר שלנו. יש עוד הרבה רווקות בנות גילי, ובאופן מפתיע כולן באיכות וברמה גבוהה. היה לי מה לקבל ולתרום מכל אחת.\"",
                by: "נעמה, בני ברק",
              },
              {
                title: "להיות פשוט את",
                icon: testimonialLove,
                short: "\"יש לי מקום שאני יכולה להיות בו אני, במצב שלי ובמה שאני.\"",
                long: "\"כיף לי במקום הזה. אני פותחת הרבה דברים שאין לי מקום אחר לפתוח. אני לא לבד. יש הווי, יש תוכן ויש שיח מכבד.\"",
                by: "שרה, פתח תקווה",
              },
              {
                title: "לחזור הביתה עם כוחות",
                icon: testimonialHeart,
                short: "\"מהרגע שהכרתי את אחותי כלה השתנו לי החיים.\"",
                long: "\"האיכות של הבנות בקבוצה, הרמה הגבוהה של האירועים, ערבי הלימוד והפסטיבלים המיוחדים פשוט נותנים לי כוחות אדירים לכל השבוע.\"",
                by: "נעה, ירושלים",
              },
              {
                title: "להרגיש שווה בין שוות",
                icon: testimonialHearts,
                short: "\"רואים אותי בלי הסטטוס שדבוק אליי בדרך כלל.\"",
                long: "\"להיות במפגשי אחותי כלה מרגיש לי להיות שווה בין שוות. מרגיש פשוט כיף. הנאה טבעית עם חברות ותוכן איכותי.\"",
                by: "משתתפת בקהילה",
              },
              {
                title: "למצוא מחדש חיי חברה ותקווה",
                icon: testimonialLove,
                short: "\"זה הרגע לנשום בין לבין.\"",
                long: "\"אחותי כלה בשבילי זה האור, זה חיי החברה. זה הרגע לנשום בין לבין. זה להצית תקווה חדשה כשהקודמת כבר נכבתה.\"",
                by: "משתתפת בקהילה",
              },
              {
                title: "לקבל החלטה מתוך בחירה",
                icon: testimonialHeart,
                short: "\"כל החורף הייתי מבולבלת. בסוף החלטתי ללכת על זה.\"",
                long: "\"שמעתי את כל הפודקאסטים שלך. יואו, כמה רוגע, הנגשת מידע, הסתכלות באופן חיובי ודחיפה. עדיין חוששת בתהליך, אבל נתתי לעצמי להגיע מתוך בחירה.\"",
                by: "משתתפת בפרויקט שימור פוריות",
              },
              {
                title: "להגיע לרגע הזה מוכנה",
                icon: testimonialSmile,
                short: "\"פתאום קלטתי כמה ההדרכות והאתר פשוט הצילו אותי.\"",
                long: "\"אני עכשיו אחרי שאיבה. זה הרגיע אותי בטירוף ונתן לי המון ביטחון להגיע לרגע הזה מוכנה, למרות שהיה הרבה לחץ ואי ודאות. זה הופך את כל התהליך להרבה יותר רגוע ומאפשר.\"",
                by: "משתתפת בפרויקט שימור פוריות",
              },
              {
                title: "להכניס משהו חדש לתוך השבת",
                icon: testimonialHearts,
                short: "\"'באות שבת' שינה לי את השנה.\"",
                long: "\"אין לך מושג איך באות שבת שינה לי את השנה, ואת השבתות בעיקר. בזכות זה הלכתי כמעט כל שבת לבית הכנסת. הפירושים והתובנות תמיד נוגעים ומרגשים ומחדדים לי את התחושות שלי. וואו, זה כל כך מחיה.\"",
                by: "משתתפת בבאות שבת",
              },
              {
                title: "לגלות שמישהו חשב בדיוק על הצורך שלך",
                icon: testimonialHeart,
                short: "\"יש עוד ארגונים לרווקות, אבל אין ארגון כזה.\"",
                long: "\"זה בדיוק הצורך שלנו, עם נושאים חשובים שיש לדבר עליהם ומענה על כל מה שאפשר לחלום עליו ברווקות.\"",
                by: "תמר, ירושלים",
              },
            ].map((t) => (
              <div
                key={t.title}
                className="bg-card rounded-[24px] md:rounded-[28px] shadow-[0_10px_35px_-12px_hsl(0_0%_0%_/_0.1)] border border-primary/5 px-8 md:px-20 py-10 md:py-16 flex flex-col md:flex-row items-center gap-5 md:gap-10"
              >
                <div className="shrink-0 md:order-1">
                  <img
                    src={t.icon}
                    alt={t.title}
                    className="w-[76.8px] h-[76.8px] md:w-[115.2px] md:h-[115.2px] object-contain"
                  />
                </div>
                <div className="flex-1 md:text-right md:order-2 md:max-w-[70%]">
                  <h3 className="text-foreground text-[1.3rem] md:text-[1.4rem] mb-2 md:mb-3 text-center md:text-right">
                    {t.title}
                  </h3>
                  <div className="space-y-3 text-right">
                    <p className="text-foreground/85 text-sm md:text-base font-bold leading-relaxed">
                      {t.short}
                    </p>
                    <p className="text-foreground/75 text-sm md:text-base font-light leading-relaxed">
                      {t.long}
                    </p>
                    <p className="text-foreground/60 text-sm font-light">
                      {t.by}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mailing list CTA */}
      <section id="communities" className="relative w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroBg}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/80" />
        </div>

        <div className="relative z-10 w-full md:w-[min(1100px,80%)] mx-auto text-center" dir="rtl">
          <h2 className="text-white text-[1.75rem] md:text-5xl font-light leading-tight mb-4">
            הצטרפי לתפוצה
          </h2>
          <p className="text-white/80 text-sm md:text-base font-light mb-8 max-w-lg mx-auto">
            כל העדכונים על אירועים, מפגשים, פרויקטים חדשים ותוכן שיזמין אותך להתחבר לעצמך
          </p>
          <button
            onClick={() => setPopupOpen(true)}
            className="px-8 py-3 rounded-full bg-primary text-primary-foreground text-base font-light hover:bg-[hsl(var(--primary-glow))] transition-all"
          >
            להצטרפות לתפוצה
          </button>
        </div>
      </section>

      {/* Concerns / FAQ section */}
      <section id="concerns" className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6">
        <div className="w-full md:w-[min(1100px,80%)] mx-auto" dir="rtl">
          <div className="text-right mb-10 md:mb-14">
            <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight">
              שנדבר חששות?
            </h2>
          </div>

          <div className="flex flex-col gap-6 md:gap-8">
            {[
              {
                title: "אני לא רוצה להיות שייכת לקבוצת רווקות, מתחתנת מחר",
                body: "יודעת שיש משהו מאיים בלהגיע לקבוצת רווקות, וחשוב לי לספר שהאיום הזה מתמוסס ונעלם. ברגע בו את פוגשת רווקות חרדיות איכותיות, מרתקות, שמחות, מלאות בטוב וביופי, וחווה איתן רגעים של כיף, לימוד, חוויה והתפתחות. איך משהי אמרה פעם? \"בכל מקום אני רווקה. כאן סוף סוף אני יכולה להיות אני\". אז כן, תתחתני בעז\"ה מחר - אבל היום יהיה לך טוב:)",
              },
              {
                title: "מפגש רווקות? אולי זה מדכא...",
                body: "אם את חוששת שמדובר באירועי רווקות נוגעים ללב, רוצה לספר לך שזה רחוק משם ממש, ושכל משתתפות אחותי כלה היו בנקודה המתלבטת הזו. החוויה כל כך מחברת, זורמת ונעימה לכולן - כל אחת וסגנונה היא. וכן, כל אחת שמגיעה פעם ראשונה, שואלת בקול - \"למה לא עשיתי את הטוב הזה לעצמי קודם?\" אז אל תחכי, ותעשי לעצמך טוב, והרבה. מגיע לך.",
              },
              {
                title: "אף פעם לא השתתפתי באירוע רווקות, וגם... אין לי עם מי לבוא. מה אם לא אמצא את עצמי?",
                body: "החשש הזה טבעי והגיוני, ורוצה לספר לך שכמעט רוב משתתפות אחותי כלה - הגיעו ברגע של אומץ שתפסו, כשהגיעו פעם ראשונה לבד. אני יכולה להבטיח לך שיש אווירת קסם באחותי כלה, ותוך כמה דקות בעז\"ה תרגישי כל כך בנח, שתשכחי שבאת לבד. אם אין לך עם מי לבוא, זו סיבה מצוינת להגיע למפגשים ולמרחב שפותח עולם שלם של הכרויות מדהימות שנמשכות הרבה מעבר לאירועים עצמם.",
              },
              {
                title: "אני בסגנון שמרני / פתוח, מה הסגנון של המשתתפות?",
                body: "משתתפות אחותי כלה הן בנות איכותיות, בוגרות סמינרים חרדיים, ויחד עם זאת מנעד הסגנונות תחת הכותרת הזו הוא רחב. המאפיין המשותף בין כולן, הוא היכולת להביא כנות, להביא את עצמן ולב מחובר לשמים.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-card rounded-2xl border border-border/60 shadow-[var(--shadow-soft)] px-6 py-7 md:px-12 md:py-10"
              >
                <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-10">
                  <div className="shrink-0">
                    <img
                      src={concernBubble}
                      alt=""
                      aria-hidden="true"
                      className="w-[72px] h-[72px] md:w-[114px] md:h-[114px] object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 md:text-right">
                    <h3 className="text-foreground text-[17px] md:text-xl font-semibold leading-snug mb-3 text-center md:text-right">
                      {item.title}
                    </h3>
                    <p className="text-foreground/75 text-[14px] md:text-[15px] font-light leading-relaxed max-w-[70ch] text-right">
                      {item.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* About / Founder section */}
      <section id="about-me" className="w-full bg-background pt-0 pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto" dir="rtl">
          <div className="bg-card rounded-2xl md:rounded-[40px] shadow-[0_20px_60px_-20px_hsl(0_0%_0%_/_0.12)] px-6 md:px-20 py-10 md:py-16">
            <div className="grid md:grid-cols-[auto_1fr] gap-6 md:gap-12 items-start">
              {/* Right side: heading */}
              <div className="text-right md:border-l md:border-border md:pl-12 md:min-w-[240px]">
                <p className="text-xs md:text-sm text-foreground/50 tracking-[0.2em] mb-3">
                  ABOUT
                </p>
                <h2 className="text-2xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
                  קצת עלי
                  <span className="block w-10 h-px bg-primary/60 my-3" />
                  <span className="text-base md:text-lg text-foreground/70 font-light tracking-normal">
                    יזמת אחותי כלה
                  </span>
                </h2>
              </div>

              {/* Left side: text */}
              <div className="space-y-5 text-foreground/80 leading-loose text-sm md:text-base text-right">
                <p>
                  אחותי כלה לא נולד כרעיון - הוא נולד מתוך מפגש עם החיים עצמם. עם התקופה הזו, שלא תמיד מדברים עליה בקול, של להיות אישה רווקה שמחזיקה הרבה - שאלות, תקווה, בדידות, רצון לחיים מלאים, וחיפוש אחר מקום אמיתי להניח בו את כל זה.
                </p>
                <div className={`${aboutMeExpanded ? "block" : "hidden"} md:block space-y-5`}>
                  <p>
                    <span className="text-foreground font-normal">אני חגית מועלם, פסיכולוגית בהתמחות קלינית,</span> ועובדת בשנים האחרונות עם מצבים אנושיים מורכבים - במפגשים אישיים, בעבודה עם קבוצות ובהובלת תהליכים בקהילות וארגונים. אבל לפני הכול, אני אישה שמאמינה שאפשר לחיות חיים מלאים, עמוקים ומשמעותיים גם בתוך חוסר ודאות.
                  </p>
                  <p>
                    לאורך הדרך פגשתי שוב ושוב נשים מעוררות השראה, עמוקות ומלאות חיים, שמתמודדות לבד עם חוויות שאין להן תמיד מקום. <span className="text-foreground font-normal">אחותי כלה</span> נוצרה כדי להיות המרחב הזה - מקום שיש בו עומק, חיבור והגשמה, ותנועה בתוך מציאות חיים שלא תמיד בחרנו בה. זו קהילה שמאפשרת להיות, בלי להסביר יותר מדי ובלי להחזיק הכול לבד.
                  </p>
                  <p>
                    הדרך שבה הקהילה הזו נבנית מושפעת מאוד מהעולם המקצועי שלי - מהיכולת להקשיב, להבין מורכבות, ולתרגם אותה למשהו שאפשר לפגוש ולחיות בתוכו.
                  </p>
                </div>
                {!aboutMeExpanded && (
                  <button
                    onClick={() => setAboutMeExpanded(true)}
                    className="md:hidden text-primary text-sm font-medium"
                  >
                    לקרוא עוד ←
                  </button>
                )}

                <div className="pt-4 mt-2 border-t border-border/60">
                  <p className="text-foreground/75 mb-3">
                    רוצה להכיר גם את העבודה המקצועית שלי?
                  </p>
                  <p className="text-foreground/65 text-sm mb-4">
                    אם מעניין אותך להעמיק, לקרוא או לעבוד יחד - אפשר להכיר אותי גם מהצד המקצועי:
                  </p>
                  <a
                    href="https://hagitmualem.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-primary/40 text-foreground hover:bg-primary/5 hover:border-primary transition-all duration-300 text-sm tracking-wide"
                  >
                    לאתר המקצועי שלי
                    <ArrowLeft className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact section */}
      <section id="contact" className="w-full bg-background pt-0 pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto" dir="rtl">
          <div className="bg-card rounded-2xl md:rounded-[40px] shadow-[0_20px_60px_-20px_hsl(0_0%_0%_/_0.12)] px-6 md:px-32 py-8 md:py-32">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-28">
              {/* Right side: heart + heading + intro */}
              <div className="w-full md:w-1/2 text-center md:text-right order-1">
                <div className="flex justify-center md:justify-start mb-5 md:mb-7">
                  <img
                    src={contactHeart}
                    alt="דברי איתנו"
                    width={220}
                    height={220}
                    className="w-32 md:w-44 h-auto"
                  />
                </div>
                <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light mb-4 md:mb-5">
                  דברי איתנו
                </h2>
                <p className="text-foreground/70 text-sm md:text-base font-light leading-relaxed max-w-[42ch] mx-auto md:mx-0">
                  כאן לכל שאלה, תהיה, מחשבה או רעיון ליוזמה חדשה. נשמח לשמוע ממך, נשמח עוד יותר להכיר אותך מקרוב באירועים שלנו
                </p>
              </div>

              {/* Left side: form */}
              <div className="w-full md:w-1/2 order-2">
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-foreground/70 text-xs md:text-sm font-light mb-1.5 text-right">
                      השם שלך
                    </label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg py-2.5 px-3 text-foreground placeholder:text-muted-foreground/60 font-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground/70 text-xs md:text-sm font-light mb-1.5 text-right">
                      כתובת מייל
                    </label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg py-2.5 px-3 text-foreground placeholder:text-muted-foreground/60 font-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground/70 text-xs md:text-sm font-light mb-1.5 text-right">
                      טלפון
                    </label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg py-2.5 px-3 text-foreground placeholder:text-muted-foreground/60 font-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground/70 text-xs md:text-sm font-light mb-1.5 text-right">
                      מה תרצי לכתוב לנו
                    </label>
                    <textarea
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg py-2.5 px-3 text-foreground placeholder:text-muted-foreground/60 font-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-right text-sm resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-light tracking-wide hover:bg-[hsl(var(--primary-glow))] transition-all duration-500 shadow-md shadow-primary/20 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {contactSubmitting ? "שולחת..." : "שליחה"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>



      <MailingListPopup open={popupOpen} onOpenChange={setPopupOpen} />
      <ContactPopup open={contactOpen} onOpenChange={setContactOpen} defaultTab={contactTab} />
      <HostingPopup open={hostingOpen} onOpenChange={setHostingOpen} />
      <DonationCTA
        id="donate"
        variant="soft"
        title="אם הגעת עד לכאן, אולי התרשמת שאנחנו מסתדרות לבד."
        paragraphs={[
          "ככה זה הרבה פעמים גם ברווקות מתמשכת. נשים חזקות, עצמאיות, כאלה שאפשר לסמוך עליהן. הן עובדות, מחזיקות, עוזרות לאחרים וממשיכות קדימה. ומבחוץ נדמה שהן מסתדרות.",
          "אולי לא במקרה גם אחותי כלה חווה משהו דומה.",
          "אנחנו יוצרות המון, מגיעות למאות נשים, מפיקות אירועים, יוצרות תוכן ובונות עוד ועוד מענים. מבחוץ זה יכול להיראות כאילו אנחנו מסתדרות לבד.",
          "אבל האמת היא אחרת.",
          "אנחנו מצליחות לעשות כל כך הרבה כי אנחנו עובדות קשה, נשענות על התנדבות ומוצאות שוב ושוב דרכים לעשות הרבה עם מעט.",
          "לא כי מעט מספיק. אלא כי עד היום בחרנו לא לחכות שיהיה יותר.",
          "כדי שנוכל להמשיך, לגדול ולהגיע לעוד נשים, אנחנו צריכות גם את העזרה שלך.",
        ]}
        buttonLabel="אני רוצה לתת לכן כוח להמשיך"
      />

      <DonationCTA
        variant="gradient"
        title="כל מה שיש כאן התחיל מצורך שלא היה לו מענה."
        paragraphs={[
          "אחותי כלה נבנתה מתוך הקשבה לנשים ומתוך החלטה לא לחכות שמישהו אחר יעשה. מאז נולדו כאן קהילה, אירועים, תוכן, יוזמות ומענים חדשים שמגיעים למאות נשים.",
          "עד היום עשינו המון עם מעט. לא כי מעט מספיק, אלא כי בחרנו לא לחכות שיהיה כדי לפעול.",
          "התרומה שלכם מאפשרת לנו להמשיך לבנות את הדבר הבא שנשים עדיין מחכות לו.",
        ]}
        buttonLabel="אני רוצה להיות חלק"
      />

      <MobileBottomNav />
    </div>
  );
};

export default Index;
