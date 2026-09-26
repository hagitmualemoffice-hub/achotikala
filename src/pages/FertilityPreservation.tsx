import { ArrowLeft, Heart, Users, HandHeart, Calendar } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import heroAsset from "@/assets/fertility-hero-denim.jpg.asset.json";

const offerings = [
  {
    icon: Users,
    title: "קבוצות וואטסאפ וקהילה",
    text: "מרחבים סגורים לנשים בתהליך - לשאלות יומיומיות, חיבור ותמיכה הדדית.",
  },
  {
    icon: HandHeart,
    title: "אחות לדרך",
    text: "ליווי אישי של מי שכבר עברה את התהליך, לאורך כל הדרך.",
  },
  {
    icon: Calendar,
    title: "מפגשים ואירועים",
    text: "מפגשי קהילה, שיחות פתוחות ואירועים סביב נשים בתהליך שימור פוריות.",
  },
  {
    icon: Heart,
    title: "ליווי קהילתי ומענים חברתיים",
    text: "הסעות, השגחה הלכתית והתאמת מענים נוספים - מתוך הקהילה ולמענה.",
  },
];

const FertilityPreservation = () => {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground font-light pb-20 lg:pb-0">
      <SiteHeader />

      {/* Hero / Bridge */}
      <section className="relative pt-32 md:pt-40 pb-16 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroAsset.url} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
        </div>

        <div className="max-w-3xl mx-auto px-6 md:px-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs tracking-wide mb-6">
            <Heart className="w-3.5 h-3.5" fill="currentColor" />
            אחותי כלה ושימור פוריות
          </div>

          <h1 className="text-3xl md:text-5xl font-light tracking-tight leading-tight mb-6">
            הקמנו בית מקצועי
            <br />
            <span className="text-primary">לכל מה שקשור לשימור פוריות</span>
          </h1>

          <div className="space-y-4 text-base md:text-lg text-foreground/75 leading-relaxed max-w-2xl mx-auto mb-10">
            <p>
              אחותי כלה מלווה נשים גם סביב תהליך שימור פוריות.
            </p>
            <p>
              מתוך ההבנה שנדרש מקום מקצועי המרכז את כל הידע בנושא - מהו התהליך, למי הוא מתאים, תרופות, עלויות, קופות חולים, זכויות, מימון, היבטים רגשיים, מחקר, מאמרים ופודקאסט - הקמנו אתר ייעודי שמרכז את כל המידע במקום אחד.
            </p>
          </div>

          <a
            href="/shimur-poriut"
            className="group inline-flex items-center gap-3 px-8 md:px-10 py-4 md:py-5 rounded-full bg-primary text-primary-foreground text-base md:text-lg tracking-wide shadow-lg shadow-primary/25 hover:bg-[hsl(var(--primary-glow))] hover:shadow-primary/40 transition-all duration-500"
          >
            לעמוד שימור הפוריות
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          </a>
        </div>
      </section>

      {/* What Achoti Kala offers */}
      <section className="py-16 md:py-24 px-6 md:px-10 bg-card/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="w-12 h-px bg-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-4xl font-light tracking-tight mb-4">
              מה אחותי כלה נותנת בתחום
            </h2>
            <p className="text-foreground/65 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              הבית של הקהילה, הליווי האישי והמענים החברתיים לנשים סביב תהליך שימור הפוריות.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
            {offerings.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="bg-card border border-border/60 rounded-2xl p-6 md:p-7 text-right hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg md:text-xl font-light mb-2">{title}</h3>
                <p className="text-sm text-foreground/65 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-px bg-primary mx-auto mb-6" />
          <p className="text-lg md:text-2xl font-light leading-relaxed text-foreground/85 mb-8">
            לכל המידע המקצועי על תהליך שימור הפוריות -
            <br />
            עברי לעמוד שימור הפוריות באתר.
          </p>
          <a
            href="/shimur-poriut"
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-primary text-primary-foreground text-base tracking-wide shadow-md shadow-primary/20 hover:bg-[hsl(var(--primary-glow))] transition-all duration-500"
          >
            לעמוד שימור הפוריות
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          </a>
        </div>
      </section>

      <div className="md:hidden h-20" />
      <MobileBottomNav />
    </div>
  );
};

export default FertilityPreservation;
