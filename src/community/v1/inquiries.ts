import { supabase } from "@/integrations/supabase/client";
import type { Author } from "./api";

export type InquiryBackground = "ashkenazi" | "sephardi";
export type InquiryStatus = "open" | "closed" | "resolved" | "removed";
export type InquiryView = "cards" | "list";

export type InquiryHelper = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  seed: string | null;
  anonymous: boolean;
  connection_type: string | null;
};

export type InquiryOffer = {
  id: string;
  connection_type: string;
  contact_mode: "share_details" | "liba";
  visible: boolean;
};

export type Inquiry = {
  id: string;
  boy_name: string;
  age: number | null;
  city: string | null;
  yeshiva: string | null;
  background: InquiryBackground;
  info_types: string[];
  details: string | null;
  status: InquiryStatus;
  pinned: boolean;
  created_at: string;
  needs_help: boolean;
  author: Author;
  author_full_name: string | null;
  mine: boolean;
  can_moderate: boolean;
  help_count: number;
  helpers: InquiryHelper[];
  my_offer: InquiryOffer | null;
};

export type NewInquiry = {
  boy_name: string;
  background: InquiryBackground;
  info_types: string[];
  details: string;
  /** Kept as the stored field name for compatibility; true now means anonymous. */
  as_nickname: boolean;
  /** The asker's full name (first + last); required when posting non-anonymously. */
  author_full_name: string;
};

export type InquiryThread = {
  offer_id: string;
  mine: boolean;
  helper: Author | null;
  chat_user_id: string | null;
  connection_type: string;
  contact_mode: "share_details" | "liba";
  thanked_at: string | null;
  shared_contact: { whatsapp?: string; email?: string } | null;
  messages: { id: string; mine: boolean; body: string; created_at: string }[];
};

export const isInquiryNew = (createdAt: string, hours = 24) =>
  Date.now() - new Date(createdAt).getTime() < hours * 60 * 60 * 1000;

const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export const fetchInquiries = (input: {
  query?: string;
  background?: string;
  helpStatus?: string;
  all?: boolean;
  limit?: number;
} = {}) =>
  rpc<Inquiry[]>("community_inquiry_feed", {
    _query: input.query?.trim() || null,
    _background: input.background && input.background !== "all" ? input.background : null,
    _help_status: input.helpStatus ?? "all",
    _limit: input.all ? 100 : (input.limit ?? 50),
    _offset: 0,
  });

export const createInquiry = (payload: NewInquiry) =>
  rpc<string>("community_inquiry_create", { _payload: payload });

export const updateInquiry = (id: string, payload: NewInquiry) =>
  adminInquiryAction(id, "edit", payload);

export const offerInquiryHelp = (
  inquiryId: string,
  connectionType: string,
  contactMode: "share_details" | "liba",
  visible: boolean,
) =>
  rpc<Inquiry>("community_inquiry_offer", {
    _inquiry_id: inquiryId,
    _connection_type: connectionType,
    _contact_mode: contactMode,
    _visible: visible,
  });

export const cancelInquiryHelp = (inquiryId: string) =>
  rpc<Inquiry>("community_inquiry_cancel_offer", { _inquiry_id: inquiryId });

export const fetchInquiryThreads = (inquiryId: string) =>
  rpc<InquiryThread[]>("community_inquiry_threads", { _inquiry_id: inquiryId });

export const sendInquiryMessage = (offerId: string, body: string) =>
  rpc<null>("community_inquiry_message", { _offer_id: offerId, _body: body });

/** thanks one helper: writes a thank-you in her thread and marks the offer */
export const thankInquiryOffer = (offerId: string) =>
  rpc<{ offer_id: string; helper_id: string; inquiry_id: string; boy_name: string }>(
    "community_inquiry_thank_offer",
    { _offer_id: offerId },
  );

export const setInquiryStatus = (id: string, status: InquiryStatus) =>
  rpc<Inquiry>("community_inquiry_set_status", { _id: id, _status: status });

export const adminInquiryAction = (id: string, action: "remove" | "pin" | "bump" | "edit", payload: Record<string, unknown> = {}) =>
  rpc<Inquiry>("community_inquiry_admin_action", { _id: id, _action: action, _payload: payload });

export const notifyInquiry = async (
  kind: "created" | "offered" | "thanked" | "thanked_one",
  inquiryId: string,
  offerId?: string,
) => {
  const { error } = await supabase.functions.invoke("community-inquiry-notify", {
    body: { kind, inquiryId, ...(offerId ? { offerId } : {}) },
  });
  if (error) throw error;
};
