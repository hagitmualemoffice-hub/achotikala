/**
 * "שלי" — the personal destination inside ליבה.
 *
 * Not a dashboard: the point is "מה מחכה לי, מי פנתה אליי, ומה קרה בדברים
 * שחשובים לי". Compact header, a refined activity feed, a real inbox.
 *
 * Four sections: התראות · הודעות · הפעילות שלי · שמורים.
 * Everything is read from existing ליבה data — no duplicated stores.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Bookmark,
  PenLine,
  MessageSquareQuote,
  BookmarkCheck,
  Loader2,
  MessageCircle,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LibaHeaderActions from "@/community/v1/LibaHeaderActions";
import LibaTopBar from "@/community/v1/LibaTopBar";
import EmptyState from "@/components/EmptyState";
import { MemberAvatar } from "@/community/v1/Avatar";
import { MemberProfileHost } from "@/community/v1/MemberProfile";
import ReactionIcon from "@/community/v1/ReactionIcons";
import { relTime } from "@/community/v1/api";
import { spaceById } from "@/community/v1/spaces";
import { fetchBaarSaved, STATUS_OPTIONS, type BaarSavedBoy } from "@/community/v1/baar";
import { MessagesInbox, useLibaChat } from "@/community/v1/LibaMessages";
import { fetchThreads } from "@/community/v1/messages";
import { bootstrap, fetchFeed, type ApiPost, type Bootstrap } from "@/community/v1/api";
import { fetchSavedListings, type SavedListing } from "@/apartments/saved";
import { fetchSavedPlaces } from "@/community/v1/places";
import { fmtDate, fmtPrice, typeMeta } from "@/apartments/types";
import {
  ACTIVITY_LABEL,
  fetchMyActivity,
  markActivitySeen,
  type ActivityItem,
  type MyActivity,
} from "@/community/v1/activity";

const SECTIONS = [
  { key: "messages", label: "הודעות" },
  { key: "alerts", label: "התראות" },
  { key: "activity", label: "הפעילות שלי" },
  { key: "saved", label: "שמורים" },
] as const;

type Section = (typeof SECTIONS)[number]["key"];

/** kinds that ask something of her, versus kinds that are simply nice to see */
const ACTIONABLE: ActivityItem["kind"][] = [
  "comment",
  "reply",
  "baar_message",
  "inquiry_offer",
  "inquiry_message",
  "message",
];

const CTA: Partial<Record<ActivityItem["kind"], string>> = {
  comment: "לקרוא ולהשיב",
  reply: "לקרוא ולהשיב",
  baar_message: "לפנייה",
  inquiry_offer: "לראות מי יכולה לעזור",
  inquiry_message: "להמשיך בשיחה",
  message: "לפתוח את השיחה",
};

/** first name only — "כתבי לרות" reads warmer than the full name */
const firstName = (name?: string | null) => (name || "").trim().split(/\s+/)[0] || "";

const Shell = ({
  children,
  me,
  isAdmin,
}: {
  children: React.ReactNode;
  me?: { displayName: string; avatarUrl?: string | null };
  isAdmin?: boolean;
}) => (
  <div dir="rtl" className="min-h-screen bg-background pb-20 md:pb-0 lg:pl-[250px]">
    {/* the same ליבה bar as everywhere else */}
    <LibaTopBar
      active="sheli"
      actions={
        <LibaHeaderActions
          me={me ?? { displayName: "חברה", avatarUrl: null }}
          isAdmin={isAdmin}
          onSignOut={() => supabase.auth.signOut()}
        />
      }
    />
    <main className="mx-auto w-full max-w-[1440px] px-3 py-3 md:px-5 md:py-4">{children}</main>
  </div>
);

const ItemIcon = ({ item }: { item: ActivityItem }) => {
  if (item.kind === "reaction_post" || item.kind === "reaction_comment")
    return <ReactionIcon kind={item.extra || "heart"} className="h-3.5 w-3.5" />;
  if (item.kind === "helpful") return <Sparkles className="h-3.5 w-3.5 text-primary" />;
  if (item.kind === "baar_message") return <Users className="h-3.5 w-3.5 text-primary" />;
  if (item.kind === "inquiry_offer" || item.kind === "inquiry_message" || item.kind === "message")
    return <MessageCircle className="h-3.5 w-3.5 text-primary" />;
  return <MessageSquare className="h-3.5 w-3.5 text-primary" />;
};

const PersonalArea = () => {
  const navigate = useNavigate();
  const { openChat } = useLibaChat();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<MyActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [section, setSection] = useState<Section>(
    (SECTIONS.find((s) => s.key === params.get("tab"))?.key as Section) || "alerts",
  );
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [savedBoys, setSavedBoys] = useState<BaarSavedBoy[]>([]);
  const [savedPosts, setSavedPosts] = useState<ApiPost[]>([]);
  const [savedListings, setSavedListings] = useState<SavedListing[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<
    { id: string; name: string; kind: string | null; area: string | null; address: string | null; saved_at: string }[]
  >([]);
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [msgUnread, setMsgUnread] = useState(0);
  const threadParam = params.get("thread");

  useEffect(() => {
    let cancelled = false;
    fetchMyActivity(80)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
        if (res.authorized) markActivitySeen().catch(() => undefined);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    fetchBaarSaved()
      .then((res) => {
        if (!cancelled && res?.authorized) setSavedBoys(res.items || []);
      })
      .catch(() => undefined);
    bootstrap()
      .then((b) => {
        if (!cancelled) setBoot(b);
      })
      .catch(() => undefined);
    fetchFeed({ saved: true, limit: 40 })
      .then((res) => {
        if (!cancelled) setSavedPosts(res ?? []);
      })
      .catch(() => undefined);
    fetchSavedListings()
      .then((res) => {
        if (!cancelled) setSavedListings(res);
      })
      .catch(() => undefined);
    fetchSavedPlaces()
      .then((res) => {
        if (!cancelled && res?.authorized) setSavedPlaces(res.items || []);
      })
      .catch(() => undefined);
    fetchThreads(60)
      .then((res) => {
        if (!cancelled) setMsgUnread(res.unread);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const go = (next: Section) => {
    setSection(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    if (next !== "messages") p.delete("thread");
    setParams(p, { replace: true });
  };

  const me = {
    displayName: boot?.profile?.display_name ?? "חברה",
    avatarUrl: boot?.profile?.avatar_url ?? null,
  };
  const isAdmin = !!boot?.is_admin;
  const savedTotal = savedBoys.length + savedPosts.length + savedListings.length + savedPlaces.length;

  const items = useMemo(() => {
    if (!data?.authorized) return [];
    return onlyWaiting ? data.items.filter((i) => ACTIONABLE.includes(i.kind)) : data.items;
  }, [data, onlyWaiting]);

  if (loading)
    return (
      <Shell me={me} isAdmin={isAdmin}>
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </Shell>
    );

  if (error || !data?.authorized)
    return (
      <Shell me={me} isAdmin={isAdmin}>
        <div className="mx-auto max-w-lg rounded-[28px] border border-border/60 bg-card p-8 text-center">
          <Bell className="mx-auto mb-3 h-6 w-6 text-primary" />
          <h1 className="text-lg font-light text-foreground">שלי מיועד לחברות ליבה</h1>
          <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
            אפשר להיכנס לליבה, ומשם הכל מחכה לך כאן.
          </p>
          <Link
            to="/liba"
            className="mt-5 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-light text-primary-foreground"
          >
            למרחב שלנו
          </Link>
        </div>
      </Shell>
    );

  /** a private conversation always opens inside "שלי → הודעות", with its history */
  const openThreadInInbox = (threadId: string) => {
    setSection("messages");
    const p = new URLSearchParams(params);
    p.set("tab", "messages");
    p.set("thread", threadId);
    setParams(p, { replace: true });
  };

  const openItem = (item: ActivityItem) => {
    if (item.kind === "message") return item.extra ? openThreadInInbox(item.extra) : go("messages");
    if (item.kind === "baar_message") return navigate("/liba/baar?pniot=1");
    if (item.kind === "inquiry_offer" || item.kind === "inquiry_message") return navigate("/liba?birurim=1");
    if (item.post_id) navigate(`/liba?post=${item.post_id}`);
  };

  /**
   * "כתבי לרות" — a real private conversation, opened (or reused) with the
   * context of whatever the notification is about.
   */
  const canWriteTo = (item: ActivityItem) =>
    item.kind !== "message" &&
    item.kind !== "baar_message" &&
    item.kind !== "inquiry_message" &&
    !!item.actor?.user_id &&
    !item.actor.mine &&
    !item.actor.nickname;

  const writeTo = async (item: ActivityItem) => {
    const actor = item.actor;
    if (!actor?.user_id) return;
    if (item.kind === "inquiry_offer")
      return openChat({
        userId: actor.user_id,
        sourceType: "inquiry",
        sourceId: item.extra,
        contextTitle: item.title,
        contextLink: "/liba?birurim=1",
      });
    return openChat({
      userId: actor.user_id,
      sourceType: item.post_id ? "post" : "direct",
      sourceId: item.post_id,
      contextTitle: item.title,
      contextLink: item.post_id ? `/liba?post=${item.post_id}` : null,
    });
  };

  const waitingHelp = data.my_inquiries.reduce((sum, q) => sum + (q.help_count || 0), 0);

  return (
    <Shell me={me} isAdmin={isAdmin}>
      {/* sections — quiet text tabs, not pill controls */}
      <nav className="flex min-h-14 flex-wrap items-end gap-x-8 gap-y-2 border-b border-border/70 bg-card px-2 md:px-5">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => go(s.key)}
            className={`-mb-px inline-flex min-h-14 items-center gap-1.5 border-b-[3px] px-1 text-[14px] transition-colors ${
              section === s.key
                ? "border-[hsl(var(--chat-sage))] font-medium text-[hsl(var(--chat-sage-foreground))]"
                : "border-transparent font-light text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
            {s.key === "messages" && msgUnread > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {msgUnread}
              </span>
            )}
            {s.key === "saved" && savedTotal > 0 && (
              <span className="text-[11px] font-light text-muted-foreground">{savedTotal}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ------------------------------ messages ------------------------------ */}
      {section === "messages" && (
        <div>
          <MessagesInbox initialThreadId={threadParam} />
        </div>
      )}

      {/* ------------- saved: boys · posts · apartments, all in one ------------- */}
      {section === "saved" && (
        <div className="mt-3 space-y-7">
          {savedTotal === 0 && (
            <EmptyState
              icon={Bookmark}
              title="עוד לא שמרת כלום"
              description="כשתראי משהו שתרצי לחזור אליו — בחור בבאר, פוסט בליבה, מקום מליד הבאר או מודעת דירה — חפשי את הסימנייה."
              action={{ label: "לגלות מה חדש", onClick: () => navigate("/liba") }}
            />
          )}

          {savedBoys.length > 0 && (
            <section>
              <p className="text-[14px] font-normal text-foreground">בחורים ששמרתי</p>
              <ul className="mt-1 divide-y divide-border/50">
                {savedBoys.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => navigate(`/liba/baar?boy=${b.id}`)}
                      className="w-full rounded-2xl px-3 py-3.5 text-start transition-colors hover:bg-[hsl(var(--primary)/0.04)]"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[15.5px] font-semibold text-foreground">{b.full_name}</span>
                        <span className="text-[12.5px] font-light text-muted-foreground">
                          {[b.age ? `${b.age}` : null, b.city].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-light text-muted-foreground">
                        {b.orientation && <span>{b.orientation}</span>}
                        {b.ethnicity && <span>{b.ethnicity}</span>}
                        {b.status && (
                          <span>{STATUS_OPTIONS.find((o) => o.value === b.status)?.label || b.status}</span>
                        )}
                        <span className="text-primary">💗 {b.recommendation_count} ממליצות</span>
                        <span>· נשמר {relTime(b.saved_at)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {savedPosts.length > 0 && (
            <section>
              <p className="text-[14px] font-normal text-foreground">פוסטים ששמרתי</p>
              <ul className="mt-1 divide-y divide-border/50">
                {savedPosts.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => navigate(`/liba?post=${p.id}`)}
                      className="w-full rounded-2xl px-3 py-3.5 text-start transition-colors hover:bg-[hsl(var(--primary)/0.04)]"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[15px] font-normal text-foreground">
                          {p.title?.trim() || p.body.slice(0, 60)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-light text-muted-foreground">
                        <span>{spaceById(p.space)?.name}</span>
                        <span>· {p.author?.name}</span>
                        <span>· {relTime(p.created_at)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {savedPlaces.length > 0 && (
            <section>
              <p className="text-[14px] font-normal text-foreground">מקומות ששמרתי</p>
              <ul className="mt-1 divide-y divide-border/50">
                {savedPlaces.map((pl) => (
                  <li key={pl.id}>
                    <button
                      onClick={() => navigate(`/liba/mekomot?place=${pl.id}`)}
                      className="w-full rounded-2xl px-3 py-3.5 text-start transition-colors hover:bg-[hsl(var(--primary)/0.04)]"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[15px] font-normal text-foreground">{pl.name}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-light text-muted-foreground">
                        {pl.kind && <span>{pl.kind}</span>}
                        {pl.area && <span>· {pl.area}</span>}
                        {pl.address && <span>· {pl.address}</span>}
                        <span>· נשמר {relTime(pl.saved_at)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {savedListings.length > 0 && (
            <section>
              <p className="text-[14px] font-normal text-foreground">דירות ששמרתי</p>
              <ul className="mt-1 divide-y divide-border/50">
                {savedListings.map((l) => (
                  <li key={l.id}>
                    <button
                      onClick={() => navigate("/liba/dirot")}
                      className="w-full rounded-2xl px-3 py-3.5 text-start transition-colors hover:bg-[hsl(var(--primary)/0.04)]"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[15px] font-normal text-foreground">
                          {l.title?.trim() || typeMeta(l.listing_type).label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-light text-muted-foreground">
                        <span>{typeMeta(l.listing_type).short}</span>
                        {[l.city, l.area].filter(Boolean).length > 0 && (
                          <span>· {[l.city, l.area].filter(Boolean).join(" · ")}</span>
                        )}
                        {fmtPrice(l.price) && <span>· {fmtPrice(l.price)}</span>}
                        {fmtDate(l.entry_date) && <span>· כניסה {fmtDate(l.entry_date)}</span>}
                        <span>· נשמר {relTime(l.saved_at)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* ------------------------------ activity ------------------------------ */}
      {section === "activity" && (
        <div className="mt-5 grid gap-x-10 gap-y-8 md:grid-cols-2">
          <div>
            <p className="text-[14px] font-normal text-foreground">הפרסומים שלי</p>
            <ul className="mt-2 divide-y divide-border/50">
              {data.my_posts.length === 0 && (
                <li>
                  <EmptyState
                    icon={PenLine}
                    compact
                    title="עוד לא פרסמת כאן"
                    description="כל מה שתכתבי במרחבים של ליבה יופיע כאן, עם התגובות והלבבות שקיבל."
                    action={{ label: "לכתוב פוסט ראשון", onClick: () => navigate("/liba") }}
                  />
                </li>
              )}
              {data.my_posts.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => navigate(`/liba?post=${p.id}`)}
                    className="w-full rounded-2xl px-3 py-2.5 text-start transition-colors hover:bg-[hsl(var(--primary)/0.04)]"
                  >
                    <div className="flex items-center gap-2 text-[11.5px] font-light text-muted-foreground">
                      <span>{spaceById(p.space as never).name}</span>
                      <span>·</span>
                      <span>{relTime(p.created_at)}</span>
                      {p.nickname && <span className="text-primary">· בכינוי</span>}
                    </div>
                    <p className="mt-0.5 text-[14px] font-light text-foreground">{p.title || p.excerpt.slice(0, 70)}</p>
                    <p className="mt-1 text-[11.5px] font-light text-muted-foreground">
                      {p.comment_count} תגובות · {p.reaction_count} לבבות
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[14px] font-normal text-foreground">הבירורים שלי</p>
            <ul className="mt-2 divide-y divide-border/50">
              {data.my_inquiries.length === 0 && (
                <li>
                  <EmptyState
                    icon={MessageSquareQuote}
                    compact
                    title="אין לך בירורים פתוחים"
                    description="לא מצאת את מי שחיפשת? אפשר לפתוח בירור ולתת לקהילה לנסות לעזור."
                    action={{ label: "פתיחת בירור", onClick: () => navigate("/liba?birurim=1") }}
                  />
                </li>
              )}
              {data.my_inquiries.map((q) => (
                <li key={q.id}>
                  <button
                    onClick={() => navigate("/liba?birurim=1")}
                    className="w-full rounded-2xl px-3 py-2.5 text-start transition-colors hover:bg-[hsl(var(--primary)/0.04)]"
                  >
                    <p className="text-[14px] font-light text-foreground">{q.boy_name}</p>
                    <p className="mt-0.5 text-[11.5px] font-light text-muted-foreground">
                      {q.help_count > 0 ? `${q.help_count} נשים יכולות לעזור` : "עדיין אין מי שסימנה שהיא מכירה"} ·{" "}
                      {relTime(q.created_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="text-[14px] font-normal text-foreground">הבאר שלי</p>
            <p className="mt-1 text-[12.5px] font-light text-muted-foreground">
              הבחורים שהוספת, ההמלצות שלך והפניות שקיבלת לגביהן.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 text-[12.5px] font-light">
              <Link to="/liba/baar" className="text-primary hover:opacity-70">
                לבאר
              </Link>
              <Link to="/liba/baar?pniot=1" className="text-primary hover:opacity-70">
                {data.baar_inquiries.length} פניות בבאר
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------- alerts ------------------------------- */}
      {section === "alerts" && (
        <>
          <div className="mt-3 flex items-center gap-4 text-[12.5px] font-light">
            <button
              onClick={() => setOnlyWaiting(false)}
              className={onlyWaiting ? "text-muted-foreground hover:text-foreground" : "text-primary"}
            >
              הכל
            </button>
            <button
              onClick={() => setOnlyWaiting(true)}
              className={onlyWaiting ? "text-primary" : "text-muted-foreground hover:text-foreground"}
            >
              מחכה לתשובה שלך
            </button>
          </div>

          <ul className="mt-1 divide-y divide-border/50">
            {waitingHelp > 0 && (
              <li>
                <button
                  onClick={() => navigate("/liba?birurim=1")}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[hsl(var(--primary)/0.055)] px-3 py-3 text-start transition-colors hover:bg-[hsl(var(--primary)/0.1)]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/0.12)] text-primary">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] font-normal text-foreground">
                    {waitingHelp === 1
                      ? "מישהי סימנה שהיא יכולה לעזור לך בבירור"
                      : `${waitingHelp} נשים סימנו שהן יכולות לעזור לך בבירורים`}
                  </span>
                  <span className="shrink-0 text-[12px] font-light text-primary">לראות</span>
                </button>
              </li>
            )}
            {items.length === 0 && (
              <li>
                <EmptyState
                  icon={Bell}
                  compact
                  title={onlyWaiting ? "אין כרגע משהו שמחכה לתשובה שלך" : "כרגע שקט כאן"}
                  description={
                    onlyWaiting
                      ? "כשמישהי תפנה אלייך או תענה לבירור שלך, זה יופיע כאן."
                      : "כשמישהי תגיב לך, תשלח לב או תפנה אלייך — זה יופיע כאן."
                  }
                  action={
                    onlyWaiting
                      ? { label: "לראות הכל", onClick: () => setOnlyWaiting(false) }
                      : { label: "לגלות מה חדש", onClick: () => navigate("/liba") }
                  }
                />
              </li>
            )}
            {items.map((item) => {
              const actionable = ACTIONABLE.includes(item.kind);
              return (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    onClick={() => openItem(item)}
                    className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-start transition-colors hover:bg-[hsl(var(--primary)/0.04)] ${
                      item.unread ? "bg-[hsl(var(--primary)/0.045)]" : ""
                    }`}
                  >
                    <MemberAvatar
                      name={item.actor?.name ?? "חברה בקהילה"}
                      seed={item.actor?.seed ?? item.id}
                      imageUrl={item.actor?.avatar_url}
                      size="sm"
                      userId={item.actor?.user_id}
                      context={{ sourceType: item.post_id ? "post" : "direct", sourceId: item.post_id, title: item.title, subtitle: item.excerpt }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span
                          className={`text-[13.5px] ${
                            actionable ? "font-medium text-foreground" : "font-normal text-foreground"
                          }`}
                        >
                          {item.actor?.name ?? "חברה בקהילה"}
                        </span>
                        <span
                          className={`text-[13px] font-light ${
                            actionable ? "text-foreground/90" : "text-muted-foreground"
                          }`}
                        >
                          {ACTIVITY_LABEL[item.kind]}
                        </span>
                        <ItemIcon item={item} />
                        <span className="text-[11px] font-light text-muted-foreground">· {relTime(item.created_at)}</span>
                        {item.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </div>
                      {item.title && (
                        <p className="mt-0.5 truncate text-[12px] font-light text-muted-foreground">{item.title}</p>
                      )}
                      {item.excerpt && (
                        <p
                          className={`mt-0.5 whitespace-pre-wrap text-[13px] font-light leading-relaxed ${
                            actionable ? "line-clamp-2 text-foreground/90" : "line-clamp-1 text-muted-foreground"
                          }`}
                        >
                          {item.excerpt}
                        </p>
                      )}
                    </div>
                  </button>
                  {(canWriteTo(item) || (actionable && CTA[item.kind])) && (
                    <div className="-mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 pb-2.5 ps-[52px]">
                      {canWriteTo(item) && (
                        <button
                          onClick={() => void writeTo(item)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] px-3 py-1 text-[12px] font-normal text-primary transition-colors hover:bg-[hsl(var(--primary)/0.16)]"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {firstName(item.actor?.name) ? `כתבי ל${firstName(item.actor?.name)}` : "כתבי לה"}
                        </button>
                      )}
                      {actionable && CTA[item.kind] && (
                        <button
                          onClick={() => openItem(item)}
                          className="text-[12px] font-light text-primary hover:opacity-70"
                        >
                          {CTA[item.kind]}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {/* כרטיס הפרופיל שנפתח בלחיצה על תמונה או שם של חברה */}
      <MemberProfileHost />
    </Shell>
  );
};

export default PersonalArea;
