import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Download, Share2, Users, Sparkles, Globe } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import ContactPopup, { type ContactTab } from "@/components/ContactPopup";
import MailingListPopup from "@/components/MailingListPopup";
import card6 from "@/assets/tubeav/card-6.png.asset.json";
import card1 from "@/assets/tubeav/card-1.png.asset.json";
import card2 from "@/assets/tubeav/card-2.png.asset.json";
import card3 from "@/assets/tubeav/card-3.png.asset.json";
import card4 from "@/assets/tubeav/card-4.png.asset.json";
import card5 from "@/assets/tubeav/card-5.png.asset.json";
import card7 from "@/assets/tubeav/card-7.png.asset.json";
import heart8 from "@/assets/hearts/heart-8.png.asset.json";
import heart9 from "@/assets/hearts/heart-9.png.asset.json";
import heart10 from "@/assets/hearts/heart-10.png.asset.json";
import heart11 from "@/assets/hearts/heart-11.png.asset.json";
import strongCard1 from "@/assets/tubeav-strong/card-1.png";
import strongCard2 from "@/assets/tubeav-strong/card-2.png";
import strongCard3 from "@/assets/tubeav-strong/card-3.png";
import strongCard4 from "@/assets/tubeav-strong/card-4.png";
import strongCard5 from "@/assets/tubeav-strong/card-5.png";
import strongCard6 from "@/assets/tubeav-strong/card-6.png";
import strongCard7 from "@/assets/tubeav-strong/card-7.png";
import strongCard8 from "@/assets/tubeav-strong/card-8.png";
import strongCard9 from "@/assets/tubeav-strong/card-9.png";
import strongCard10 from "@/assets/tubeav-strong/card-10.png";
import strongCard11 from "@/assets/tubeav-strong/card-11.png";
import strongCard12 from "@/assets/tubeav-strong/card-12.png";

const DONATE_URL = "https://www.matara.pro/nedarimplus/online/?mosad=7018043";

const hearts = [heart8.url, heart9.url, heart10.url, heart11.url];

const cards = [
  { src: card6.url, alt: "לאהוב את עצמי" },
  { src: card7.url, alt: "להתאהב בכמעט" },
  { src: card1.url, alt: "פשוט להיות" },
  { src: card2.url, alt: "לנשום רגע" },
  { src: card3.url, alt: "דברים קורים בקצב שלהם" },
  { src: card4.url, alt: "להתמסר ללב שלך" },
  { src: card5.url, alt: "כל אחד פורח ברגע המיוחד לו" },
];

const strongCards = [
  { src: strongCard1, alt: "אם אמות מחר אגלה שפחדתי לחינם – שולמית בן דוד" },
  { src: strongCard2, alt: "רק מי שלא התייאש יודע לומר שאין כמו להתפלל – הודיה יהוד" },
  { src: strongCard3, alt: "חלקים מהלב שלי מפוזרים בכל העולם – שולמית בן דוד" },
  { src: strongCard4, alt: "תהיי לך, ואז היית. והיית לאיש – זיוה" },
  { src: strongCard5, alt: "ואני לא רציתי שום דבר. כלום – שרי אורנג'" },
  { src: strongCard6, alt: "שארגיש באמת שאחיה את כל מה שבתוכי מת – הודיה יהוד" },
  { src: strongCard7, alt: "מחפשת מישהו שיעיר לי את הלב – הודיה יהוד" },
  { src: strongCard8, alt: "השנה הצלחתי להתאהב בכמעט – חיה שהם" },
  { src: strongCard9, alt: "לא ידעתי שקיים דבר כזה – אלישבע פוטאש" },
  { src: strongCard10, alt: "אתה שותק, ואני בוכה. תפילה – שרי אורנג'" },
  { src: strongCard11, alt: "שברנו. לא צלחת. לא שידוך – בת חן" },
  { src: strongCard12, alt: "ואף על פי – שמחוש" },
];


const points = [
  {
    title: "רווקות מתמשכת היא לא רק מצב משפחתי.",
    body: [
      "עבור עשרות אלפי נשים בישראל היא משפיעה על תחומי חיים רבים - משפחה, קהילה, בריאות, פוריות, תעסוקה והחוויה הנפשית.",
      "ובכל זאת, היא עדיין **כמעט שאינה זוכה להכרה ציבורית או למדיניות שמותאמת לצרכים הייחודיים שלה.**",
    ],
  },
  {
    title: "כשאין מענה - אפשר לבנות אותו.",
    body: [
      "**עמותת ליבי הוקמה מתוך ההבנה שהמציאות הזו יכולה להיראות אחרת.**",
      "אחד הפרויקטים שלה הוא אחותי כלה - מודל חדשני שנבנה עבור נשים רווקות, ומציע קהילה, אירועים, תוכן, ליווי, יוזמות חברתיות, מרכז ידע לשימור פוריות ומענים שנולדו מתוך הקשבה אמיתית לצרכים מהשטח.",
      "אנחנו מאמינות שזה לא צריך להישאר פרויקט אחד. זו דוגמה למודל שאפשר וצריך להרחיב לעוד ערים ולעוד קהילות.",
    ],
  },
  {
    title: "מודעות היא הצעד הראשון לשינוי.",
    body: [
      "ולכם יש כוח לעשות את זה.",
      "כל שיתוף של אחת מהגלויות עוזר לעוד אדם לראות מציאות שרבים פשוט לא מכירים.",
      "אם אחת מהן נגעה בכם - **העבירו אותה הלאה.**",
    ],
  },
  {
    title: "אם גם לכם חשוב שהמציאות הזו תיראה אחרת - אפשר להיות חלק ממנה.",
    body: [
      "**כל תרומה מאפשרת לנו להמשיך להפוך רעיונות למענים**, ומענים לשינוי אמיתי בחייהן של אלפי נשים.",
    ],
  },
];


const renderEmphasis = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={idx} className="font-medium text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={idx}>{part}</span>
    )
  );


const TuBeavAwareness = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [contactTab, setContactTab] = useState<ContactTab>("lecture");
  const [mailingOpen, setMailingOpen] = useState(false);

  const share = async (url: string, alt: string) => {
    const pageUrl = `${window.location.origin}/yom-hamodaut`;
    const seriesUrl = `${pageUrl}#cards`;
    const message = `${alt}\n\nמתוך יום המודעות לרווקות מתמשכת של אחותי כלה 🤍\n${pageUrl}\n\nלערכת הגלויות המלאה:\n${seriesUrl}\n\nלתרומה ולתמיכה בעשייה:\n${DONATE_URL}`;

    // Try sharing the actual image file (WhatsApp shows it as a photo with caption)
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const file = new File([blob], `achoti-kala-${Date.now()}.${ext}`, {
        type: blob.type || "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: message });
        return;
      }
    } catch {
      /* fall through to text share */
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: alt, text: message });
        return;
      } catch {
        return; /* user cancelled */
      }
    }

    // Desktop fallback: open WhatsApp with the text, and the image in a new tab to save
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };


  const sharePage = async () => {
    const full = window.location.href;
    const title = document.title || "יום המודעות לרווקות מתמשכת";
    if (navigator.share) {
      try {
        await navigator.share({ title, url: full });
        return;
      } catch {
        /* user cancelled */
      }
    }
    window.open(full, "_blank");
  };

  const shareFertility = async () => {
    const full = `${window.location.origin}/shimur-poriut`;
    const title = "יודעת - מרכז ידע לשימור פוריות";
    const text = "אתר שמרכז מידע ברור ומלווה על שימור פוריות. אולי זה בדיוק מה שמישהי קרובה אלייך צריכה לדעת.";
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: full });
        return;
      } catch {
        /* user cancelled */
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text} ${full}`)}`,
      "_blank"
    );
  };

  const shareEnglish = async () => {
    const full = window.location.href;
    const title = "Awareness Day for Long-Term Single Women";
    const text = "This site is also available in English.";
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: full });
        return;
      } catch {
        /* user cancelled */
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${title} ${text} ${full}`)}`,
      "_blank"
    );
  };


  const openContact = (tab: ContactTab) => {
    setContactTab(tab);
    setContactOpen(true);
  };


  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground font-light pb-20 lg:pb-0">
      <div className="hidden lg:block">
        <SiteHeader />
      </div>

      {/* HERO */}
      <section className="pt-10 md:pt-32 pb-10 md:pb-16 px-6 md:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <a
            href="#cards"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs tracking-wide mb-6 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Heart className="w-3.5 h-3.5" fill="currentColor" />
            לסדרת הגלויות
          </a>

          <h1 className="text-3xl md:text-5xl font-light tracking-tight leading-tight mb-5">
            יום המודעות
            <br />
            <span className="text-primary">לרווקות מתמשכת</span>
          </h1>
          <p className="text-base md:text-xl text-foreground/70 leading-relaxed mb-6">
            4 דברים שהיינו שמחות שלא נצטרך להסביר.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#cards"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm md:text-base shadow-md hover:shadow-lg transition-all"
              style={{
                background: "linear-gradient(90deg, hsl(24 90% 62%) 0%, hsl(325 75% 67%) 100%)",
              }}
            >
              <Heart className="w-4 h-4" fill="currentColor" />
              לסדרת הגלויות
            </a>
            <a
              href="#strong-cards"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/40 text-primary text-sm md:text-base hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Heart className="w-4 h-4" strokeWidth={1.5} />
              לגלויות לבעלי לב חזק
            </a>
          </div>

        </div>
      </section>

      {/* POINTS */}
      <section className="pb-14 md:pb-20 px-6 md:px-10">
        <div className="max-w-3xl mx-auto grid gap-5 md:gap-6">
          {points.map((p, i) => (
            <article
              key={p.title}
              className="bg-card border border-border/60 rounded-2xl md:rounded-3xl p-6 md:p-8 text-right shadow-[0_8px_30px_-16px_hsl(0_0%_0%_/_0.18)]"
            >
              <div className="flex items-start gap-4">
                <img
                  src={hearts[i % hearts.length]}
                  alt=""
                  aria-hidden="true"
                  className="shrink-0 w-10 h-10 md:w-12 md:h-12 object-contain"
                />
                <div>
                  <h2 className="text-xl md:text-3xl font-light leading-snug mb-3">{p.title}</h2>
                  {p.body.map((t) => (
                    <p key={t} className="text-sm md:text-base text-foreground/70 leading-loose mb-2 last:mb-0">
                      {renderEmphasis(t)}
                    </p>

                  ))}
                  {i === points.length - 1 && (
                    <a
                      href={DONATE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-5 px-8 py-3 rounded-full text-white text-sm md:text-base shadow-md hover:shadow-lg transition-all"
                      style={{
                        background:
                          "linear-gradient(90deg, hsl(24 90% 62%) 0%, hsl(325 75% 67%) 100%)",
                      }}
                    >
                      לתרומה
                    </a>
                  )}
                </div>
              </div>
            </article>

          ))}
        </div>
      </section>

      {/* PARTNERS */}
      <section className="pb-20 md:pb-28 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border/60 rounded-2xl md:rounded-3xl p-6 md:p-10 text-right shadow-[0_8px_30px_-16px_hsl(0_0%_0%_/_0.18)]">
            <h2 className="text-lg md:text-2xl font-light leading-snug mb-6">
              יש יותר מדרך אחת להיות שותפים.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 font-medium text-foreground mb-1">
                  <Heart className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  לתרום
                </div>
                <p className="text-sm md:text-base text-foreground/70 leading-relaxed mb-3">
                  כדי שנוכל להמשיך לבנות מענים חדשים לכמה שיותר נשים.
                </p>
                <a
                  href={DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border bg-background text-foreground text-sm md:text-base font-normal hover:border-primary hover:text-primary transition-colors"
                >
                  לתרום
                </a>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 font-medium text-foreground mb-1">
                  <Share2 className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  לשתף
                </div>
                <p className="text-sm md:text-base text-foreground/70 leading-relaxed mb-3">
                  כדי שעוד אנשים יכירו את המציאות של רווקות מתמשכת.
                </p>
                <button
                  type="button"
                  onClick={sharePage}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border bg-background text-foreground text-sm md:text-base font-normal hover:border-primary hover:text-primary transition-colors"
                >
                  לשתף
                </button>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 font-medium text-foreground mb-1">
                  <Users className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  לחבר
                </div>
                <p className="text-sm md:text-base text-foreground/70 leading-relaxed mb-3">
                  כדי שנוכל להגיע לעוד שותפים, ארגונים ואנשים שרוצים להשפיע.
                </p>
                <a
                  href="https://wa.me/972585528233?text=היי%20רוצה%20לשמוע%20עוד%20על%20שותפות%20עם%20אחותי%20כלה"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border bg-background text-foreground text-sm md:text-base font-normal hover:border-primary hover:text-primary transition-colors"
                >
                  לחבר
                </a>
              </div>
            </div>

            <div className="border-t border-border/60 pt-6">
              <p className="text-sm md:text-base text-foreground/65 font-light mb-3">
                רוצים ללמוד איך עשינו את זה?
              </p>
              <p className="text-sm md:text-base text-foreground/70 leading-relaxed mb-4">
                איך בונים פרויקט שמגיע למאות נשים, יוצר יוזמות חדשות ומשפיע על השיח הציבורי – כמעט בלי תקציב? אנחנו משתפות בדרך שעברנו, בהחלטות שקיבלנו, באתגרים שפגשנו ובמודל שפיתחנו – כדי לעזור לעוד ארגונים, רשויות ויזמים חברתיים לבנות מענים חדשניים מתוך הקשבה אמיתית לצרכים מהשטח.
              </p>
              <button
                type="button"
                onClick={() => openContact("lecture")}
                className="text-sm md:text-base font-normal text-primary hover:text-primary/80 transition-colors"
              >
                להזמנת הרצאה או שיחה
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PASS IT ON */}
      <section className="pb-10 md:pb-16 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border/60 rounded-2xl md:rounded-3xl p-6 md:p-8 text-right shadow-[0_8px_30px_-16px_hsl(0_0%_0%_/_0.18)]">
            <h2 className="text-lg md:text-2xl font-light leading-snug mb-4">
              💛 יש דברים שכדאי פשוט להעביר הלאה.
            </h2>
            <div className="space-y-3 text-sm md:text-base text-foreground/70 leading-loose mb-6">
              <p>
                אם אתם מכירים אישה רווקה מהמגזר החרדי, נשמח שתספרו לה על אחותי כלה.
              </p>
              <p>
                יצרנו מרחב שמציע קהילה, תוכן, אירועים, כלים ומענים שנבנו במיוחד עבורה – מתוך אמונה שאף אחת לא צריכה להתמודד לבד עם האתגרים של רווקות מתמשכת.
              </p>
              <p>
                אולי הקישור הזה יהיה בדיוק מה שהיא הייתה צריכה לפגוש.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm md:text-base shadow-md hover:shadow-lg transition-all"
                style={{
                  background: "linear-gradient(90deg, hsl(24 90% 62%) 0%, hsl(325 75% 67%) 100%)",
                }}
              >
                לאתר אחותי כלה
              </Link>
              <button
                type="button"
                onClick={() => setMailingOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border bg-background text-foreground text-sm md:text-base hover:border-primary hover:text-primary transition-colors"
              >
                להצטרפות לתפוצה
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CARDS */}
      <section id="cards" className="scroll-mt-24 pb-16 md:pb-24 px-6 md:px-10 bg-card/40 pt-14 md:pt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <div className="w-12 h-px bg-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-4xl font-light tracking-tight mb-3">הגלויות שנוצרו בשבילך</h2>
            <p className="text-foreground/65 text-sm md:text-base">
              נגע בכם? שתפו הלאה.
            </p>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {cards.map((c) => (
              <figure
                key={c.src}
                className="group bg-card rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_10px_36px_-16px_hsl(0_0%_0%_/_0.25)] hover:-translate-y-1 transition-all duration-300"
              >
                <img
                  src={c.src}
                  alt={c.alt}
                  loading="lazy"
                  className="w-full h-auto block"
                />
                <figcaption className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="text-xs md:text-sm text-foreground/70 truncate">{c.alt}</span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => share(c.src, c.alt)}
                      aria-label={`שיתוף - ${c.alt}`}
                      className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Share2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <a
                      href={c.src}
                      download
                      aria-label={`הורדה - ${c.alt}`}
                      className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Download className="w-4 h-4" strokeWidth={1.5} />
                    </a>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* STRONG HEART CARDS */}
      <section className="pb-16 md:pb-24 px-6 md:px-10 bg-primary/5 pt-14 md:pt-20">
        <div className="max-w-5xl mx-auto">
          <div id="strong-cards" className="text-center mb-10 md:mb-14 scroll-mt-28">
            <div className="w-12 h-px bg-primary mx-auto mb-6" />
            <h2 className="text-2xl md:text-4xl font-light tracking-tight mb-3">גלויות לבעלי לב חזק</h2>
            <p className="text-foreground/65 text-sm md:text-base">
              משפטים חזקים מפרויקט יוצאות לאור
            </p>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {strongCards.map((c) => (
              <figure
                key={c.src}
                className="group bg-card rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_10px_36px_-16px_hsl(0_0%_0%_/_0.25)] hover:-translate-y-1 transition-all duration-300"
              >
                <img
                  src={c.src}
                  alt={c.alt}
                  loading="lazy"
                  className="w-full h-auto block"
                />
                <figcaption className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="text-xs md:text-sm text-foreground/70 truncate">{c.alt}</span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => share(c.src, c.alt)}
                      aria-label={`שיתוף - ${c.alt}`}
                      className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Share2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <a
                      href={c.src}
                      download
                      aria-label={`הורדה - ${c.alt}`}
                      className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Download className="w-4 h-4" strokeWidth={1.5} />
                    </a>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* DONATE */}
      <section className="py-16 md:py-24 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl md:rounded-[40px] px-7 md:px-16 py-10 md:py-16 text-center"
            style={{
              background: "linear-gradient(90deg, hsl(24 90% 62%) 0%, hsl(325 75% 67%) 100%)",
            }}
          >
            <h2 className="text-white text-2xl md:text-4xl font-light leading-tight mb-4">
              🤍 לתרומה לעשייה של אחותי כלה ועמותת ליבי
            </h2>
            <p className="text-white/95 text-sm md:text-lg leading-relaxed mb-8">
              כל תרומה הופכת רעיונות למענים, ומענים לשינוי אמיתי.
            </p>
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-10 py-4 rounded-full bg-white text-foreground text-base md:text-lg shadow-md hover:shadow-xl transition-all"
            >
              לתרומה
            </a>
          </div>
        </div>
      </section>





      {/* FERTILITY KNOWLEDGE SHARE */}
      <section className="pb-16 md:pb-24 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-primary/25 bg-primary/5 p-7 md:p-10 text-right">
            <Sparkles className="absolute -top-4 -left-4 w-24 h-24 text-primary/10" strokeWidth={1} aria-hidden="true" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 text-primary text-xs mb-5">
                <Heart className="w-3.5 h-3.5" fill="currentColor" />
                ידע ששווה להעביר הלאה
              </span>
              <h2 className="text-xl md:text-3xl font-light leading-snug mb-4">
                שימור פוריות - יש נשים שעדיין לא יודעות ש<span className="text-primary">אפשר לבחור</span>.
              </h2>
              <p className="text-sm md:text-base text-foreground/70 leading-loose mb-3">
                הקמנו את <strong className="font-medium text-foreground">"יודעת"</strong> - מרכז ידע עדין וברור על שימור פוריות, שנכתב בגובה העיניים: מה התהליך, כמה זה עולה, איפה עושים ואיך מתחילים.
              </p>
              <p className="text-sm md:text-base text-foreground/70 leading-loose mb-7">
                לפעמים די בקישור אחד שנשלח בזמן הנכון כדי לפתוח בפני אישה אפשרות שלא ידעה שקיימת. <strong className="font-medium text-foreground">אם עולה בדעתך מישהי שזה רלוונטי עבורה - שלחי לה.</strong>
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={shareFertility}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-white text-sm md:text-base shadow-md hover:shadow-lg transition-all"
                  style={{
                    background: "linear-gradient(90deg, hsl(24 90% 62%) 0%, hsl(325 75% 67%) 100%)",
                  }}
                >
                  <Share2 className="w-4 h-4" strokeWidth={1.5} />
                  לשיתוף הקישור
                </button>
                <Link
                  to="/shimur-poriut"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-border bg-background text-foreground text-sm md:text-base hover:border-primary hover:text-primary transition-colors"
                >
                  לאתר יודעת
                </Link>
              </div>
              <div className="mt-8 pt-6 border-t border-primary/20">
                <p className="text-sm md:text-base text-foreground/70 leading-relaxed mb-3 text-left" dir="ltr">
                  This site is also available in English.
                </p>
                <button
                  type="button"
                  onClick={shareEnglish}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-background text-foreground text-sm md:text-base hover:border-primary hover:text-primary transition-colors"
                >
                  <Globe className="w-4 h-4" strokeWidth={1.5} />
                  Share in English
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ContactPopup open={contactOpen} onOpenChange={setContactOpen} defaultTab={contactTab} />

      <MailingListPopup open={mailingOpen} onOpenChange={setMailingOpen} />

      <MobileBottomNav />
    </div>
  );
};

export default TuBeavAwareness;
