/**
 * The ליבה bell — it follows a woman everywhere and opens a quiet panel with
 * what is new: private messages first, then responses, hearts and inquiries.
 * Every line keeps its context and links straight to the thing itself.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, MessageSquare, Sparkles, Users } from "lucide-react";
import { MemberAvatar } from "./Avatar";
import { relTime } from "./api";
import { ACTIVITY_LABEL, fetchMyActivity, markActivitySeen, type ActivityItem, type MyActivity } from "./activity";
import { fetchThreads, threadContextLine, type ThreadSummary } from "./messages";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { useIsMobile } from "@/hooks/use-mobile";

const POLL_MS = 90_000;

const KindIcon = ({ kind }: { kind: ActivityItem["kind"] }) => {
  if (kind === "reaction_post" || kind === "reaction_comment") return <Heart className="h-3.5 w-3.5 text-primary" />;
  if (kind === "helpful") return <Sparkles className="h-3.5 w-3.5 text-primary" />;
  if (kind === "baar_message") return <Users className="h-3.5 w-3.5 text-primary" />;
  if (kind === "inquiry_offer" || kind === "inquiry_message") return <MessageCircle className="h-3.5 w-3.5 text-primary" />;
  return <MessageSquare className="h-3.5 w-3.5 text-primary" />;
};

const ActivityBell = ({
  enabled = true,
  className = "",
  /** when the header shows a separate messages button, unread threads are counted there */
  countThreads = true,
}: {
  enabled?: boolean;
  className?: string;
  countThreads?: boolean;
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  const load = useCallback(async () => {
    const [activity, inbox] = await Promise.all([
      fetchMyActivity(20).catch(() => null),
      fetchThreads(20).catch(() => null),
    ]);
    const all = (activity as MyActivity | null)?.authorized ? (activity as never as { items: ActivityItem[] }).items : [];
    /* private messages are counted on the messages button — never twice */
    const acts = all.filter((i) => i.kind !== "message" && i.kind !== "space_post");
    setItems(acts);
    setThreads(countThreads ? inbox?.items ?? [] : []);
    setUnread(
      acts.filter((i) => i.unread).length + (countThreads ? inbox?.unread ?? 0 : 0),
    );
  }, [countThreads]);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, load]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, isMobile]);

  if (!enabled) return null;

  const goto = (item: ActivityItem) => {
    setOpen(false);
    if (item.kind === "baar_message") navigate("/liba/baar?pniot=1");
    else if (item.kind === "inquiry_offer" || item.kind === "inquiry_message") navigate("/liba?birurim=1");
    else if (item.post_id) navigate(`/liba?post=${item.post_id}`);
    else navigate("/liba/sheli");
  };

  const unreadThreads = threads.filter((t) => t.unread > 0).slice(0, 3);
  const recent = items.slice(0, 6);

  const notificationList = (
    <div dir="rtl" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-5 pb-3 pt-2 md:hidden">
        <h2 className="text-[17px] font-medium text-foreground">התראות</h2>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-2.5">
        {unreadThreads.length === 0 && recent.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] font-light text-muted-foreground">שקט כרגע. כשמישהי תגיב לך או תפנה אלייך — זה יופיע כאן.</p>
        )}
        {unreadThreads.map((t) => (
          <button key={t.id} onClick={() => { setOpen(false); navigate(`/liba/messages?thread=${t.id}`); }} className="flex w-full items-start gap-2.5 rounded-[16px] px-2.5 py-2 text-start transition-colors hover:bg-primary/[0.05]">
            <MemberAvatar name={t.other?.name ?? "חברה"} seed={t.other?.seed ?? t.id} imageUrl={t.other?.avatar_url ?? null} size="sm" userId={t.other?.profile_id ?? t.other?.user_id} context={{ sourceType: "direct", title: "הודעה בליבה" }} />
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] text-foreground">{t.other?.name ?? "חברה בקהילה"} כתבה לך</p><p className="truncate text-[11.5px] font-light text-muted-foreground">{threadContextLine(t)}</p><p className="mt-0.5 text-[10.5px] font-light text-muted-foreground">{relTime(t.last_message_at)}</p></div>
          </button>
        ))}
        {recent.map((item) => (
          <button key={`${item.kind}-${item.id}`} onClick={() => goto(item)} className={`flex w-full items-start gap-2.5 rounded-[16px] px-2.5 py-2 text-start transition-colors hover:bg-primary/[0.05] ${item.unread ? "bg-primary/[0.04]" : ""}`}>
            <span className="mt-1"><KindIcon kind={item.kind} /></span>
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-light text-foreground"><span className="font-normal">{item.actor?.name ?? "חברה בקהילה"}</span> {ACTIVITY_LABEL[item.kind]}</p>{(item.title || item.excerpt) && <p className="truncate text-[11.5px] font-light text-muted-foreground">{item.title || item.excerpt}</p>}<p className="mt-0.5 text-[10.5px] font-light text-muted-foreground">{relTime(item.created_at)}</p></div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            /* opening the panel is reading it */
            setUnread(0);
            void (async () => {
              await markActivitySeen().catch(() => undefined);
              await load();
              setUnread(0);
            })();
          }
        }}
        aria-label="ההתראות שלי"
        title="ההתראות שלי"
        className={`relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 end-0 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && !isMobile && (
        <div className="absolute end-0 z-50 mt-2 w-[330px] overflow-hidden rounded-[22px] border border-border/60 bg-card shadow-[var(--shadow-card)]">{notificationList}</div>
      )}
      {isMobile && (
        <ResponsiveDialog open={open} onOpenChange={setOpen} mobileContentClassName="max-h-[78vh]">{notificationList}</ResponsiveDialog>
      )}
    </div>
  );
};

export default ActivityBell;
