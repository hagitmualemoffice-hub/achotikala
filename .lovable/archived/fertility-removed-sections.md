# Archived sections — FertilityPreservation.tsx

Removed on user request (2026-06-28). The user wanted these sections off the main `/shimur-poriut` page because all the info is now in the dedicated series pages (decision / before-start / process / after). If she ever wants them back, drop the JSX below back into `src/pages/FertilityPreservation.tsx` in their original locations.

The download links to both presentations are kept as small chips in `SmartChipsNav` (icons: `Download`).

---

## 1. Section "כל המידע שאת צריכה לדעת" (main info presentation)
Was between the SmartChipsNav and the "אנחנו איתך בדרך לשאיבה" section.

```tsx
<section
  id="info"
  className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6 scroll-mt-28"
>
  <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
    <div className="text-right mb-6 md:mb-12 px-1">
      <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-2 md:mb-3">
        <span className="font-light">כל המידע שאת צריכה לדעת</span>
      </h2>
      <p className="text-foreground/80 text-sm md:text-lg font-light leading-relaxed">
        קובץ מידע, פודקאסט ושיחה כנה על החוויה הנפשית - שלוש דרכים להיכנס לתהליך עם ידע, שקט וביטחון.
      </p>
      <SectionChips
        chips={[
          { label: "קובץ המידע", icon: FileText, href: "#main-info" },
          { label: "פודקאסט", icon: Mic, href: "/podcast", isLink: true },
          { label: "ראיון בוידאו", icon: PlayCircle, href: YOUTUBE_WATCH, external: true },
          { label: "פוסטים - לפני ההחלטה", icon: BookOpen, href: "#posts" },
        ]}
      />
    </div>

    {/* קובץ מידע - תצוגה גדולה */}
    <div id="main-info" className="scroll-mt-28 rounded-2xl md:rounded-3xl overflow-hidden bg-card shadow-[0_15px_40px_-15px_hsl(0_0%_0%_/_0.15)] border border-primary/5">
      <div className="aspect-[16/10] w-full bg-muted">
        <iframe
          src={MAIN_INFO_EMBED}
          title="יודעת - קובץ המידע של חגית מועלם"
          className="w-full h-full"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>

    <div className="mt-6 md:mt-8 flex flex-col md:flex-row items-stretch md:items-center md:justify-center gap-3 md:flex-wrap">
      <a href={MAIN_INFO_SLIDES} target="_blank" rel="noopener noreferrer" className="inline-flex w-3/4 mx-auto md:w-auto md:mx-0 items-center justify-center gap-2 px-8 md:px-10 py-3 rounded-lg bg-primary text-primary-foreground text-sm md:text-base font-light hover:bg-[hsl(var(--primary-glow))] transition-colors">
        <ExternalLink className="w-4 h-4" />
        פתיחה במסך מלא
      </a>
      <a href={MAIN_INFO_SLIDES.replace("/present", "/export/pdf")} target="_blank" rel="noopener noreferrer" className="inline-flex w-3/4 mx-auto md:w-auto md:mx-0 items-center justify-center gap-2 px-8 md:px-10 py-3 rounded-lg bg-white text-foreground text-sm md:text-base font-light border border-border hover:bg-accent transition-colors">
        <Download className="w-4 h-4" />
        הורדה כ-PDF
      </a>
    </div>

    {/* פודקאסט וסרטון */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-10 md:mt-16">
      <Link to="/podcast" className="flex flex-col group cursor-pointer transition-all duration-300 ease-out hover:scale-[1.03]">
        <img src={podcastCover} alt="יודעת - פודקאסט" loading="lazy" className="w-full h-auto rounded-2xl md:rounded-3xl shadow-[0_15px_40px_-15px_hsl(0_0%_0%_/_0.15)] transition-shadow duration-300 group-hover:shadow-[0_25px_50px_-15px_hsl(var(--primary)/0.3)]" />
        <div className="mt-3 md:mt-5 text-right text-foreground text-sm md:text-base">
          <span className="font-bold">פודקאסט</span>
          <span className="text-foreground/50 mx-2">|</span>
          <span className="font-light group-hover:text-primary transition-colors">שימור פוריות והחוויה הנפשית</span>
        </div>
      </Link>
      <a href={YOUTUBE_WATCH} target="_blank" rel="noopener noreferrer" className="flex flex-col group cursor-pointer transition-all duration-300 ease-out hover:scale-[1.03]">
        <div className="relative w-full aspect-video rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_15px_40px_-15px_hsl(0_0%_0%_/_0.15)] transition-shadow duration-300 group-hover:shadow-[0_25px_50px_-15px_hsl(var(--primary)/0.3)] bg-foreground">
          <iframe src={YOUTUBE_EMBED} title="ראיון אצל ד״ר חנה קטן" className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
        </div>
        <div className="mt-3 md:mt-5 text-right text-foreground text-sm md:text-base">
          <span className="font-bold">בקצרצרה</span>
          <span className="text-foreground/50 mx-2">|</span>
          <span className="font-light group-hover:text-primary transition-colors">שימור פוריות וחוויה נפשית ראיון אצל ד״ר חנה קטן</span>
        </div>
      </a>
    </div>
  </div>
</section>
```

## 2. Section "אחרי השאיבה - כל מה שצריך לדעת"
Was between CommunityWhatsAppGroups and the posts/blog grid.

```tsx
<section
  id="after"
  className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6 scroll-mt-28"
>
  <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
    <div className="text-right mb-6 md:mb-12 px-1">
      <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-2 md:mb-3">
        <span className="font-light">אחרי השאיבה</span>
        <span className="mx-2 md:mx-3 font-light">|</span>
        <span className="font-light">כל מה שצריך לדעת</span>
      </h2>
      <p className="text-foreground/80 text-sm md:text-lg font-light leading-relaxed">
        ליווי ברור ומחבק ליום שאחרי - מה לצפות, איך לטפל בעצמך, מה רגיל ומה כדאי לבדוק.
      </p>
      <SectionChips
        chips={[
          { label: "מצגת אחרי השאיבה", icon: FileText, href: AFTER_RETRIEVAL_SLIDES, external: true },
        ]}
      />
    </div>

    <div className="rounded-2xl md:rounded-3xl overflow-hidden bg-card shadow-[0_15px_40px_-15px_hsl(0_0%_0%_/_0.15)] border border-primary/5">
      <div className="aspect-[16/10] w-full bg-muted">
        <iframe src={AFTER_RETRIEVAL_EMBED} title="כל המידע שאת צריכה לדעת על אחרי השאיבה" className="w-full h-full" allowFullScreen loading="lazy" />
      </div>
    </div>

    <div className="mt-8 md:mt-12 flex flex-col md:flex-row items-stretch md:items-center md:justify-center gap-3 md:flex-wrap">
      <a href={AFTER_RETRIEVAL_SLIDES} target="_blank" rel="noopener noreferrer" className="inline-flex w-3/4 mx-auto md:w-auto md:mx-0 items-center justify-center gap-2 px-8 md:px-10 py-3 rounded-lg bg-primary text-primary-foreground text-sm md:text-base font-light hover:bg-[hsl(var(--primary-glow))] transition-colors">
        <ExternalLink className="w-4 h-4" />
        פתיחה במסך מלא
      </a>
      <a href={AFTER_RETRIEVAL_SLIDES.replace("/present", "/export/pdf")} target="_blank" rel="noopener noreferrer" className="inline-flex w-3/4 mx-auto md:w-auto md:mx-0 items-center justify-center gap-2 px-8 md:px-10 py-3 rounded-lg bg-white text-foreground text-sm md:text-base font-light border border-border hover:bg-accent transition-colors">
        <Download className="w-4 h-4" />
        הורדה כ-PDF
      </a>
    </div>
  </div>
</section>
```

## 3. Intro paragraph block in FertilitySeriesPage.tsx
Was just above the body grid in `src/pages/FertilitySeriesPage.tsx`:

```tsx
<section className="w-full pt-16 md:pt-28 pb-10 md:pb-16 px-[42px] md:px-6">
  <div className="w-full md:w-[min(820px,68%)] mx-auto text-center">
    <p className="text-foreground/85 text-base md:text-xl font-light leading-loose">{page.intro}</p>
  </div>
</section>
```
