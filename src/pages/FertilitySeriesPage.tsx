import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  Sparkles,
  BookOpen,
  Compass,
  Activity,
  Heart,
  Mail,
  HandHeart,
  HelpCircle,
  
  CircleDot,
  ChevronDown,
  AlertTriangle,
  Scale,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import logo from "@/assets/logo-achoti-kala.png";
import flowersAsset from "@/assets/series/letter-flowers.jpg.asset.json";
const flowersImg = flowersAsset.url;
import { SERIES_IMAGES } from "@/assets/series/manifest";
import { SERIES_PAGES, SERIES_NAV, type SeriesPageDef, type SeriesSection, type AuthorLetter } from "@/data/fertilitySeries";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  decision: Compass,
  "emotions-before": HandHeart,
  "before-start": BookOpen,
  process: Activity,
  after: Heart,
};

const FertilitySeriesPage = ({ pageKey }: { pageKey: string }) => {
  const page = SERIES_PAGES.find((p) => p.key === pageKey) as SeriesPageDef;
  const location = useLocation();

  // Separate FAQs (rendered as accordion) from regular scroll sections
  const regularSections = page.sections.filter((s) => !s.id.startsWith("faq-"));
  const navIds = regularSections.map((s) => s.id);
  const [activeId, setActiveId] = useState<string>(navIds[0] ?? "");

  useEffect(() => {
    const handler = () => {
      const fromTop = window.scrollY + 140;
      let current = navIds[0] ?? "";
      for (const id of navIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= fromTop) current = id;
      }
      setActiveId(current);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [page]);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 overflow-x-clip" dir="rtl">
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

      {/* Page header - podcast style (no hero image) */}
      <section className="w-full pt-6 pb-6 md:pt-16 md:pb-10 px-[42px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto">
          <Link
            to="/shimur-poriut"
            className="inline-flex items-center gap-1.5 text-foreground/60 hover:text-primary text-xs md:text-sm font-light mb-4 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            חזרה לשימור פוריות
          </Link>
          <p className="text-primary text-[11px] md:text-sm font-medium tracking-[0.25em] mb-3">
            {page.kicker}
          </p>
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
            <span className="block w-1 h-8 md:h-12 bg-primary rounded-full shrink-0" />
            <h1 className="text-foreground text-[1.75rem] md:text-6xl font-light tracking-tight leading-tight">
              {page.title} <span className="text-primary font-semibold">{page.highlight}</span>
            </h1>
          </div>
          <p className="text-foreground/70 text-sm md:text-xl font-light max-w-2xl pr-3 md:pr-5 leading-relaxed">
            {page.subtitle}
          </p>
        </div>
      </section>

      {/* Series top nav */}
      <section className="w-full bg-gradient-to-b from-accent/40 via-card to-card border-b border-border/40">
        <div className="w-full md:w-[min(1100px,90%)] mx-auto px-[42px] md:px-6 py-5 md:py-6">
          <p className="text-xs md:text-sm font-medium text-foreground/60 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            סדרת המידע על שימור פוריות
          </p>
          <div className="flex flex-wrap gap-2">
            {SERIES_NAV.map((p) => {
              const Icon = PAGE_ICONS[p.key] ?? BookOpen;
              const isActive = p.key === pageKey;
              const cls = isActive
                ? "bg-primary text-primary-foreground border border-primary font-medium shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.6)]"
                : "bg-card border border-border/70 text-foreground/80 font-light hover:bg-primary hover:text-primary-foreground hover:border-primary";
              return (
                <Link
                  key={p.key}
                  to={`/${p.slug}`}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs md:text-sm transition-all duration-200 hover:-translate-y-0.5 ${cls}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {p.title} {p.highlight}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mobile sticky in-page nav - opens as drawer */}
      {regularSections.length > 0 && (
        <>
          <div className="md:hidden sticky top-[48px] z-30 bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="w-full flex items-center justify-between px-[42px] py-3 text-foreground/80 text-sm font-medium"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                בעמוד הזה - {regularSections.find((s) => s.id === activeId)?.navLabel ?? regularSections[0]?.navLabel ?? ""}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent side="bottom" className="md:hidden rounded-t-3xl max-h-[80vh] overflow-y-auto" dir="rtl">
              <SheetHeader className="text-right mb-4">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-primary" />
                  בעמוד הזה
                </SheetTitle>
              </SheetHeader>
              <nav className="space-y-1 pb-6">
                {regularSections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setMobileNavOpen(false)}
                    className={`block text-sm rounded-lg px-4 py-3 border-r-2 ${
                      s.id === activeId
                        ? "border-primary text-foreground font-medium bg-accent/50"
                        : "border-transparent text-foreground/70 font-light hover:bg-accent/30"
                    }`}
                  >
                    {s.navLabel ?? s.stage}
                  </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </>
      )}

      {/* Author's personal letter */}
      {page.letter && <LetterBlock letter={page.letter} />}

      <div className="pt-6 md:pt-10" />


      {/* Body grid */}
      <div className="w-full px-[42px] md:px-6 pb-16 md:pb-28">
        <div className="w-full md:w-[min(1200px,92%)] mx-auto grid grid-cols-1 md:grid-cols-[180px_1fr] gap-10 md:gap-16">
          <aside className="hidden md:block">
            <div className="sticky top-24">
              <div className="px-1">
                <p className="text-[10px] font-medium text-foreground/45 mb-4 flex items-center gap-1.5 uppercase tracking-[0.18em]">
                  <Sparkles className="w-3 h-3 text-primary" />
                  בעמוד הזה
                </p>
                <nav className="space-y-0.5">
                  {regularSections.map((s) => {
                    const isActive = s.id === activeId;
                    return (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className={`block text-[12px] leading-snug rounded-md px-2.5 py-1.5 transition-colors border-r-2 ${
                          isActive
                            ? "border-primary text-foreground font-medium"
                            : "border-transparent text-foreground/55 hover:text-foreground/90 hover:border-primary/40 font-light"
                        }`}
                      >
                        {s.navLabel ?? s.stage}
                      </a>
                    );
                  })}
                </nav>
              </div>

              <div className="mt-8 pt-6 border-t border-border/40 px-1">
                <p className="text-[10px] font-medium text-foreground/45 mb-3 uppercase tracking-[0.18em]">
                  המשך הסדרה
                </p>
                <ul className="space-y-2">
                  {SERIES_NAV.filter((p) => p.key !== pageKey).map((p) => {
                    const Icon = PAGE_ICONS[p.key] ?? BookOpen;
                    return (
                      <li key={p.key}>
                        <Link
                          to={`/${p.slug}`}
                          className="flex items-center gap-2 text-[12px] text-foreground/65 hover:text-primary font-light transition-colors leading-snug"
                        >
                          <Icon className="w-3 h-3 text-primary shrink-0" />
                          <span>{p.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            {regularSections.map((section, idx) => (
              <SectionBlock key={section.id} section={section} index={idx} />
            ))}
          </div>
        </div>
      </div>

      {/* Continue the series - next chapters */}
      <section className="w-full px-[42px] md:px-6 py-14 md:py-24 bg-gradient-to-b from-accent/30 to-card">
        <div className="w-full md:w-[min(1100px,90%)] mx-auto" dir="rtl">
          <div className="text-center mb-8 md:mb-12">
            <p className="text-primary text-[11px] md:text-sm font-medium tracking-[0.25em] mb-3">
              המשך הסדרה
            </p>
            <h2 className="text-foreground text-2xl md:text-4xl font-light leading-tight mb-3">
              לאן ממשיכים <span className="text-primary font-semibold">מכאן?</span>
            </h2>
            <p className="text-foreground/70 text-sm md:text-base font-light leading-relaxed max-w-2xl mx-auto">
              הגעת עד כאן בעדינות ובאומץ. בכל קצב שמתאים לך - יש עוד פרקים שמחכים.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {SERIES_NAV.filter((p) => p.key !== pageKey).map((p) => {
              const Icon = PAGE_ICONS[p.key] ?? BookOpen;
              return (
                <Link
                  key={p.key}
                  to={`/${p.slug}`}
                  className="group bg-card border border-border/60 rounded-2xl p-5 md:p-6 text-right hover:border-primary/50 hover:shadow-[0_18px_40px_-22px_hsl(var(--primary)/0.35)] hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                  </div>
                  <p className="text-primary text-[11px] font-medium tracking-wider mb-1">
                    פרק בסדרה
                  </p>
                  <h3 className="text-foreground text-base md:text-lg font-semibold leading-snug mb-1 group-hover:text-primary transition-colors">
                    {p.title} {p.highlight}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-foreground/60 text-xs md:text-sm font-light group-hover:text-primary mt-2">
                    קריאה
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 md:mt-12 text-center">
            <Link
              to="/shimur-poriut"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-border text-foreground/75 text-sm font-light hover:border-primary hover:text-primary transition-colors"
            >
              חזרה לעמוד שימור פוריות
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <MobileBottomNav />
    </div>
  );
};

/* ============ LetterBlock ============ */
const LetterBlock = ({ letter }: { letter: AuthorLetter }) => {
  return (
    <section className="w-full px-[42px] md:px-6 py-10 md:py-16" dir="rtl">
      <div className="w-full md:w-[min(1200px,92%)] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
        <div>
          <div className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden bg-accent/30 shadow-[0_20px_50px_-15px_hsl(0_0%_0%_/_0.15)]">
            <img
              src={flowersImg}
              alt={letter.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-5 right-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm text-foreground text-[11px] md:text-xs font-medium shadow-sm">
              <Mail className="w-3 h-3 text-primary" />
              מכתב פתיחה
            </div>
          </div>
        </div>

        <div dir="rtl">
          <span className="text-primary text-xs md:text-sm font-medium tracking-wide uppercase">
            מכתב פתיחה
          </span>
          <h2 className="text-foreground text-2xl md:text-4xl font-light leading-tight mb-5 mt-2">
            {letter.title}
          </h2>
          <div className="space-y-4 text-foreground/80 text-[15px] md:text-base font-light leading-relaxed">
            {letter.paragraphs.map((p, i) => (
              <p key={i}>{renderRich(p)}</p>
            ))}
            {letter.highlight && (
              <p className="relative pr-5 md:pr-6 border-r-2 border-primary/60 text-foreground font-normal">
                {letter.highlight}
              </p>
            )}
          </div>
          <div className="mt-6 md:mt-8 pt-5 border-t border-border/50">
            <p className="text-foreground/70 text-sm font-light italic">שולחת לך חיבוק,</p>
            <p className="text-foreground text-base md:text-lg font-semibold mt-1">{letter.signature}</p>
            {letter.signatureRole && (
              <p className="text-foreground/60 text-xs md:text-sm font-light mt-0.5">{letter.signatureRole}</p>
            )}
            {letter.signatureContact && (
              <p className="text-foreground/55 text-[11px] md:text-xs font-light mt-1" dir="ltr">{letter.signatureContact}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};


/* ============ SectionBlock with layout variants ============ */
const SectionBlock = ({ section, index }: { section: SeriesSection; index: number }) => {
  const isReversed = index % 2 === 1;
  const image = SERIES_IMAGES[section.imageKey ?? section.id];
  const layout = section.layout ?? "default";

  // Sections with custom layouts render full-width body (no side image column)
  const isCustomLayout = layout !== "default";

  if (isCustomLayout) {
    return (
      <section
        id={section.id}
        className="w-full scroll-mt-24 py-14 md:py-24 first:pt-0 border-b border-border/30 last:border-0"
        dir="rtl"
      >
        <SectionHeader section={section} />
        {layout === "timeline" && <TimelineLayout paragraphs={section.paragraphs} />}
        {layout === "cards" && <CardsLayout paragraphs={section.paragraphs} />}
        {layout === "stages" && <StagesLayout paragraphs={section.paragraphs} />}
        {layout === "anatomy" && <AnatomyLayout paragraphs={section.paragraphs} image={image} />}
        {layout === "discrepancy" && <DiscrepancyLayout paragraphs={section.paragraphs} />}
        {layout === "warning" && <WarningLayout paragraphs={section.paragraphs} />}
        {layout === "phases" && <PhasesLayout paragraphs={section.paragraphs} />}
        <SectionExtras section={section} />
      </section>
    );
  }

  return (
    <section
      id={section.id}
      className="w-full scroll-mt-24 py-14 md:py-24 first:pt-0 border-b border-border/30 last:border-0"
    >
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start ${isReversed ? "md:[direction:ltr]" : ""}`}>
        <div className={isReversed ? "md:[direction:rtl]" : ""}>
          <div className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden bg-accent/30 shadow-[0_20px_50px_-15px_hsl(0_0%_0%_/_0.15)]">
            {image && (
              <img
                src={image}
                alt={section.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
            <div className="absolute top-5 right-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm text-foreground text-[11px] md:text-xs font-medium shadow-sm">
              {section.stage}
            </div>
          </div>
        </div>

        <div className={isReversed ? "md:[direction:rtl]" : ""} dir="rtl">
          <span className="text-primary text-xs md:text-sm font-medium tracking-wide uppercase">
            {section.stage}
          </span>
          <h2 className="text-foreground text-2xl md:text-4xl font-light leading-tight mb-2 mt-2">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-foreground/60 text-sm md:text-base font-light italic mb-5">
              {section.subtitle}
            </p>
          )}

          <div className="space-y-4 text-foreground/80 text-[15px] md:text-base font-light leading-relaxed">
            {section.paragraphs.map((p, i) => (
              <p key={i}>{renderRich(p)}</p>
            ))}
          </div>

          <SectionExtras section={section} compact />
        </div>
      </div>
    </section>
  );
};

const SectionHeader = ({ section }: { section: SeriesSection }) => (
  <div className="mb-8 md:mb-10 max-w-3xl">
    <span className="text-primary text-xs md:text-sm font-medium tracking-wide uppercase">
      {section.stage}
    </span>
    <h2 className="text-foreground text-2xl md:text-4xl font-light leading-tight mb-2 mt-2">
      {section.title}
    </h2>
    {section.subtitle && (
      <p className="text-foreground/60 text-sm md:text-base font-light italic mb-3">
        {section.subtitle}
      </p>
    )}
  </div>
);

const SectionExtras = ({ section, compact = false }: { section: SeriesSection; compact?: boolean }) => (
  <>
    {section.bullets && section.bullets.length > 0 && <PayAttentionBox bullets={section.bullets} />}
    {section.callout && (
      <div className={`${compact ? "mt-6" : "mt-8"} border-r-2 border-primary/60 bg-primary/5 rounded-l-xl rounded-r-sm px-5 py-4 max-w-3xl`}>
        <p className="text-foreground/85 text-sm md:text-base font-light italic leading-relaxed">
          {renderRich(section.callout)}
        </p>
      </div>
    )}
  </>
);

/* ============ "שימי לב" bullet box ============ */
const PayAttentionBox = ({ bullets }: { bullets: string[] }) => (
  <aside
    className="mt-8 relative rounded-2xl border border-primary/25 bg-gradient-to-bl from-primary/[0.06] via-card to-accent/30 px-5 md:px-7 py-5 md:py-6 max-w-3xl shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.25)]"
    dir="rtl"
  >
    <div className="absolute -top-3 right-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] md:text-xs font-medium shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.6)]">
      <Heart className="w-3 h-3 fill-current" />
      שימי לב
    </div>
    <ul className="space-y-3 mt-1">
      {bullets.map((b, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 text-foreground/85 text-sm md:text-[15px] font-light leading-relaxed"
        >
          <CircleDot className="w-3.5 h-3.5 mt-1 text-primary shrink-0" />
          <span>{renderRich(b)}</span>
        </li>
      ))}
    </ul>
  </aside>
);

/* ============ Helpers to split bold-led paragraphs ============ */
type Block = { title?: string; body: string };
const splitBlocks = (paras: string[]): Block[] => {
  const out: Block[] = [];
  for (const p of paras) {
    const m = p.match(/^\*\*([^*]+)\*\*\s*([\s\S]*)$/);
    if (m && m[2].trim()) {
      out.push({ title: m[1].trim(), body: m[2].trim() });
    } else if (m) {
      out.push({ title: m[1].trim(), body: "" });
    } else {
      // continuation - append to previous block body
      if (out.length > 0) {
        out[out.length - 1].body += (out[out.length - 1].body ? "\n\n" : "") + p;
      } else {
        out.push({ body: p });
      }
    }
  }
  return out;
};

/* ============ Timeline layout ============ */
const TimelineLayout = ({ paragraphs }: { paragraphs: string[] }) => {
  const blocks = splitBlocks(paragraphs);
  const titled = blocks.filter((b) => b.title);
  const intro = blocks.find((b) => !b.title);
  return (
    <div className="max-w-4xl">
      {intro && (
        <p className="text-foreground/80 text-[15px] md:text-base font-light leading-relaxed mb-8">
          {renderRich(intro.body)}
        </p>
      )}
      <ol className="relative pr-6 md:pr-8 space-y-7 border-r-2 border-primary/20">
        {titled.map((b, i) => (
          <li key={i} className="relative">
            <span className="absolute -right-[34px] md:-right-[42px] top-1 flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.5)]">
              {i + 1}
            </span>
            <div className="bg-card border border-primary/10 rounded-2xl px-5 md:px-7 py-5 md:py-6 shadow-[0_10px_30px_-18px_hsl(0_0%_0%_/_0.2)]">
              <h3 className="text-foreground text-base md:text-lg font-semibold mb-2">{b.title}</h3>
              <p className="text-foreground/75 text-sm md:text-[15px] font-light leading-relaxed whitespace-pre-line">
                {renderRich(b.body)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

/* ============ Cards layout (e.g. tests) ============ */
const CardsLayout = ({ paragraphs }: { paragraphs: string[] }) => {
  const blocks = splitBlocks(paragraphs);
  const titled = blocks.filter((b) => b.title);
  const intro = blocks.find((b) => !b.title);
  return (
    <div className="max-w-5xl">
      {intro && (
        <p className="text-foreground/80 text-[15px] md:text-base font-light leading-relaxed mb-8">
          {renderRich(intro.body)}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {titled.map((b, i) => (
          <article
            key={i}
            className="bg-card border border-border/60 rounded-2xl px-5 md:px-6 py-5 md:py-6 hover:border-primary/40 hover:shadow-[0_15px_35px_-20px_hsl(var(--primary)/0.3)] transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {i + 1}
              </span>
              <h3 className="text-foreground text-base md:text-lg font-semibold">{b.title}</h3>
            </div>
            <p className="text-foreground/75 text-sm md:text-[15px] font-light leading-relaxed whitespace-pre-line">
              {renderRich(b.body)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
};

/* ============ Stages layout (e.g. meds, retrieval day) ============ */
const StagesLayout = ({ paragraphs }: { paragraphs: string[] }) => {
  const blocks = splitBlocks(paragraphs);
  const intro = blocks.find((b) => !b.title);
  const titled = blocks.filter((b) => b.title);
  let stageNum = 0;
  return (
    <div className="max-w-4xl">
      {intro && (
        <p className="text-foreground/80 text-[15px] md:text-base font-light leading-relaxed mb-8">
          {renderRich(intro.body)}
        </p>
      )}
      <div className="space-y-4">
        {titled.map((b, i) => {
          const title = b.title!;
          const isStage = /^בשלב/.test(title);
          const isCallout = /^חשוב\s?(לזכור|לדעת)/.test(title);

          if (!isStage && !b.body) {
            // Empty-body title -> render as subheading divider
            return (
              <h3
                key={i}
                className="text-foreground text-base md:text-lg font-semibold pt-3 pb-1"
              >
                {title}
              </h3>
            );
          }
          if (isCallout) {
            return (
              <aside
                key={i}
                className="relative rounded-2xl border border-primary/25 bg-gradient-to-bl from-primary/[0.06] via-card to-accent/30 px-6 md:px-8 py-5 md:py-6"
              >
                <div className="absolute -top-3 right-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] md:text-xs font-medium">
                  <Heart className="w-3 h-3 fill-current" />
                  {title.replace(/[:]/g, "")}
                </div>
                <p className="text-foreground/85 text-sm md:text-[15px] font-light leading-relaxed whitespace-pre-line mt-1">
                  {renderRich(b.body)}
                </p>
              </aside>
            );
          }
          if (!isStage) {
            // Other titled block - subheading + body
            return (
              <div key={i} className="pt-2">
                <h3 className="text-foreground text-base md:text-lg font-semibold mb-2">{title}</h3>
                <p className="text-foreground/80 text-sm md:text-[15px] font-light leading-relaxed whitespace-pre-line">
                  {renderRich(b.body)}
                </p>
              </div>
            );
          }
          stageNum += 1;
          // Extract "(לדוגמה: ...)" -> medication chips
          const medMatch = b.body.match(/\(לדוגמה[:\s]*([^)]+)\)/);
          const meds = medMatch ? medMatch[1].split(/[,،]/).map((s) => s.trim()).filter(Boolean) : [];
          const body = medMatch ? b.body.replace(medMatch[0], "").trim() : b.body;
          return (
            <article
              key={i}
              className="relative bg-gradient-to-bl from-accent/30 via-card to-card border border-primary/15 rounded-2xl px-6 md:px-8 py-5 md:py-6"
            >
              <div className="flex items-start gap-4">
                <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-base font-semibold shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.5)]">
                  {stageNum}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground text-base md:text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-foreground/80 text-sm md:text-[15px] font-light leading-relaxed whitespace-pre-line">
                    {renderRich(body)}
                  </p>
                  {meds.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-foreground/55 font-medium ml-1">לדוגמה:</span>
                      {meds.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] md:text-xs font-medium"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

/* ============ Discrepancy layout - 2 highlighted cases of measure gaps ============ */
const DiscrepancyLayout = ({ paragraphs }: { paragraphs: string[] }) => {
  const blocks = splitBlocks(paragraphs);
  const intro = blocks.find((b) => !b.title);
  const cases = blocks.filter((b) => b.title);
  return (
    <div className="max-w-5xl">
      {intro && (
        <p className="text-foreground/80 text-[15px] md:text-base font-light leading-relaxed mb-8">
          {renderRich(intro.body)}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cases.map((b, i) => (
          <article
            key={i}
            className="relative rounded-2xl border-2 border-primary/30 bg-gradient-to-bl from-primary/[0.06] via-card to-accent/30 px-6 py-6 md:py-7"
          >
            <div className="absolute -top-3 right-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] md:text-xs font-medium shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.6)]">
              <Scale className="w-3 h-3" />
              מקרה {i + 1}
            </div>
            <h3 className="text-foreground text-base md:text-lg font-semibold mb-2 mt-1">{b.title}</h3>
            <p className="text-foreground/80 text-sm md:text-[15px] font-light leading-relaxed whitespace-pre-line">
              {renderRich(b.body)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
};

/* ============ Warning layout - amber/red alert callout ============ */
const WarningLayout = ({ paragraphs }: { paragraphs: string[] }) => {
  const blocks = splitBlocks(paragraphs);
  // Treat top-level bullets (single line, no body) as warning list items
  return (
    <div className="max-w-3xl">
      <aside className="relative rounded-2xl border-2 border-[hsl(15_85%_55%)] bg-[hsl(15_85%_55%)]/5 px-6 md:px-8 py-6 md:py-7">
        <div className="absolute -top-3 right-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(15_85%_55%)] text-white text-[11px] md:text-xs font-medium shadow-[0_6px_16px_-6px_hsl(15_85%_55%/0.6)]">
          <AlertTriangle className="w-3 h-3" />
          חשוב לשים לב
        </div>
        <div className="space-y-3 mt-1">
          {blocks.map((b, i) =>
            b.title ? (
              <div key={i}>
                <h4 className="text-foreground font-semibold text-sm md:text-[15px] mb-1">{b.title}</h4>
                <p className="text-foreground/80 text-sm md:text-[15px] font-light leading-relaxed">
                  {renderRich(b.body)}
                </p>
              </div>
            ) : (
              <p
                key={i}
                className="text-foreground/85 text-sm md:text-[15px] font-light leading-relaxed"
              >
                {renderRich(b.body)}
              </p>
            ),
          )}
        </div>
      </aside>
    </div>
  );
};

/* ============ Phases layout - per-stage cards with status + "מה את לא יודעת" ============ */
const PhasesLayout = ({ paragraphs }: { paragraphs: string[] }) => {
  // Each phase = ## prefixed paragraph in source.
  // We parse a flat structure: phase title (starts with ##), then optional 'סטטוס: ...' line,
  // body paragraphs, and 'לא יודעת: -bullet1 -bullet2' marker.
  type Phase = { title: string; body: string[]; status?: string; notKnown?: string[] };
  const phases: Phase[] = [];
  let current: Phase | null = null;
  for (const raw of paragraphs) {
    const p = raw.trim();
    if (p.startsWith("##")) {
      if (current) phases.push(current);
      current = { title: p.replace(/^##\s*/, ""), body: [] };
    } else if (current && p.startsWith("STATUS:")) {
      current.status = p.replace(/^STATUS:\s*/, "");
    } else if (current && p.startsWith("NOT_KNOWN:")) {
      const items = p
        .replace(/^NOT_KNOWN:\s*/, "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      current.notKnown = items;
    } else if (current) {
      current.body.push(p);
    }
  }
  if (current) phases.push(current);

  return (
    <div className="max-w-4xl space-y-6">
      {phases.map((ph, i) => (
        <article
          key={i}
          className="relative bg-card border border-primary/15 rounded-2xl px-6 md:px-8 py-6 md:py-7 shadow-[0_10px_30px_-18px_hsl(0_0%_0%_/_0.2)]"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {i + 1}
            </span>
            <h3 className="text-foreground text-lg md:text-xl font-semibold">{ph.title}</h3>
          </div>
          <div className="space-y-3 text-foreground/80 text-sm md:text-[15px] font-light leading-relaxed">
            {ph.body.map((p, j) => (
              <p key={j}>{renderRich(p)}</p>
            ))}
          </div>

          {ph.status && (
            <div className="mt-5 rounded-xl bg-accent/40 border border-primary/15 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-1">
                סטטוס הפרוטוקול בשלב הזה
              </p>
              <p className="text-foreground/85 text-sm font-light leading-relaxed">{renderRich(ph.status)}</p>
            </div>
          )}

          {ph.notKnown && ph.notKnown.length > 0 && (
            <aside className="mt-4 relative rounded-xl border border-primary/25 bg-primary/[0.04] px-5 py-4">
              <div className="absolute -top-3 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] md:text-[11px] font-medium">
                <Heart className="w-3 h-3 fill-current" />
                מה את לא יודעת בשלב הזה
              </div>
              <ul className="space-y-2 mt-2">
                {ph.notKnown.map((b, k) => (
                  <li
                    key={k}
                    className="flex items-start gap-2 text-foreground/80 text-sm font-light leading-relaxed"
                  >
                    <CircleDot className="w-3 h-3 mt-1.5 text-primary shrink-0" />
                    <span>{renderRich(b)}</span>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </article>
      ))}
    </div>
  );
};

/* ============ Anatomy layout - labeled grid around uterus image ============ */
const AnatomyLayout = ({ paragraphs, image }: { paragraphs: string[]; image?: string }) => {
  const blocks = splitBlocks(paragraphs).filter((b) => b.title);
  return (
    <div className="max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8 md:gap-10 items-start">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 order-2 md:order-1">
          {blocks.map((b, i) => (
            <article
              key={i}
              className="relative bg-card border border-primary/15 rounded-2xl p-4 md:p-5 hover:border-primary/40 transition-colors"
            >
              <div className="absolute -top-2 right-4 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                {i + 1}
              </div>
              <h3 className="text-foreground text-sm md:text-base font-semibold mb-1.5 pt-1">{b.title}</h3>
              <p className="text-foreground/75 text-xs md:text-sm font-light leading-relaxed whitespace-pre-line">
                {renderRich(b.body)}
              </p>
            </article>
          ))}
        </div>
        <div className="md:sticky md:top-24 order-1 md:order-2">
          <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden bg-accent/30 shadow-[0_20px_50px_-15px_hsl(0_0%_0%_/_0.15)]">
            {image && (
              <img src={image} alt="מערכת הרבייה הנשית" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            )}
            <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm text-foreground text-xs font-medium shadow-sm">
              מבט על
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============ FAQ accordion (replaces individual scroll sections) ============ */
export const FaqAccordion = ({ items }: { items: SeriesSection[] }) => {
  return (
    <section id="faq" className="w-full scroll-mt-24 py-14 md:py-24 border-t border-border/30" dir="rtl">
      <div className="max-w-4xl">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-5 h-5 text-primary" />
          <span className="text-primary text-xs md:text-sm font-medium tracking-wide uppercase">
            שאלות נפוצות
          </span>
        </div>
        <h2 className="text-foreground text-2xl md:text-4xl font-light leading-tight mb-3">
          שאלות שאולי <span className="text-primary font-semibold">רצית לשאול</span>
        </h2>
        <p className="text-foreground/70 text-sm md:text-base font-light leading-relaxed mb-8 md:mb-10">
          כל שאלה - הגיונית. בחרי את מה שמעניין אותך, ולחצי כדי לקרוא.
        </p>

        <Accordion type="single" collapsible className="space-y-3">
          {items.map((s, i) => {
            // Skip leading "**title**" line if it duplicates the question
            const cleanParas = s.paragraphs.filter((p, idx) => {
              if (idx === 0 && /^\*\*[^*]+\*\*/.test(p.trim())) {
                const stripped = p.replace(/\*\*([^*]+)\*\*/, "$1").trim();
                if (stripped === s.title || stripped.startsWith(s.title.replace(/[?]/g, ""))) return false;
              }
              return true;
            });
            return (
              <AccordionItem
                key={s.id}
                value={s.id}
                className="border border-border/60 rounded-2xl px-5 md:px-6 bg-card hover:border-primary/30 transition-colors data-[state=open]:border-primary/40 data-[state=open]:shadow-[0_15px_35px_-20px_hsl(var(--primary)/0.25)]"
              >
                <AccordionTrigger className="text-right hover:no-underline py-4 md:py-5 [&[data-state=open]>svg]:rotate-180">
                  <div className="flex items-start gap-3 flex-1 text-right">
                    <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary mt-0.5">
                      <HelpCircle className="w-4 h-4" />
                    </span>
                    <span className="text-foreground text-base md:text-lg font-medium leading-snug">
                      {s.title}
                    </span>
                  </div>
                  
                </AccordionTrigger>
                <AccordionContent className="pb-5 pt-1 pr-10">
                  <div className="space-y-3 text-foreground/80 text-sm md:text-[15px] font-light leading-relaxed">
                    {cleanParas.map((p, idx) => (
                      <p key={idx}>{renderRich(p)}</p>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
};

/* ============ renderRich - bold + markdown links ============ */
// Removes the {.underline} marker that leaks in from pandoc conversion, then
// parses **bold** and [text](url) inline.
const cleanText = (s: string) =>
  s
    .replace(/\{\.underline\}/g, "")
    .replace(/\\(["'])/g, "$1");

type Token = { type: "text" | "bold" | "link"; value: string; href?: string };
const tokenize = (raw: string): Token[] => {
  const text = cleanText(raw);
  const tokens: Token[] = [];
  // Combined regex: **bold** OR [label](url)
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: "text", value: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      tokens.push({ type: "bold", value: m[1] });
    } else if (m[2] !== undefined && m[3] !== undefined) {
      tokens.push({ type: "link", value: m[2].replace(/[\[\]]/g, ""), href: m[3] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) });
  return tokens;
};

const renderRich = (text: string) => {
  const tokens = tokenize(text);
  return tokens.map((t, i) => {
    if (t.type === "bold")
      return (
        <strong key={i} className="font-semibold text-foreground">
          {t.value}
        </strong>
      );
    if (t.type === "link" && t.href)
      return (
        <a
          key={i}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-[hsl(var(--primary-glow))] transition-colors"
        >
          {t.value}
        </a>
      );
    return <span key={i}>{t.value}</span>;
  });
};

export default FertilitySeriesPage;
