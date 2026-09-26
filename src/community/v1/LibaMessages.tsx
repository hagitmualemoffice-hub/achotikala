/**
 * ליבה messaging UI — one conversation surface, three places to meet it:
 *
 *  • ThreadPane      the conversation itself (bubbles, per-message reference, composer)
 *  • MessagesInbox   two-column desktop inbox used inside "שלי"
 *  • LibaChatProvider / useLibaChat  a single floating conversation on desktop,
 *                    so she can read a boy's profile in הבאר while talking to
 *                    the woman who recommended him.
 *
 * A conversation never carries one global title: each message can carry its own
 * "בקשר ל…" reference, the way a forwarded message looks in WhatsApp.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, CornerUpLeft, Loader2, Maximize2, MessageCircle, Search, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import EmojiPicker, { insertAtCursor } from "./EmojiPicker";
import { MemberAvatar } from "./Avatar";
import EmptyState from "@/components/EmptyState";
import AutoGrowingTextarea from "@/components/AutoGrowingTextarea";
import { useCommunitySession } from "@/community/useCommunitySession";
import { relTime } from "./api";
import {
  dayLabel,
  deleteMessage,
  fetchThread,
  fetchThreads,
  markThreadRead,
  msgTime,
  openThread,
  sendMessage,
  
  QUICK_NOTES,
  type MessageRef,
  type OpenThreadArgs,
  type ThreadDetail,
  type ThreadMessage,
  type ThreadSummary,
} from "./messages";

const POLL_MS = 25_000;
const INCOMING_POLL_MS = 15_000;
const SHOWN_MESSAGE_ALERTS_KEY = "achotikala.liba.shown-message-alerts";
const DESKTOP_NOTIFICATIONS_PROMPTED_KEY = "achotikala.liba.desktop-notifications-prompted";
const CHAT_DRAFT_PREFIX = "achotikala.liba.chat-draft.";

const chatDraftKey = (threadId: string) => `${CHAT_DRAFT_PREFIX}${threadId}`;

const loadChatDraft = (threadId: string) => {
  try {
    return window.localStorage.getItem(chatDraftKey(threadId)) ?? "";
  } catch {
    return "";
  }
};

const saveChatDraft = (threadId: string, body: string) => {
  try {
    if (body) window.localStorage.setItem(chatDraftKey(threadId), body);
    else window.localStorage.removeItem(chatDraftKey(threadId));
  } catch {
    // Typing remains available when browser storage is unavailable.
  }
};

const canUseDesktopNotifications = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  window.matchMedia("(min-width: 768px)").matches;

const hasRef = (r?: MessageRef | null) => !!(r && (r.title || r.subtitle));

/** the little quoted card above a message — "בקשר ל…" */
const RefCard = ({
  title,
  subtitle,
  link,
  onClear,
}: {
  title?: string | null;
  subtitle?: string | null;
  link?: string | null;
  onClear?: () => void;
}) => (
  <div className="mb-1.5 flex items-start gap-2 rounded-[14px] border-s-[3px] border-primary/50 bg-[hsl(var(--primary)/0.06)] px-2.5 py-1.5">
    <div className="min-w-0 flex-1">
      <p className="text-[10.5px] font-light text-primary">בקשר ל</p>
      {title && <p className="truncate text-[12.5px] font-normal text-foreground">{title}</p>}
      {subtitle && <p className="truncate text-[11.5px] font-light text-muted-foreground">{subtitle}</p>}
      {link && (
        <Link to={link} className="mt-0.5 inline-block text-[11px] font-light text-primary hover:opacity-70">
          לפתוח
        </Link>
      )}
    </div>
    {onClear && (
      <button onClick={onClear} aria-label="הסרת ההפניה" className="shrink-0 text-muted-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

/* ============================== conversation ============================== */

export const ThreadPane = ({
  threadId,
  variant = "full",
  onOpenFull,
  onChanged,
  pendingRef,
  onBack,
}: {
  threadId: string;
  variant?: "full" | "panel";
  onOpenFull?: () => void;
  onChanged?: () => void;
  onBack?: () => void;
  /** attached to the next message she sends — not to the whole conversation */
  pendingRef?: MessageRef | null;
}) => {
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ThreadMessage | null>(null);
  const [ref, setRef] = useState<MessageRef | null>(pendingRef ?? null);
  const [sending, setSending] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setRef(hasRef(pendingRef) ? pendingRef ?? null : null);
  }, [pendingRef, threadId]);

  const load = useCallback(
    async (scroll = false) => {
      try {
        const res = await fetchThread(threadId);
        setData(res);
        if (res.authorized) {
          await markThreadRead(threadId).catch(() => undefined);
          onChanged?.();
          if (scroll)
            requestAnimationFrame(() => {
              if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
            });
        }
      } catch {
        setData({ authorized: false });
      }
    },
    [threadId, onChanged],
  );

  useEffect(() => {
    setData(null);
    setReplyTo(null);
    setBody(loadChatDraft(threadId));
    void load(true);
    const timer = window.setInterval(() => void load(false), POLL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveChatDraft(threadId, body), 250);
    return () => window.clearTimeout(timer);
  }, [body, threadId]);

  const push = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      await sendMessage(threadId, clean, replyTo?.id ?? null, hasRef(ref) ? ref : null);
      setBody("");
      saveChatDraft(threadId, "");
      setReplyTo(null);
      setRef(null);
      await load(true);
    } catch {
      toast.error("ההודעה לא נשלחה. אפשר לנסות שוב.");
    } finally {
      setSending(false);
    }
  };

  const remove = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      if (replyTo?.id === messageId) setReplyTo(null);
      await load(false);
      onChanged?.();
    } catch {
      toast.error("לא הצלחנו למחוק את ההודעה. אפשר לנסות שוב.");
    }
  };

  if (!data)
    return (
      <div className="grid flex-1 place-items-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );

  if (!data.authorized || !data.thread)
    return (
      <div className="grid flex-1 place-items-center px-6 py-16 text-center text-[13px] font-light text-muted-foreground">
        השיחה הזאת לא זמינה.
      </div>
    );

  const t = data.thread;
  const messages = data.messages ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* who I'm talking with — nothing more */}
      <div className="z-10 flex h-14 shrink-0 items-center gap-2 border-b border-[hsl(var(--chat-sage-soft))] bg-card px-2.5 md:gap-2.5 md:bg-[hsl(var(--chat-surface))] md:px-4">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="חזרה לרשימת השיחות"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-[hsl(var(--chat-sage-soft))] md:hidden"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        <MemberAvatar
          name={t.other?.name ?? "חברה בקהילה"}
          seed={t.other?.seed ?? t.id}
          imageUrl={t.other?.avatar_url ?? null}
          size="sm"
          userId={t.other?.profile_id ?? t.other?.user_id}
          context={{ sourceType: "direct", title: "שיחה בליבה" }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-foreground md:text-[14px]">{t.other?.name ?? "חברה בקהילה"}</p>
          <p className="truncate text-[11px] font-light text-muted-foreground md:text-[10.5px]">שיחה פרטית בליבה</p>
        </div>
        {variant === "panel" && onOpenFull && (
          <button
            onClick={onOpenFull}
            aria-label="לפתוח את השיחה במלואה"
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* messages — the only thing that scrolls */}
      <div
        ref={boxRef}
        className={`chat-wallpaper min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5 py-3 md:space-y-1.5 md:px-4 md:py-3 ${
          variant === "panel" ? "max-h-[300px]" : ""
        }`}
      >
        {messages.length === 0 && (
          <p className="py-10 text-center text-[13px] font-light text-muted-foreground">
            אין כאן עוד הודעות. אפשר לפתוח בשלום חם.
          </p>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
          return (
            <div key={m.id}>
              {newDay && (
                  <div className="flex justify-center py-2.5">
                    <span className="rounded-md border border-border/60 bg-card/90 px-2.5 py-1 text-[10.5px] font-light text-muted-foreground shadow-sm">{dayLabel(m.created_at)}</span>
                  </div>
              )}
              <div className={`group flex ${m.mine ? "justify-start" : "justify-end"}`}>
                <div
                   className={`relative max-w-[86%] rounded-[8px] px-2.5 py-1.5 text-[14px] font-light leading-[1.45] shadow-sm md:max-w-[82%] md:rounded-xl md:px-3 md:py-2 md:text-[13.5px] md:leading-[1.5] ${
                    m.mine
                       ? "bg-[hsl(var(--primary)/0.11)] text-foreground"
                      : "border border-border/60 bg-card text-foreground"
                  }`}
                >
                  {(m.ref_title || m.ref_subtitle) && (
                    <RefCard title={m.ref_title} subtitle={m.ref_subtitle} link={m.ref_link} />
                  )}
                  {m.reply_preview && (
                    <p className="mb-1.5 border-s-2 border-primary/40 ps-2 text-[12px] font-light text-muted-foreground">
                      {m.reply_preview}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <div className="mt-0.5 flex min-h-4 items-center gap-2">
                    <span className="text-[9.5px] font-light text-muted-foreground md:text-[10.5px]">{msgTime(m.created_at)}</span>
                    <button
                      onClick={() => {
                        setReplyTo(m);
                        taRef.current?.focus();
                      }}
                      aria-label="להשיב להודעה"
                      className="ms-auto inline-flex items-center gap-1 text-[10px] font-light text-primary opacity-70 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                    >
                      <CornerUpLeft className="h-3 w-3" />
                      <span className="hidden md:inline">להשיב</span>
                    </button>
                    {m.mine && (
                      <button
                        type="button"
                        onClick={() => void remove(m.id)}
                        aria-label="מחיקת ההודעה"
                        title="מחיקת ההודעה"
                        className="text-muted-foreground opacity-70 transition-opacity hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* composer — always sitting at the bottom, never scrolling away */}
      <div className="z-10 shrink-0 border-t border-[hsl(var(--chat-sage-soft))] bg-[hsl(var(--chat-surface)/0.97)] px-2 py-2 backdrop-blur-sm md:px-4 md:py-2">
        {hasRef(ref) && (
          <div className="mb-2 max-w-md">
            <RefCard title={ref?.title} subtitle={ref?.subtitle} link={ref?.link} onClear={() => setRef(null)} />
          </div>
        )}
        {replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded-2xl bg-[hsl(var(--primary)/0.05)] px-3 py-2">
            <p className="min-w-0 flex-1 truncate text-[12px] font-light text-muted-foreground">
              תשובה ל: {replyTo.body}
            </p>
            <button onClick={() => setReplyTo(null)} aria-label="ביטול תשובה" className="text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* one-tap warmth */}
        <div className="no-scrollbar mb-2 hidden items-center gap-1.5 overflow-x-auto md:flex">
          {QUICK_NOTES.map((q) => (
            <button
              key={q.text}
              onClick={() => void push(`${q.text} ${q.emoji}`)}
              disabled={sending}
              className="shrink-0 rounded-full bg-[hsl(var(--primary)/0.07)] px-2.5 py-1 text-[11px] font-light text-primary transition-colors hover:bg-[hsl(var(--primary)/0.14)] disabled:opacity-50"
            >
              {q.emoji} {q.text}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-1.5 md:gap-2">
          <EmojiPicker size="sm" onPick={(emoji) => insertAtCursor(taRef.current, body, emoji, setBody)} />
          <AutoGrowingTextarea
            ref={taRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(event) => {
              const isDesktop = window.matchMedia("(min-width: 768px)").matches;
              if (isDesktop && event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void push(body);
              }
            }}
            rows={1}
            placeholder="כתבי הודעה..."
            className="max-h-28 min-h-10 flex-1 rounded-[20px] border border-border bg-background px-4 py-2 text-[14px] font-light leading-relaxed outline-none transition-[border-color] focus:border-primary/60 md:min-h-10 md:py-2 md:text-[13.5px]"
          />
          <button
            onClick={() => void push(body)}
            disabled={sending || !body.trim()}
            aria-label="שליחה"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================================= inbox ================================= */

export const MessagesInbox = ({ initialThreadId }: { initialThreadId?: string | null }) => {
  const [items, setItems] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(initialThreadId ?? null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetchThreads(80);
      setItems(res.items);
      setActive((cur) => {
        if (cur) return cur;
        if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches)
          return res.items[0]?.id ?? null;
        return null;
      });
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const showInbox = () => setActive(null);
    window.addEventListener("liba:show-messages-inbox", showInbox);
    return () => window.removeEventListener("liba:show-messages-inbox", showInbox);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim();
    if (!needle) return items;
    return items.filter((t) =>
      [t.other?.name, t.context_title, t.context_subtitle, t.preview]
        .filter(Boolean)
        .some((v) => (v as string).includes(needle)),
    );
  }, [items, q]);

  if (loading)
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );

  if (items.length === 0)
    return (
      <div className="rounded-[28px] border border-border/60 bg-card">
        <EmptyState
          icon={MessageCircle}
          title="עוד אין כאן שיחות"
          description="כשמישהי תכתוב לך, או כשתתחילי שיחה דרך ליבה — מפרופיל בבאר, מבירור או מתגובה — היא תחכה לך כאן."
        />
      </div>
    );

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] top-12 z-20 grid min-h-0 overflow-hidden border-b border-[hsl(var(--chat-sage-soft))] bg-card md:static md:h-[calc(100dvh-9.5rem)] md:min-h-[500px] md:grid-cols-[minmax(300px,34%)_minmax(0,1fr)] md:border-x">
      {/* conversation list */}
      <aside className={`${active ? "hidden md:flex" : "flex"} min-h-0 flex-col border-b border-[hsl(var(--chat-sage-soft))] bg-card md:border-b-0 md:border-l`}>
        <div className="relative mx-3 mb-2 mt-2 shrink-0 md:mb-3 md:mt-3">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש בשיחות"
            className="h-10 w-full rounded-lg border border-transparent bg-[hsl(var(--chat-surface))] pe-8 ps-3.5 text-[13px] font-light outline-none transition-colors focus:border-[hsl(var(--chat-sage))] focus:bg-card"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setActive(t.id)}
                className={`flex w-full items-center gap-3 border-b border-[hsl(var(--chat-sage-soft)/0.55)] px-4 py-3 text-start transition-colors md:items-start md:px-3 ${
                  active === t.id ? "border-r-[3px] border-r-[hsl(var(--chat-sage))] bg-[hsl(var(--primary)/0.09)]" : "hover:bg-[hsl(var(--chat-surface))]"
                }`}
              >
                <MemberAvatar
                  name={t.other?.name ?? "חברה"}
                  seed={t.other?.seed ?? t.id}
                  imageUrl={t.other?.avatar_url ?? null}
                  size="sm"
                  userId={t.other?.profile_id ?? t.other?.user_id}
                  context={{ sourceType: "direct", title: "שיחה בליבה" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`truncate text-[14px] ${
                        t.unread > 0 ? "font-medium text-foreground" : "font-light text-foreground"
                      }`}
                    >
                      {t.other?.name ?? "חברה בקהילה"}
                    </span>
                    <span className="ms-auto shrink-0 text-[10px] font-light text-muted-foreground">{relTime(t.last_message_at)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    {t.preview && <p className="min-w-0 flex-1 truncate text-[12px] font-light text-muted-foreground">{t.preview}</p>}
                    {t.unread > 0 && (
                      <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{t.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-[12.5px] font-light text-muted-foreground">אין שיחה מתאימה</li>
          )}
        </ul>
      </aside>

      {/* active conversation */}
      <section className={`${active ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden bg-card`}>
        {active ? (
          <ThreadPane threadId={active} onChanged={() => void load()} onBack={() => setActive(null)} />
        ) : (
          <div className="grid flex-1 place-items-center text-[13px] font-light text-muted-foreground">
            אפשר לבחור שיחה מהרשימה
          </div>
        )}
      </section>
    </div>
  );
};

/* ============================= floating chat ============================= */

type ChatCtx = {
  /** opens (or reuses) a conversation in the floating panel */
  openChat: (args: OpenThreadArgs) => Promise<void>;
  openExisting: (threadId: string) => void;
};

const LibaChatContext = createContext<ChatCtx | null>(null);

export const useLibaChat = () => {
  const ctx = useContext(LibaChatContext);
  return (
    ctx ?? {
      openChat: async () => undefined,
      openExisting: () => undefined,
    }
  );
};

export const LibaChatProvider = ({ children }: { children: React.ReactNode }) => {
  const communitySession = useCommunitySession();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [pendingRef, setPendingRef] = useState<MessageRef | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [incoming, setIncoming] = useState<ThreadSummary | null>(null);
  const shownAlerts = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (
      communitySession.status !== "approved" ||
      !canUseDesktopNotifications() ||
      Notification.permission !== "default"
    ) return;

    try {
      if (window.localStorage.getItem(DESKTOP_NOTIFICATIONS_PROMPTED_KEY)) return;
      window.localStorage.setItem(DESKTOP_NOTIFICATIONS_PROMPTED_KEY, "1");
    } catch {
      // The invitation can still be shown when browser storage is unavailable.
    }

    toast("לקבל הודעות צ׳אט גם כשהאתר ברקע?", {
      description: "אפשר להפעיל התראות במחשב ולא לפספס הודעה חדשה בליבה.",
      duration: 12_000,
      action: {
        label: "הפעלה",
        onClick: () => {
          void Notification.requestPermission().then((permission) => {
            if (permission === "granted") toast.success("התראות הצ׳אט הופעלו");
          });
        },
      },
      cancel: { label: "לא עכשיו", onClick: () => undefined },
    });
  }, [communitySession.status]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(SHOWN_MESSAGE_ALERTS_KEY) ?? "[]") as unknown;
      if (Array.isArray(stored)) shownAlerts.current = new Set(stored.filter((item): item is string => typeof item === "string"));
    } catch {
      shownAlerts.current = new Set();
    }

    let cancelled = false;
    const checkIncoming = async () => {
      try {
        const result = await fetchThreads(20);
        if (cancelled || !result.authorized) return;
        const unread = result.items.find(
          (item) => item.unread > 0 && item.id !== threadId && !shownAlerts.current.has(`${item.id}:${item.last_message_at}`),
        );
        if (!unread) return;
        const alertKey = `${unread.id}:${unread.last_message_at}`;
        shownAlerts.current.add(alertKey);
        window.sessionStorage.setItem(SHOWN_MESSAGE_ALERTS_KEY, JSON.stringify(Array.from(shownAlerts.current).slice(-40)));
        setIncoming(unread);

        if (canUseDesktopNotifications() && document.visibilityState !== "visible" && Notification.permission === "granted") {
          const notification = new Notification(`הודעה חדשה מאת ${unread.other?.name ?? "חברה בליבה"}`, {
            body: unread.preview ?? "מחכה לך הודעה חדשה בצ׳אט",
            tag: `liba-chat-${unread.id}`,
            lang: "he",
          });
          notification.onclick = () => {
            window.focus();
            setPendingRef(null);
            setThreadId(unread.id);
            setMinimized(false);
            setIncoming(null);
            notification.close();
          };
        }
      } catch {
        // Signed-out visitors and temporary connection failures stay silent.
      }
    };

    void checkIncoming();
    const timer = window.setInterval(() => void checkIncoming(), INCOMING_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [threadId]);

  const openExisting = useCallback((id: string) => {
    setPendingRef(null);
    setThreadId(id);
    setMinimized(false);
    setIncoming(null);
  }, []);

  const openChat = useCallback(async (args: OpenThreadArgs) => {
    setBusy(true);
    try {
      const id = await openThread(args);
      setPendingRef(
        args.contextTitle || args.contextSubtitle
          ? { title: args.contextTitle, subtitle: args.contextSubtitle, link: args.contextLink }
          : null,
      );
      setThreadId(id);
      setMinimized(false);
      // any open window (helpers list, profile card) steps aside so the chat is usable
      window.dispatchEvent(new CustomEvent("liba:chat-opened"));
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "";
      toast.error(
        /not_a_member|invalid_recipient/.test(msg) ? "אי אפשר לפתוח שיחה עם החברה הזאת" : "לא הצלחנו לפתוח את השיחה",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo(() => ({ openChat, openExisting }), [openChat, openExisting]);

  return (
    <LibaChatContext.Provider value={value}>
      {children}
      {busy && (
        <div className="fixed bottom-5 start-5 z-50 rounded-full bg-card px-4 py-2 text-[12.5px] font-light text-muted-foreground shadow-lg">
          <Loader2 className="me-2 inline h-3.5 w-3.5 animate-spin" />
          פותחות שיחה…
        </div>
      )}
      {incoming && (
        <div
          dir="rtl"
          role="status"
          className="fixed bottom-20 start-3 z-50 w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-border/70 bg-card shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none md:bottom-auto md:start-5 md:top-20"
        >
          <div className="flex items-start gap-3 p-3.5">
            <MemberAvatar
              name={incoming.other?.name ?? "חברה בליבה"}
              seed={incoming.other?.seed ?? incoming.id}
              imageUrl={incoming.other?.avatar_url ?? null}
              size="sm"
              userId={incoming.other?.profile_id ?? incoming.other?.user_id}
            />
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia("(min-width: 768px)").matches) openExisting(incoming.id);
                else window.location.assign(`/liba/messages?thread=${incoming.id}`);
              }}
              className="min-w-0 flex-1 text-start"
            >
              <span className="block text-[13px] font-medium text-foreground">הודעה חדשה מאת {incoming.other?.name ?? "חברה בליבה"}</span>
              <span className="mt-0.5 block truncate text-[12px] font-light text-muted-foreground">{incoming.preview ?? "מחכה לך הודעה חדשה בצ׳אט"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIncoming(null)}
              aria-label="סגירת ההודעה"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      {threadId && (
        <div
          dir="rtl"
          className="fixed bottom-0 start-4 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-t-[22px] border border-border/60 bg-card shadow-[var(--shadow-card)] animate-in fade-in slide-in-from-bottom-4 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
        >
          <div className="flex items-center gap-1 border-b border-border/60 bg-[hsl(var(--primary)/0.04)] px-3 py-2">
            <span className="me-auto text-[12.5px] font-light text-primary">שיחה בליבה</span>
            <button
              onClick={() => setMinimized((v) => !v)}
              aria-label={minimized ? "פתיחה" : "מזעור"}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${minimized ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={() => setThreadId(null)}
              aria-label="סגירה"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!minimized && (
            <div className="flex max-h-[70vh] flex-col">
              <ThreadPane
                threadId={threadId}
                variant="panel"
                pendingRef={pendingRef}
                onOpenFull={() => {
                  window.location.assign(`/liba/messages?thread=${threadId}`);
                }}
              />
            </div>
          )}
        </div>
      )}
    </LibaChatContext.Provider>
  );
};
