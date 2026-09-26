import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import logo from "@/assets/logo-achoti-kala.png";
import heroImg from "@/assets/yotzot-laor-year.jpg";
import { yotzotQuotes } from "@/data/yotzotQuotes";

const QuoteCard = ({ text, author }: { text: string; author: string }) => (
  <div className="h-full bg-card rounded-2xl md:rounded-3xl p-6 md:p-7 shadow-[0_8px_30px_-8px_hsl(0_0%_0%_/_0.1)] hover:shadow-[0_16px_40px_-12px_hsl(var(--primary)/0.18)] transition-all duration-300 hover:-translate-y-0.5 text-right flex flex-col">
    <p className="text-foreground text-sm md:text-base font-light leading-loose whitespace-pre-line mb-5 md:mb-6 flex-1">
      {text}
    </p>
    <span className="text-primary text-sm font-medium">{author}</span>
  </div>
);


const YotzotLaorYear = () => {
  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0" dir="rtl">
      <div className="hidden lg:block">
        <SiteHeader />
      </div>

      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-center px-5 py-3">
          <Link to="/" aria-label="אחותי כלה - דף הבית">
            <img src={logo} alt="אחותי כלה" className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <div className="h-12 md:h-20" />

      {/* HERO */}
      <section className="w-full pt-4 md:pt-12 pb-8 md:pb-16 px-[30px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto text-right">
          <div className="relative -mx-[30px] md:mx-0 rounded-none md:rounded-[40px] overflow-hidden mb-6 md:mb-8 md:shadow-[0_12px_40px_-12px_hsl(0_0%_0%_/_0.12)]">
            <div className="aspect-[4/5] md:aspect-[21/9]">
              <img
                src={heroImg}
                alt="יוצאות לאור - שנה"
                className="w-full h-full object-cover"
                width={1200}
                height={688}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-l from-background/90 via-background/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center items-end px-6 md:px-14">
              <div className="max-w-lg">
                <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                  <span className="block w-1 h-8 md:h-10 bg-primary rounded-full" />
                  <h1 className="text-foreground text-[2.25rem] md:text-5xl font-light tracking-tight leading-tight">
                    יוצאות לאור - שנה
                  </h1>
                </div>
                <p className="text-foreground/70 text-sm md:text-xl font-light leading-relaxed pr-4 md:pr-6">
                  91 משפטים נבחרים משיריהן של נשים מהקהילה, לרגל שנה ל"יוצאות לאור". מילים שנכתבו בקול אמיתי.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 text-sm text-foreground/60 mb-2">
            <Link to="/blog" className="hover:text-primary transition-colors">
              בלוג
            </Link>
            <span>/</span>
            <span>יוצאות לאור - שנה</span>
          </div>
        </div>
      </section>

      {/* QUOTES GRID */}
      <section className="w-full pb-16 md:pb-24 px-[30px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 items-stretch">
            {yotzotQuotes.map((quote, index) => (
              <QuoteCard key={index} text={quote.text} author={quote.author} />
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="w-full pb-20 md:pb-28 px-[30px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto">
          <div
            className="rounded-2xl md:rounded-[40px] px-7 md:px-20 py-10 md:py-20 text-right"
            style={{
              background: "linear-gradient(90deg, hsl(172 79% 79%) 0%, hsl(325 75% 69%) 100%)",
            }}
          >
            <div className="w-full md:w-[min(680px,90%)] mr-0">
              <h2 className="text-white text-[1.5rem] md:text-4xl font-light leading-tight mb-4 md:mb-5">
                רוצה לקרוא עוד?
              </h2>
              <p className="text-white/95 text-sm md:text-lg font-light leading-relaxed mb-6 md:mb-8">
                עוד שירים, טורים ומחשבות מחכות לך בבלוג. מילים שנולדות מהחיים עצמם.
              </p>
              <Link
                to="/blog"
                className="inline-block px-8 md:px-10 py-3 rounded-lg bg-white text-foreground text-sm md:text-base font-light shadow-md hover:bg-primary hover:text-primary-foreground transition-all"
              >
                לבלוג
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MobileBottomNav />
    </div>
  );
};

export default YotzotLaorYear;
