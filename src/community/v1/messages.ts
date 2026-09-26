/**
 * One private-messaging infrastructure for all of ליבה.
 *
 * Every conversation remembers WHY it started (source_type / source_id /
 * context), so a thread opened from הבאר, from a בירור or from a post all end
 * up in the same inbox — "שלי → הודעות" — without losing their context.
 *
 * All reads and writes go through security-definer RPCs that only ever answer
 * about threads the caller participates in.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Author } from "./api";

const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export type ThreadSource = "baar" | "inquiry" | "post" | "comment" | "direct";

export type ThreadSummary = {
  id: string;
  source_type: ThreadSource;
  source_id: string | null;
  context_title: string | null;
  context_subtitle: string | null;
  context_link: string | null;
  last_message_at: string;
  preview: string | null;
  unread: number;
  other: Author | null;
};

/**
 * "בקשר למה" — a reference attached to a single message (like forwarding a post
 * in WhatsApp). It never becomes the title of the whole conversation.
 */
export type MessageRef = {
  title?: string | null;
  subtitle?: string | null;
  link?: string | null;
};

export type ThreadMessage = {
  id: string;
  body: string;
  created_at: string;
  mine: boolean;
  reply_to: string | null;
  reply_preview: string | null;
  ref_title?: string | null;
  ref_subtitle?: string | null;
  ref_link?: string | null;
};

export type ThreadDetail = {
  authorized: boolean;
  thread?: ThreadSummary & { last_read_at: string | null };
  messages?: ThreadMessage[];
};

export type OpenThreadArgs = {
  /** the member this conversation is with */
  userId: string;
  sourceType?: ThreadSource;
  sourceId?: string | null;
  contextTitle?: string | null;
  contextSubtitle?: string | null;
  contextLink?: string | null;
};

export const openThread = (a: OpenThreadArgs) =>
  rpc<string>("liba_thread_open", {
    _other: a.userId,
    _source_type: a.sourceType ?? "direct",
    _source_id: a.sourceId ?? null,
    _context_title: a.contextTitle ?? null,
    _context_subtitle: a.contextSubtitle ?? null,
    _context_link: a.contextLink ?? null,
  });

export const fetchThreads = async (limit = 60) => {
  const raw = await rpc<{ authorized: boolean; unread: number; items: ThreadSummary[] }>("liba_threads", {
    _limit: limit,
  });
  return { authorized: !!raw?.authorized, unread: Number(raw?.unread ?? 0), items: raw?.items ?? [] };
};

export const fetchThread = (id: string) => rpc<ThreadDetail>("liba_thread", { _thread_id: id });

export const sendMessage = (
  threadId: string,
  body: string,
  replyTo?: string | null,
  ref?: MessageRef | null,
) =>
  rpc<{ ok: boolean; id: string }>("liba_send", {
    _thread_id: threadId,
    _body: body,
    _reply_to: replyTo ?? null,
    _ref_title: ref?.title ?? null,
    _ref_subtitle: ref?.subtitle ?? null,
    _ref_link: ref?.link ?? null,
  });

/** Only the authenticated sender can delete her own message. */
export const deleteMessage = (messageId: string) =>
  rpc<{ ok: boolean }>("liba_message_delete", { _message_id: messageId });

/** Warm one-tap replies — "stickers" in words, the way ליבה speaks. */
export const QUICK_NOTES = [
  { emoji: "💗", text: "מהממת שאת" },
  { emoji: "🙏", text: "תודה רבה" },
  { emoji: "🤗", text: "חיבוק" },
  { emoji: "🥺", text: "ריגשת אותי" },
  { emoji: "🌷", text: "שימחת אותי" },
  { emoji: "🫶", text: "צריכה עזרה?" },
] as const;

export const markThreadRead = (id: string) => rpc<{ ok: boolean }>("liba_thread_mark_read", { _thread_id: id });

export const fetchMessagesUnread = async (): Promise<number> => {
  try {
    const raw = await rpc<{ unread?: number }>("liba_messages_unread");
    return Number(raw?.unread ?? 0);
  } catch {
    return 0;
  }
};

/* --------------------------------- labels --------------------------------- */

export const SOURCE_LABEL: Record<ThreadSource, string> = {
  baar: "הבאר",
  inquiry: "בירורים",
  post: "פרסום",
  comment: "תגובה",
  direct: "ליבה",
};

export const threadContextLine = (t: Pick<ThreadSummary, "source_type" | "context_title">) =>
  [SOURCE_LABEL[t.source_type] ?? "ליבה", t.context_title].filter(Boolean).join(" · ");

/* --------------------------------- time ---------------------------------- */

export const msgTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

export const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "היום";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (same(d, yesterday)) return "אתמול";
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
};
