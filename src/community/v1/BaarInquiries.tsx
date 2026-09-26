/**
 * Member-to-member inquiries inside הבאר — reaching a recommender through Liba
 * instead of phone/email. Composer dialog + inbox drawer with threads.
 */
import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/community/v1/Avatar";
import AutoGrowingTextarea from "@/components/AutoGrowingTextarea";
import {
  BAAR_INQUIRY_STATUS_LABEL,
  type BaarInquiryDetail,
  type BaarInquiryThread,
  createBaarInquiry,
  fetchBaarInquiry,
  fetchBaarInquiryThreads,
  replyBaarInquiry,
  setBaarInquiryStatus,
} from "@/community/v1/baar";

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* --------------------------------- Composer --------------------------------- */

export const BaarInquiryComposer = ({
  open,
  onOpenChange,
  boyId,
  boyName,
  toUser,
  toName,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  boyId: string;
  boyName: string;
  toUser: string;
  toName: string;
  onSent?: () => void;
}) => {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) setBody("");
  }, [open]);

  const send = async () => {
    if (body.trim().length < 2) return;
    setSending(true);
    try {
      await createBaarInquiry(boyId, toUser, body.trim());
      toast.success("הפנייה נשלחה דרך ליבה");
      onOpenChange(false);
      onSent?.();
    } catch (e: any) {
      toast.error(
        /contact_not_allowed/.test(e?.message || "")
          ? "הממליצה לא פתחה פנייה דרך ליבה"
          : "לא הצלחנו לשלוח את הפנייה"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} desktopContentClassName="max-w-lg">
      <div dir="rtl" className="px-8 pb-10 pt-6 md:px-12 md:pt-10">
        <p className="text-[11px] text-primary">פנייה דרך ליבה</p>
        <p className="mt-1 text-[19px] font-light text-foreground">אל {toName}</p>
        <p className="mt-1 text-[13px] font-light text-muted-foreground">בנוגע ל{boyName}</p>
        <AutoGrowingTextarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="כמה מילים על מה שאת רוצה לשאול…"
          className="mt-4 max-h-48 min-h-[108px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] font-light leading-relaxed outline-none focus:border-primary"
        />
        <p className="mt-2 text-[11.5px] font-light text-muted-foreground">
          הפנייה נשמרת בליבה בלבד. פרטי הקשר שלך לא נחשפים.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
            ביטול
          </Button>
          <Button onClick={send} disabled={sending || body.trim().length < 2} className="rounded-full px-6">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "שליחה"}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};

/* ---------------------------------- Inbox ---------------------------------- */

export const BaarInquiriesDrawer = ({
  open,
  onOpenChange,
  onCountChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCountChange?: (unread: number) => void;
}) => {
  const [threads, setThreads] = useState<BaarInquiryThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<BaarInquiryDetail | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchBaarInquiryThreads();
      setThreads(list);
      onCountChange?.(list.reduce((sum, t) => sum + (t.unread || 0), 0));
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setActive(null);
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openThread = async (id: string) => {
    try {
      const detail = await fetchBaarInquiry(id);
      setActive(detail);
      setReply("");
      void load();
    } catch {
      toast.error("לא הצלחנו לפתוח את השיחה");
    }
  };

  const sendReply = async () => {
    if (!active || reply.trim().length < 1) return;
    setSending(true);
    try {
      await replyBaarInquiry(active.id, reply.trim());
      const detail = await fetchBaarInquiry(active.id);
      setActive(detail);
      setReply("");
      void load();
    } catch {
      toast.error("לא הצלחנו לשלוח");
    } finally {
      setSending(false);
    }
  };

  const closeThread = async () => {
    if (!active) return;
    try {
      await setBaarInquiryStatus(active.id, active.status === "closed" ? "answered" : "closed");
      const detail = await fetchBaarInquiry(active.id);
      setActive(detail);
      void load();
    } catch {
      toast.error("לא הצלחנו לעדכן");
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} desktopContentClassName="max-w-2xl">
      <div dir="rtl" className="max-h-[80vh] overflow-y-auto px-8 pb-10 pt-6 md:px-12 md:pt-10">
        {!active ? (
          <>
            <p className="text-[11px] text-primary">ליבה</p>
            <p className="mt-1 text-[19px] font-light text-foreground">הפניות שלי</p>
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              </div>
            ) : threads.length === 0 ? (
              <p className="py-12 text-center text-[13.5px] font-light text-muted-foreground">
                אין פניות כרגע. אפשר לפנות לממליצה מתוך פרופיל של בחור.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => openThread(t.id)}
                      className="flex w-full items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-3 text-right transition-colors hover:border-primary/40"
                    >
                      <MemberAvatar
                        name={t.other?.name || "חברה"}
                        seed={t.other?.seed ?? t.other?.user_id}
                        imageUrl={t.other?.avatar_url ?? null}
                        size="sm"
                        userId={t.other?.user_id}
                        context={{ sourceType: "baar", sourceId: t.boy_id, title: `הבאר · ${t.boy_name}` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[14px] text-foreground">{t.other?.name || "חברה"}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {t.direction === "sent" ? "פנייה שלי" : "פנייה אליי"}
                          </span>
                          {t.unread > 0 && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                              חדש
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          בנוגע ל{t.boy_name} · {BAAR_INQUIRY_STATUS_LABEL[t.status]}
                        </p>
                        {t.last_message && (
                          <p className="mt-1 line-clamp-1 text-[13px] font-light text-foreground/80">{t.last_message}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{timeLabel(t.last_message_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setActive(null)} className="text-[12px] text-primary hover:opacity-70">
              חזרה לכל הפניות
            </button>
            <p className="mt-3 text-[19px] font-light text-foreground">{active.other?.name || "חברה"}</p>
            <p className="mt-0.5 text-[12.5px] font-light text-muted-foreground">
              בנוגע ל{active.boy_name} · {BAAR_INQUIRY_STATUS_LABEL[active.status]}
            </p>

            <ul className="mt-5 space-y-3">
              {active.messages.map((m) => (
                <li
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] font-light leading-relaxed ${
                    m.mine
                      ? "ms-auto bg-primary/10 text-foreground"
                      : "me-auto border border-border/70 bg-card/70 text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[10.5px] text-muted-foreground">{timeLabel(m.created_at)}</p>
                </li>
              ))}
            </ul>

            {active.status !== "closed" ? (
              <div className="mt-5 flex items-end gap-2">
                <AutoGrowingTextarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={1}
                  placeholder="תשובה…"
                  className="max-h-28 min-h-[42px] flex-1 rounded-[22px] border border-border bg-background px-4 py-2.5 text-[14.5px] font-light leading-relaxed outline-none focus:border-primary"
                />
                <Button onClick={sendReply} disabled={sending || !reply.trim()} className="rounded-full px-4">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <p className="mt-5 text-[13px] font-light text-muted-foreground">השיחה סומנה כסגורה.</p>
            )}

            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={closeThread} className="rounded-full text-[12.5px]">
                {active.status === "closed" ? "פתיחה מחדש" : "סימון כסגורה"}
              </Button>
            </div>
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
};
