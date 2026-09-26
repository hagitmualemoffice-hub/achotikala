/**
 * "האזור האישי" — everything that happened around one woman, in one place.
 *
 * All of it comes from a single security-definer RPC that only ever answers
 * about the caller herself (comments on her posts, replies to her comments,
 * reactions she received, her own posts, and inquiries she takes part in).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Author } from "./api";
import { normalizeHearts, type HeartsState } from "./hearts";

const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export type ActivityKind =
  | "comment"
  | "reply"
  | "reaction_post"
  | "reaction_comment"
  | "helpful"
  | "baar_message"
  | "inquiry_offer"
  | "inquiry_message"
  | "message"
  | "space_post";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  created_at: string;
  actor: Author | null;
  post_id: string | null;
  title: string | null;
  excerpt: string | null;
  /** inquiry id for inquiry/baar items */
  extra: string | null;
  unread: boolean;
};

export type MyPost = {
  id: string;
  space: string;
  title: string | null;
  excerpt: string;
  created_at: string;
  nickname: boolean;
  comment_count: number;
  reaction_count: number;
};

export type MyBaarInquiry = {
  id: string;
  boy_id: string;
  boy_name: string;
  incoming: boolean;
  status: string;
  unread: number;
  last_message_at: string | null;
  other: Author | null;
};

export type MyInquiry = {
  id: string;
  boy_name: string;
  status: string;
  created_at: string;
  help_count: number;
};

export type MyActivity =
  | { authenticated: boolean; authorized: false }
  | {
      authenticated: true;
      authorized: true;
      seen_at: string | null;
      unread: number;
      hearts: HeartsState;
      items: ActivityItem[];
      my_posts: MyPost[];
      baar_inquiries: MyBaarInquiry[];
      my_inquiries: MyInquiry[];
    };

export const fetchMyActivity = async (limit = 60): Promise<MyActivity> => {
  const raw = await rpc<MyActivity>("community_my_activity", { _limit: limit });
  if (!raw?.authorized) return raw;
  return { ...raw, hearts: normalizeHearts(raw.hearts as Partial<HeartsState> | null) };
};

export const fetchActivityUnread = async (): Promise<number> => {
  try {
    const raw = await rpc<{ unread?: number }>("community_my_activity_count");
    return Number(raw?.unread ?? 0);
  } catch {
    return 0;
  }
};

export const markActivitySeen = () => rpc<{ ok: boolean }>("community_mark_activity_seen");

/* --------------------------------- labels --------------------------------- */

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  comment: "הגיבה לפוסט שלך",
  reply: "הגיבה לתגובה שלך",
  reaction_post: "הגיבה לפוסט שלך",
  reaction_comment: "הגיבה לתגובה שלך",
  helpful: 'סימנה שהתגובה שלך עזרה לה',
  baar_message: "פנייה בבאר",
  inquiry_offer: "מציעה לעזור בבירור שלך",
  inquiry_message: "הודעה בבירור",
  message: "כתבה לך",
  space_post: "פרסמה במרחב שאת עוקבת אחריו",
};

export const ACTIVITY_GROUPS = [
  { key: "all", label: "הכל" },
  { key: "replies", label: "תגובות" },
  { key: "hearts", label: "לבבות ואייקונים" },
  { key: "inquiries", label: "פניות" },
  { key: "spaces", label: "מהמרחבים שלי" },
] as const;

export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number]["key"];

export const inGroup = (item: ActivityItem, group: ActivityGroup) => {
  if (group === "all") return true;
  if (group === "replies") return item.kind === "comment" || item.kind === "reply" || item.kind === "helpful";
  if (group === "hearts") return item.kind === "reaction_post" || item.kind === "reaction_comment";
  if (group === "spaces") return item.kind === "space_post";
  return (
    item.kind === "baar_message" ||
    item.kind === "inquiry_offer" ||
    item.kind === "inquiry_message" ||
    item.kind === "message"
  );
};
