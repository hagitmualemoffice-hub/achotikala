import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar as CalendarIcon, MapPin, Ticket, Mail, ArrowLeft, Sparkles, Utensils } from "lucide-react";
import { format, isSameDay, parseISO, startOfMonth, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import SiteHeader from "@/components/SiteHeader";
import logo from "@/assets/logo-achoti-kala.png";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventItem } from "@/data/events";
import { useEvents } from "@/hooks/useEvents";
import { cn } from "@/lib/utils";
import DonationCTA from "@/components/DonationCTA";
import RegistrationButton from "@/components/EventRegistrationButton";
import EventDetailsDialog from "@/components/EventDetailsDialog";

const openFromCard = (e: React.MouseEvent, open: () => void) => {
  if ((e.target as HTMLElement).closest("a,button")) return;
  open();
};

const EventCard = ({ event, onOpen }: { event: EventItem; onOpen: (e: EventItem) => void }) => {
  const d = parseISO(event.date);
  const weekday = format(d, "EEEE", { locale: he });
  const isSaveTheDate = event.eventType === "save_the_date";
  const isPoster = isSaveTheDate && !!event.image;

  // Default early-price deadline: midnight (00:00) of the day before the event
  const defaultDeadline = new Date(d);
  defaultDeadline.setDate(defaultDeadline.getDate() - 1);
  defaultDeadline.setHours(0, 0, 0, 0);
  const deadline = event.earlyPriceDeadline ? parseISO(event.earlyPriceDeadline) : defaultDeadline;
  const earlyStillValid = event.earlyPrice != null && deadline >= new Date();

  if (isPoster) {
    const dateLabel = event.endDate && event.endDate !== event.date
      ? `${format(d, "d בMMMM", { locale: he })} – ${format(parseISO(event.endDate), "d בMMMM yyyy", { locale: he })}`
      : `${weekday}, ${format(d, "d בMMMM yyyy", { locale: he })}`;
    const ps = event.posterStyle ?? {};
    const objectFit = ps.objectFit ?? "cover";
    const posX = ps.positionX ?? 50;
    const posY = ps.positionY ?? 50;
    const scale = (ps.scale ?? 100) / 100;
    const bgSize = objectFit === "contain"
      ? `${scale * 100}% auto`
      : scale === 1 ? "cover" : `${scale * 100}% auto`;
    const compact = (ps as { compact?: boolean }).compact === true;
    return (
      <article
        id={`event-${event.id}`}
        onClick={(e) => openFromCard(e, () => onOpen(event))}
        className={cn(
          "group relative cursor-pointer rounded-[2rem] overflow-hidden border border-primary/20 shadow-[var(--shadow-card)] flex flex-col",
          compact
            ? "min-h-[560px] md:min-h-[640px]"
            : "md:col-span-2 min-h-[420px] md:min-h-[520px]",
        )}
        dir="rtl"
      >
        {/* Background image covering the whole card */}
        <div
          className="absolute inset-0 w-full h-full bg-white"
          style={{
            backgroundImage: `url(${event.image})`,
            backgroundSize: bgSize,
            backgroundPosition: `${posX}% ${posY}%`,
            backgroundRepeat: "no-repeat",
          }}
          aria-hidden="true"
        />
        {/* Vignette only for wide teaser cards; compact day-cards show image as-is */}
        {!compact && (
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/30 pointer-events-none" aria-hidden="true" />
        )}

        {/* Top ribbon: date */}
        <div className="relative z-10 px-5 pt-5 pb-3 flex items-center justify-end">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur text-xs md:text-sm font-medium text-foreground">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <span>{dateLabel}{event.hebrewDate ? ` · ${event.hebrewDate}` : ""}</span>
          </div>
        </div>

        {/* Spacer pushes caption to bottom */}
        <div className="flex-1" />

        {/* Bottom CTA */}
        {compact ? (
          <div className="relative z-10 p-6">
            {event.registration?.url ? (
              <a
                href={event.registration.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[hsl(var(--primary-glow))] transition-colors"
              >
                <Ticket className="h-4 w-4" />
                נפתח להרשמה
              </a>
            ) : (
              <p className="text-sm text-foreground/80 bg-white/70 backdrop-blur rounded-xl px-4 py-3 text-center">
                שמרו את התאריך ביומן 💌 · פרטים מלאים והרשמה יעלו בקרוב
              </p>
            )}
          </div>
        ) : (
          <div className="relative z-10 px-6 pb-6 flex justify-center">
            {event.registration?.url ? (
              <a
                href={event.registration.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm md:text-base font-medium shadow-lg hover:bg-[hsl(var(--primary-glow))] transition-colors"
              >
                <Ticket className="h-4 w-4" />
                נפתח להרשמה
              </a>
            ) : (
              <p className="text-sm text-foreground/80 bg-white/70 backdrop-blur rounded-full px-4 py-2 inline-block">
                שמרו את התאריך ביומן 💌 · פרטים מלאים והרשמה יעלו בקרוב
              </p>
            )}
          </div>
        )}

      </article>
    );
  }


  return (
    <article id={`event-${event.id}`} onClick={(e) => openFromCard(e, () => onOpen(event))} className="group cursor-pointer bg-card rounded-3xl overflow-hidden border border-border shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] transition-all duration-300 flex flex-col">
      {/* Image / header */}
      <div className="relative h-44 md:h-48 overflow-hidden bg-gradient-to-br from-[hsl(340_50%_95%)] to-[hsl(343_65%_90%)]">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/40">
            <Sparkles className="h-14 w-14" />
          </div>
        )}
        {isSaveTheDate && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold tracking-wide shadow-sm">
            SAVE THE DATE
          </div>
        )}
        {event.partnerLogo && (() => {
          const isMecholelot = event.partnerLogo.url.includes("mecholelot-kehila");
          return (
            <div
              className={
                isMecholelot
                  ? "absolute top-1.5 right-1.5 px-2.5 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-sm flex items-center"
                  : "absolute top-1 right-1 px-1 py-0.5 rounded-lg bg-white/95 backdrop-blur shadow-sm flex items-center"
              }
            >
              <img
                src={event.partnerLogo.url}
                alt={event.partnerLogo.alt}
                className={
                  isMecholelot
                    ? "h-1.5 md:h-2 w-auto object-contain"
                    : "h-12 md:h-14 w-auto object-contain"
                }
                loading="lazy"
              />
            </div>
          );
        })()}
      </div>

      <div className="p-6 flex flex-col flex-1 text-right" dir="rtl">
        <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-snug whitespace-pre-line">
          {event.title}
        </h3>
        {event.description && (
          <p className="mt-3 text-sm text-foreground/70 font-light leading-relaxed line-clamp-2">
            {event.description}
          </p>
        )}
        <span className="mt-2 text-xs font-medium text-primary">לכל הפרטים ←</span>

        <div className="mt-5 space-y-2.5 text-sm text-foreground/75">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
            {event.endDate && event.endDate !== event.date ? (
              <span>
                {format(d, "d בMMMM", { locale: he })} – {format(parseISO(event.endDate), "d בMMMM yyyy", { locale: he })}
                {event.hebrewDate ? ` · ${event.hebrewDate}` : ""}
                {!isSaveTheDate && event.time ? ` | ${event.time}\u00a0` : ""}
              </span>
            ) : (
              <span>
                {weekday}, {format(d, "d בMMMM yyyy", { locale: he })}
                {event.hebrewDate ? ` · ${event.hebrewDate}` : ""}
                {!isSaveTheDate && event.time ? ` | ${event.time}\u00a0` : ""}
              </span>
            )}
          </div>
          {!isSaveTheDate && event.location && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                {event.location}
                {event.city ? ` · ${event.city}` : ""}
              </span>
            </div>
          )}
          {!isSaveTheDate && event.menu && (
            <div className="flex items-start gap-2">
              <Utensils className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{event.menu}</span>
            </div>
          )}
        </div>

        {isSaveTheDate ? (
          <div className="mt-6 rounded-xl border border-dashed border-primary/30 bg-accent/40 p-4 text-center text-sm text-foreground/70">
            פרטים והרשמה בקרוב — שמרו את התאריך ביומן 💌
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2 items-stretch">
              {event.earlyPrice != null ? (
                <div
                  className={cn(
                    "rounded-xl p-3 text-center border h-full min-h-[88px] flex flex-col justify-center items-center",
                    earlyStillValid
                      ? "border-primary/30 bg-accent"
                      : "border-border bg-muted/40 opacity-60",
                  )}
                >
                  <div className="text-[11px] font-medium text-foreground/60">רישום מוקדם</div>
                  <div className="mt-0.5 text-lg font-semibold text-primary">₪{event.earlyPrice}</div>
                  <div className="mt-1 text-[10px] text-foreground/50 leading-tight line-clamp-1">
                    עד חצות, {format(deadline, "EEEE d בMMMM", { locale: he })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-3 text-center border border-dashed border-border/60 bg-muted/10 h-full min-h-[88px] flex flex-col justify-center items-center text-foreground/40">
                  <div className="text-[11px] font-medium">רישום מוקדם</div>
                  <div className="mt-0.5 text-sm">—</div>
                </div>
              )}
              {event.regularPrice != null ? (
                <div className="rounded-xl p-3 text-center border border-border bg-muted/30 h-full min-h-[88px] flex flex-col justify-center items-center">
                  <div className="text-[11px] font-medium text-foreground/60">רישום רגיל</div>
                  <div className="mt-0.5 text-lg font-semibold text-foreground">₪{event.regularPrice}</div>
                </div>
              ) : (
                <div className="rounded-xl p-3 text-center border border-dashed border-border/60 bg-muted/10 h-full min-h-[88px] flex flex-col justify-center items-center text-foreground/40">
                  <div className="text-[11px] font-medium">רישום רגיל</div>
                  <div className="mt-0.5 text-sm">—</div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4">
              <RegistrationButton event={event} />
            </div>
          </>
        )}
      </div>
    </article>
  );
};



const Events = () => {
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const [openEvent, setOpenEvent] = useState<EventItem | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);
  const events = useEvents(true);
  const now = useMemo(() => new Date(), []);

  const eventEnd = (e: EventItem) => {
    const d = new Date(e.endDate ?? e.date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const eventDates = useMemo(() => events.map((e) => parseISO(e.date)), [events]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  const futureEvents = useMemo(
    () => sortedEvents.filter((e) => eventEnd(e) >= now),
    [sortedEvents, now],
  );

  const pastEvents = useMemo(
    () => sortedEvents.filter((e) => eventEnd(e) < now).sort((a, b) => b.date.localeCompare(a.date)),
    [sortedEvents, now],
  );

  const oneMonthAgo = useMemo(() => subMonths(now, 1), [now]);
  const recentPastEvents = useMemo(
    () => pastEvents.filter((e) => eventEnd(e) >= oneMonthAgo),
    [pastEvents, oneMonthAgo],
  );
  const olderPastEvents = useMemo(
    () => pastEvents.filter((e) => eventEnd(e) < oneMonthAgo),
    [pastEvents, oneMonthAgo],
  );

  /* arriving from global search: /events#event-<id> */
  useEffect(() => {
    if (!events.length) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#event-")) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selected) return null;
    return sortedEvents.filter((e) => isSameDay(parseISO(e.date), selected));
  }, [sortedEvents, selected]);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0" dir="rtl">
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

      <div className="h-12 md:h-0" />

      {/* Hero */}
      <section className="pt-24 md:pt-32 pb-6 md:pb-8 px-6 md:px-10 bg-gradient-to-b from-accent/50 to-background">
        <div className="max-w-6xl mx-auto text-right">
          <h1 className="text-2xl md:text-4xl font-light text-foreground leading-tight">
            הזדמנויות להיפגש,{" "}
            <span className="font-semibold text-primary">להתחבר</span> ולנשום ביחד
          </h1>
          <p className="mt-2 text-sm md:text-base text-foreground/70 font-light">
            מעכשיו, כל האירועים במקום אחד.
          </p>
        </div>
      </section>



      <div className="max-w-6xl mx-auto px-6 md:px-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-10">
          {/* Events list */}
          <div>
            {selected && (
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">
                  אירועים ב-{format(selected, "d בMMMM", { locale: he })}
                </h2>
                <button
                  onClick={() => setSelected(undefined)}
                  className="text-xs text-primary hover:underline"
                >
                  הצגת כל האירועים
                </button>
              </div>
            )}


            {selected ? (
              selectedDateEvents && selectedDateEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedDateEvents.map((event) => (
                    <EventCard key={event.id} event={event} onOpen={setOpenEvent} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-border p-10 text-center bg-muted/30">
                  <CalendarIcon className="h-10 w-10 text-primary/40 mx-auto" />
                  <p className="mt-3 text-foreground/70 font-light">
                    אין אירועים בתאריך שנבחר.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-12">
                {/* Future events */}
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-6">
                    אירועים קרובים
                  </h2>
                  {futureEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {futureEvents.map((event) => (
                        <EventCard key={event.id} event={event} onOpen={setOpenEvent} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-border p-10 text-center bg-muted/30">
                      <CalendarIcon className="h-10 w-10 text-primary/40 mx-auto" />
                      <p className="mt-3 text-foreground/70 font-light">
                        אין אירועים קרובים. בקרוב נעדכן באירועים חדשים.
                      </p>
                    </div>
                  )}
                </div>

                {/* Past events */}
                {pastEvents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-sm text-muted-foreground">אירועים קודמים</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {recentPastEvents.map((event) => (
                        <EventCard key={event.id} event={event} onOpen={setOpenEvent} />
                      ))}
                      {showAllPast && olderPastEvents.map((event) => (
                        <EventCard key={event.id} event={event} onOpen={setOpenEvent} />
                      ))}
                    </div>
                    {olderPastEvents.length > 0 && !showAllPast && (
                      <div className="mt-8 text-center">
                        <Button
                          variant="outline"
                          onClick={() => setShowAllPast(true)}
                        >
                          לראות את כל האירועים
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calendar sidebar */}
          <aside className="lg:sticky lg:top-28 self-start">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 mb-3 text-foreground">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">לוח שנה</h3>
              </div>
              <Calendar
                mode="single"
                locale={he}
                dir="rtl"
                month={month}
                onMonthChange={setMonth}
                selected={selected}
                onSelect={setSelected}
                modifiers={{ hasEvent: eventDates }}
                modifiersClassNames={{
                  hasEvent:
                    "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
                }}
                className={cn("p-0 pointer-events-auto")}
              />
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-foreground/60">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                יום עם אירוע
              </div>
            </div>


            <div className="mt-5 rounded-3xl bg-gradient-to-br from-primary/10 to-accent p-5 text-right">
              <h4 className="text-sm font-semibold text-foreground">רוצה שנעדכן אותך?</h4>
              <p className="mt-2 text-xs text-foreground/70 font-light leading-relaxed">
                הצטרפי לרשימת התפוצה ותקבלי הזמנות לאירועים הקרובים.
              </p>
              <Link
                to="/#about"
                className="mt-4 inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
              >
                לפרטים נוספים <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <DonationCTA
        id="donate"
        title="אנחנו עושות המון עם מעט. אבל מעט לא צריך להיות המודל."
        paragraphs={[
          "כמעט 100 אירועים בשנה נוצרים באחותי כלה, רובם עם תקציב זעום והרבה מאוד יצירתיות, התנדבות ואנשים טובים בדרך.",
          "לא כי לא צריך כסף כדי לעשות את כל זה, אלא כי עד היום בחרנו לא לחכות שיהיה.",
          "עכשיו אנחנו רוצות לעשות יותר. להגיע לעוד נשים, ליצור עוד מענים, ולאפשר לעשייה הזו לגדול בלי שכל דבר יהיה מאבק.",
          "**התרומה שלכם נותנת לנו כוח לעשות את זה.**",
        ]}
        buttonLabel="אני רוצה להיות חלק"
      />

      <EventDetailsDialog event={openEvent} onClose={() => setOpenEvent(null)} />
      <MobileBottomNav />
    </div>
  );
};

export default Events;
