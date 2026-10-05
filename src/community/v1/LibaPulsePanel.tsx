import { useEffect, useState } from "react";
import { CalendarDays, ArrowLeft, HandHeart, Clock3, Flame, Megaphone, SlidersHorizontal, Building2, MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchInquiries, isInquiryNew, type Inquiry } from "./inquiries";
import { HelpDialog } from "./InquiriesPage";
import { Button } from "@/components/ui/button";
import { fetchSidebarNotices, type CommunityEvent, type SidebarNotice, type TalkingNow } from "./api";
import { spaceById, accentColor, type SpaceId } from "./spaces";
import dailyBaarCardArt from "@/assets/daily-baar-card.webp";

/** the real events live in the site's events system — the panel shows the next few */
const fetchUpcomingEvents = async (): Promise<CommunityEvent[]> => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("events_db")
    .select("id, title, event_date, event_time, location, city")
    .eq("status", "published")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(3);
  if (error || !data) return [];
  return data.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.event_time ? `${e.event_date}T${e.event_time}` : e.event_date,
    place: [e.location, e.city].filter(Boolean).join(", ") || null,
    url: null,
  }));
};

/**
 * "מה קורה עכשיו בליבה" — a live view of three existing systems:
 * since-you-were-here, upcoming events, and open בירורים that still wait for someone who knows him.
 * No data is duplicated here; everything is read from the existing sources.
 */

const eventDate = (value: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
};

const eventTime = (value: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || !/\d{2}:\d{2}/.test(value)) return null;
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
};

const timeAgo = (value: string) => {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "שעה" : `${hours} שעות`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "אתמול" : `${days} ימים`;
};

/** priority: waiting for help → no one said "אני מכירה" yet → newest */
const rank = (i: Inquiry) => {
  if (i.needs_help) return 0;
  if (i.help_count === 0) return 1;
  return 2;
};

const SectionTitle = ({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}) => (
  <div className="mb-2.5">
    <h3 className="flex items-center gap-2 text-[14px] font-medium leading-tight text-foreground">
      {icon}
      {title}
    </h3>
    {sub && <p className="mt-1 text-[11.5px] font-light text-muted-foreground">{sub}</p>}
  </div>
);

const MoreLink = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="mt-3 inline-flex items-center gap-1 text-[12px] font-light text-primary transition-opacity hover:opacity-70"
  >
    {label}
    <ArrowLeft className="h-3 w-3" />
  </button>
);

export default function LibaPulsePanel({
  events: propEvents = [],
  since = [],
  sinceOpen = false,
  talking = [],
  onToggleSince,
  onAllEvents,
  onOpenInquiries,
  onOpenTalking,
  onOpenSince,
  onOpenDaily,
  onOpenDailySettings,
  actionableMode = false,
  newPostsCount = 0,
  onOpenPosts,
  onOpenApartments,
}: {
  events?: CommunityEvent[];
  since?: { key: string; text: string }[];
  sinceOpen?: boolean;
  talking?: TalkingNow[];
  onToggleSince?: () => void;
  onAllEvents: () => void;
  onOpenInquiries: (name?: string) => void;
  onOpenTalking?: (space: SpaceId, title: string) => void;
  onOpenSince?: (key: string) => void;
  onOpenDaily?: () => void;
  onOpenDailySettings?: () => void;
  actionableMode?: boolean;
  newPostsCount?: number;
  onOpenPosts?: () => void;
  onOpenApartments?: () => void;
}) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [helpInquiry, setHelpInquiry] = useState<Inquiry | null>(null);
  const [dbEvents, setDbEvents] = useState<CommunityEvent[]>([]);
  const events = dbEvents.length > 0 ? dbEvents : propEvents;
  const [notices, setNotices] = useState<SidebarNotice[]>([]);
  const [newApartmentCount, setNewApartmentCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSidebarNotices()
      .then((rows) => { if (!cancelled) setNotices(rows ?? []); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!actionableMode) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("apartment_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", since)
      .then(({ count, error }) => setNewApartmentCount(error ? null : (count ?? 0)));
  }, [actionableMode]);

  const waitingInquiryCount = inquiries.filter((item) => item.needs_help || item.help_count === 0).length;

  useEffect(() => {
    let cancelled = false;
    fetchUpcomingEvents()
      .then((rows) => { if (!cancelled) setDbEvents(rows); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchInquiries({ helpStatus: "all", limit: 30 })
      .then((rows) => {
        if (cancelled) return;
        const open = rows.filter((i) => i.status === "open");
        open.sort(
          (a, b) =>
            rank(a) - rank(b) ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setInquiries(actionableMode ? open : open.slice(0, 5));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [actionableMode]);

  return (
    <div id="quick-look" className="mt-8 scroll-mt-24 divide-y divide-border/40 lg:mt-0">
      <h2 className="pb-1 text-[17px] font-medium text-foreground lg:hidden">מבט זריז</h2>
      {/* ---------------------------- ההשתדלות היומית ---------------------------- */}
      {(onOpenDaily || onOpenDailySettings) && (
        <section className="py-5">
          <div className="space-y-2">
            {onOpenDaily && (
              <Button variant="outline"
                onClick={onOpenDaily}
                className="group relative flex h-auto min-h-[112px] w-full items-center justify-between overflow-hidden rounded-xl border-primary/20 bg-primary/[0.04] px-4 py-3 text-right shadow-[0_8px_24px_-18px_hsl(var(--primary)/0.55)] hover:bg-primary/[0.08]"
              >
                <span className="relative z-10 min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-foreground">ההשתדלות היומית</span>
                  <span className="mt-1 block text-[11.5px] font-light text-muted-foreground">כרטיס אחד שמחכה לך היום</span>
                </span>
                <img
                  src={dailyBaarCardArt}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  width={512}
                  height={384}
                  className="-ms-2 h-24 w-28 shrink-0 object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </Button>
            )}
            {onOpenDailySettings && (
              <Button variant="outline"
                onClick={onOpenDailySettings}
                className="flex h-auto w-full justify-start gap-2.5 rounded-lg border-border/60 p-3 text-right hover:bg-muted/60"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-[13px] font-light text-foreground">ניהול ההעדפות שלי</span>
              </Button>
            )}
          </div>
        </section>
      )}
      {/* ---------------------------- הודעות מערכת ---------------------------- */}
      {notices.length > 0 && (
        <section className="py-5">
          <SectionTitle
            icon={<Megaphone className="h-4 w-4 text-primary" />}
            title="הודעות מערכת"
          />
          <ul className="space-y-3">
            {notices.map((n) => (
              <li
                key={n.id}
                onClick={() => onOpenTalking?.("system", n.title)}
                className="group cursor-pointer rounded-xl border border-primary/20 bg-primary/[0.04] p-3"
              >
                <p className="text-[13.5px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                  {n.title}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-line text-[12px] font-light leading-relaxed text-muted-foreground">
                  {n.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------------------- אירועים קרובים ---------------------------- */}
      {events.length > 0 && (
        <section className="py-5">
          <SectionTitle
            icon={<CalendarDays className="h-4 w-4 text-primary" />}
            title="אירועים קרובים"
          />
          <ul className="space-y-3 pb-1">
            {events.slice(0, 2).map((e) => {
              const date = eventDate(e.date);
              const time = eventTime(e.date);
              return (
                <li
                  key={e.id}
                  onClick={() => (e.url ? window.open(e.url, "_blank", "noopener,noreferrer") : onAllEvents())}
                  className="group cursor-pointer rounded-xl border border-border/50 bg-card/60 p-3 transition-colors hover:bg-card lg:border-0 lg:bg-transparent lg:p-0"
                >
                  <div className="flex items-center gap-2">
                    {date && (
                      <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                        {date}
                      </span>
                    )}
                    {time && (
                      <span className="text-[11px] font-light text-muted-foreground">{time}</span>
                    )}
                  </div>
                  <span className="mt-1.5 block text-[13.5px] font-light leading-snug text-foreground transition-colors group-hover:text-primary">
                    {e.title}
                  </span>
                  {e.place && (
                    <span className="mt-0.5 block text-[11.5px] font-light text-muted-foreground">
                      {e.place}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <MoreLink label="לכל האירועים" onClick={onAllEvents} />
        </section>
      )}

      {/* ---------------------------- קורה עכשיו ---------------------------- */}
      {actionableMode && (waitingInquiryCount > 0 || newPostsCount > 0 || (newApartmentCount ?? 0) > 0) && (
        <section className="py-5">
          <SectionTitle icon={null} title="🔥 קורה עכשיו" />
          <ul className="space-y-1">
            {waitingInquiryCount > 0 && (
              <li>
                <button onClick={() => onOpenInquiries()} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-right text-[13px] font-light text-foreground transition-colors hover:bg-muted hover:text-primary">
                  <HandHeart className="h-4 w-4 shrink-0 text-primary" />
                  {waitingInquiryCount} בירורים מחכים לעזרה
                </button>
              </li>
            )}
            {newPostsCount > 0 && onOpenPosts && (
              <li>
                <button onClick={onOpenPosts} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-right text-[13px] font-light text-foreground transition-colors hover:bg-muted hover:text-primary">
                  <MessagesSquare className="h-4 w-4 shrink-0 text-primary" />
                  {newPostsCount} פוסטים חדשים שמחכים שתקראי אותם
                </button>
              </li>
            )}
            {(newApartmentCount ?? 0) > 0 && onOpenApartments && (
              <li>
                <button onClick={onOpenApartments} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-right text-[13px] font-light text-foreground transition-colors hover:bg-muted hover:text-primary">
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  {newApartmentCount} מודעות חדשות בלוח הדירות
                </button>
              </li>
            )}
          </ul>
        </section>
      )}
      {!actionableMode && talking.length > 0 && (
        <section className="py-5">
          <SectionTitle
            icon={<Flame className="h-4 w-4 text-primary" />}
            title="מדברות עכשיו"
          />
          <ul className="space-y-2.5">
            {talking.slice(0, 3).map((t) => {
              const s = spaceById(t.space);
              return (
                <li
                  key={t.id}
                  onClick={() => onOpenTalking?.(t.space, t.title)}
                  className="group cursor-pointer"
                >
                  <p className="text-[13px] font-light leading-snug text-foreground transition-colors group-hover:text-primary">
                    {t.title}
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-light text-muted-foreground">
                    <span style={{ color: accentColor(s) }}>{s.shortName}</span>
                    <span className="mx-1.5 opacity-50">·</span>
                    {t.recent} תגובות היום
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---------------------------- אולי את מכירה? ---------------------------- */}
      {inquiries.length > 0 && (
        <section className="py-5">
          <SectionTitle
            icon={<HandHeart className="h-4 w-4 text-primary" />}
            title="אולי את מכירה?"
            sub="בקשות פתוחות לבירורים"
          />
          <ul className="grid grid-cols-2 gap-2 pb-2 lg:grid-cols-1 lg:gap-3">
            {inquiries.slice(0, 2).map((i) => {
              const infoKey = i.info_types[0];
              const infoText =
                infoKey === "quality_info"
                  ? "מידע איכותי"
                  : infoKey === "photo"
                    ? "תמונה"
                    : infoKey === "all_info"
                      ? "כל פרט יעזור"
                      : null;
              return (
                <li
                  key={i.id}
                  className="flex min-w-0 flex-col justify-between rounded-xl border border-border/60 bg-card p-3 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] lg:rounded-2xl lg:p-4"
                >
                  <div>
                    <button
                      onClick={() => onOpenInquiries(i.boy_name)}
                      className="block text-right text-[14.5px] font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {i.boy_name}
                    </button>
                    <p className="mt-0.5 text-[12px] font-light text-muted-foreground">
                      {[i.age ? `בן ${i.age}` : null, i.city ? `מ${i.city}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {i.mine ? (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
                          הבירור שלך
                        </span>
                      ) : (
                        infoText && (
                          <span className="rounded-full bg-[hsl(var(--chip-quality-bg))] px-2.5 py-1 text-[11px] text-[hsl(var(--chip-quality))]">
                            {infoText}
                          </span>
                        )
                      )}
                      {isInquiryNew(i.created_at) && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary">חדש</span>
                      )}
                    </div>
                  </div>

                    <div className="mt-3">
                    {!i.mine && (
                      <Button
                        variant={i.my_offer ? "default" : "outline"}
                        onClick={() => setHelpInquiry(i)}
                        className={`flex h-auto w-full items-center justify-center gap-1 rounded-full px-2 py-2 text-[11.5px] font-light transition-all lg:px-4 lg:text-[12.5px] ${i.my_offer ? "" : "border-primary bg-card text-primary hover:bg-primary/5 hover:text-primary"}`}
                      >
                        <HandHeart className="h-3.5 w-3.5" />
                        {i.my_offer ? "עדכון העזרה" : "אני מכירה"}
                      </Button>
                    )}
                    <p className="mt-2.5 flex flex-col gap-1 text-[10px] font-light text-muted-foreground/80 lg:flex-row lg:items-center lg:justify-between lg:text-[10.5px]">
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3 text-primary/70" />
                        {timeAgo(i.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HandHeart className="h-3 w-3 text-primary/70" />
                        {i.help_count === 0 ? "אף אחת עוד לא סימנה" : `${i.help_count} מכירות`}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <MoreLink label="לכל הבקשות הפתוחות" onClick={() => onOpenInquiries()} />
          <HelpDialog
            inquiry={helpInquiry}
            open={!!helpInquiry}
            onOpenChange={(v) => {
              if (!v) setHelpInquiry(null);
            }}
            onChanged={(q) =>
              setInquiries((cur) => cur.map((x) => (x.id === q.id ? q : x)))
            }
          />
        </section>
      )}
    </div>
  );
}
