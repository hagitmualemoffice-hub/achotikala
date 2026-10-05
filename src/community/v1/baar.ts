/**
 * Client API for הבאר — the community matchmaking database inside Liba.
 * All reads/writes go through security-definer RPCs.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Author, CommunityProfile } from "./api";

const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args ?? {});
  if (error) throw error;
  return data as T;
};

export type BaarAccessState =
  | { authenticated: false; authorized: false; baar_access: false }
  | { authenticated: true; authorized: false; baar_access: false }
  | {
      authenticated: true;
      authorized: true;
      baar_access: boolean;
      is_admin: boolean;
      my_boys: number;
      my_recommendations: number;
      pending_reports: number;
      pending_suggestions: number;
      profile: CommunityProfile;
    };

export type BaarRecommendation = {
  id: string;
  relationship_type: string;
  note: string | null;
  contact_mode: "liba" | "profile" | "both";
  visible: boolean;
  user_id: string | null;
  source?: string | null;
  has_photo?: boolean | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  legacy_name?: string | null;
  legacy_email?: string | null;
  legacy_phone?: string | null;
  author: Author;
  created_at: string;
};

export type BaarBoy = {
  id: string;
  full_name: string;
  age: number | null;
  city: string | null;
  status: string | null;
  orientation: string | null;
  ethnicity: string | null;
  dress_style: string | null;
  details: string | null;
  looking_for: string | null;
  positives: string | null;
  proposal_contact_name: string | null;
  proposal_contact_phone: string | null;
  proposal_contact_email: string | null;
  photo_url: string | null;
  has_photo: boolean;
  saved?: boolean;
  is_active: boolean;
  created_by: string | null;
  mine: boolean;
  updated_at: string;
  created_at: string;
  recommendation_count: number;
  my_recommendation: {
    relationship_type: string;
    note: string | null;
    contact_mode: string;
    visible: boolean;
    has_photo?: boolean | null;
    contact_phone?: string | null;
    contact_email?: string | null;
  } | null;
};

export type BaarListResult = {
  items: BaarBoy[];
  total: number;
};

export type BaarBoyProfile = BaarBoy & {
  can_edit: boolean;
  can_recommend: boolean;
  recommendations: BaarRecommendation[];
};

export type BaarFilters = {
  query?: string | null;
  status?: string | null;
  orientation?: string | null;
  ethnicity?: string | null;
  dress_style?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  hasRecommendations?: boolean | null;
  sort?: "new" | "recent" | "name" | "saved";
};

export const STATUS_OPTIONS = [
  { value: "single", label: "רווק" },
  { value: "divorced", label: "גרוש" },
  { value: "widower", label: "אלמן" },
  { value: "divorced_plus", label: "גרוש +" },
  { value: "other", label: "אחר" },
];

export const ORIENTATION_OPTIONS = [
  { value: "חרדי", label: "חרדי" },
  { value: "חרדי לאומי", label: "חרדי לאומי" },
  { value: "חוזר בתשובה", label: "חוזר בתשובה" },
  { value: "חרדי מתחזק", label: "חרדי מתחזק" },
  { value: "חרדי פתוח", label: "חרדי פתוח" },
  { value: "אחר", label: "אחר" },
];

export const ETHNICITY_OPTIONS = [
  { value: "אשכנזי", label: "אשכנזי" },
  { value: "ספרדי", label: "ספרדי" },
  { value: "חוצניק", label: "חוצניק" },
  { value: "תימני", label: "תימני" },
  { value: "חצי חצי", label: "חצי חצי" },
];

export const DRESS_STYLE_OPTIONS = [
  { value: "שחור לבן", label: "שחור לבן" },
  { value: "צבעוני", label: "צבעוני" },
  { value: "כיפה סרוגה", label: "כיפה סרוגה" },
  { value: "חולצה", label: "חולצה" },
  { value: "לבוש מערבי", label: "לבוש מערבי" },
  { value: "אחר", label: "אחר" },
];

export const RELATIONSHIP_OPTIONS = [
  { value: "שמעתי עליו", label: "שמעתי עליו" },
  { value: "בררתי עליו", label: "בררתי עליו" },
  { value: "נפגשתי איתו", label: "נפגשתי איתו" },
  { value: "מכירה אישית", label: "מכירה אישית" },
  { value: "מכירה את המשפחה", label: "מכירה את המשפחה" },
  { value: "נשאיר פתוח", label: "נשאיר פתוח" },
];

export const REPORT_REASONS = [
  { value: "מידע לא נכון", label: "מידע לא נכון" },
  { value: "מידע לא מעודכן", label: "מידע לא מעודכן" },
  { value: "הבחור התחתן / כבר לא רלוונטי", label: "הבחור התחתן / כבר לא רלוונטי" },
  { value: "כפילות במאגר", label: "כפילות במאגר" },
  { value: "תוכן לא מתאים", label: "תוכן לא מתאים" },
  { value: "בקשת הסרה של הכרטיס", label: "בקשת הסרה של הכרטיס" },
  { value: "אחר", label: "אחר" },
];

export const baarBootstrap = () => rpc<BaarAccessState>("baar_bootstrap");

export const fetchBaarList = (filters: BaarFilters, limit = 20, offset = 0) =>
  rpc<BaarListResult>("baar_list", {
    _query: filters.query?.trim() || null,
    _status: filters.status || null,
    _orientation: filters.orientation || null,
    _ethnicity: filters.ethnicity || null,
    _dress_style: filters.dress_style || null,
    _min_age: filters.minAge ?? null,
    _max_age: filters.maxAge ?? null,
    _has_recommendations: filters.hasRecommendations ?? null,
    _sort: filters.sort ?? "new",
    _limit: limit,
    _offset: offset,
  });

export const fetchBaarProfile = (boyId: string) =>
  rpc<BaarBoyProfile>("baar_profile", { _boy_id: boyId });

export type BaarSavedBoy = {
  id: string;
  full_name: string;
  age: number | null;
  city: string | null;
  status: string | null;
  orientation: string | null;
  ethnicity: string | null;
  dress_style: string | null;
  saved_at: string;
  recommendation_count: number;
};

export const toggleBaarSave = (boyId: string) =>
  rpc<boolean>("baar_toggle_save", { _boy_id: boyId });

export const fetchBaarSaved = () =>
  rpc<{ authorized: boolean; items: BaarSavedBoy[] }>("baar_saved_list");

export const createBaarBoy = (payload: {
  full_name: string;
  age?: number | null;
  city?: string | null;
  status?: string | null;
  orientation?: string | null;
  ethnicity?: string | null;
  dress_style?: string | null;
  details?: string | null;
  looking_for?: string | null;
  positives?: string | null;
  photo_url?: string | null;
  relationship_type: string;
  recommendation_note?: string | null;
  contact_mode?: "liba" | "profile" | "both";
  as_nickname?: boolean;
  has_photo?: boolean | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}) => rpc<string>("baar_create", {
  _full_name: payload.full_name,
  _age: payload.age ?? null,
  _city: payload.city ?? null,
  _status: payload.status ?? null,
  _orientation: payload.orientation ?? null,
  _ethnicity: payload.ethnicity ?? null,
  _dress_style: payload.dress_style ?? null,
  _details: payload.details ?? null,
  _looking_for: payload.looking_for ?? null,
  _positives: payload.positives ?? null,
  _photo_url: payload.photo_url ?? null,
  _relationship_type: payload.relationship_type,
  _recommendation_note: payload.recommendation_note ?? null,
  _contact_mode: payload.contact_mode ?? "liba",
  _as_nickname: payload.as_nickname ?? false,
  _has_photo: payload.has_photo ?? null,
  _contact_phone: payload.contact_phone ?? null,
  _contact_email: payload.contact_email ?? null,
});

export const updateBaarBoy = (
  boyId: string,
  payload: {
    full_name: string;
    age?: number | null;
    city?: string | null;
    status?: string | null;
    orientation?: string | null;
    ethnicity?: string | null;
    dress_style?: string | null;
    details?: string | null;
    looking_for?: string | null;
    positives?: string | null;
    photo_url?: string | null;
  }
) => rpc<void>("baar_update", {
  _boy_id: boyId,
  _full_name: payload.full_name,
  _age: payload.age ?? null,
  _city: payload.city ?? null,
  _status: payload.status ?? null,
  _orientation: payload.orientation ?? null,
  _ethnicity: payload.ethnicity ?? null,
  _dress_style: payload.dress_style ?? null,
  _details: payload.details ?? null,
  _looking_for: payload.looking_for ?? null,
  _positives: payload.positives ?? null,
  _photo_url: payload.photo_url ?? null,
});

export const setBaarProposalContact = (
  boyId: string,
  contact: { name: string; phone: string; email: string },
) => rpc<void>("baar_set_proposal_contact", {
  _boy_id: boyId,
  _contact_name: contact.name.trim(),
  _contact_phone: contact.phone.trim(),
  _contact_email: contact.email.trim(),
});

export const archiveBaarBoy = (boyId: string) =>
  rpc<void>("baar_archive", { _boy_id: boyId });

export const recommendBaarBoy = (
  boyId: string,
  relationship_type: string,
  note?: string | null,
  contact_mode: "liba" | "profile" | "both" = "liba",
  extra?: { has_photo?: boolean | null; contact_phone?: string | null; contact_email?: string | null }
) => rpc<void>("baar_recommend", {
  _boy_id: boyId,
  _relationship_type: relationship_type,
  _note: note ?? null,
  _contact_mode: contact_mode,
  _has_photo: extra?.has_photo ?? null,
  _contact_phone: extra?.contact_phone ?? null,
  _contact_email: extra?.contact_email ?? null,
});

export const removeBaarRecommendation = (boyId: string) =>
  rpc<void>("baar_remove_recommendation", { _boy_id: boyId });

export const reportBaarBoy = (boyId: string, reason: string, details?: string | null) =>
  rpc<void>("baar_report", { _boy_id: boyId, _reason: reason, _details: details ?? null });

export const DELETION_REASONS = ["התחתן", "לא ממליצה עליו", "אחר"];

export const requestBaarDeletion = (boyId: string, reason: string, details?: string | null) =>
  rpc<void>("baar_request_deletion", { _boy_id: boyId, _reason: reason, _details: details?.trim() || null });

export const fetchBaarDeletionRequests = () =>
  rpc<
    {
      id: string; boy_id: string; boy_name: string; boy_active: boolean; reason: string;
      details: string | null; status: string; created_at: string; reporter_name: string;
    }[]
  >("baar_admin_deletion_requests");

export const resolveBaarDeletion = (id: string, approve: boolean) =>
  rpc<void>("baar_admin_resolve_deletion", { _request_id: id, _approve: approve });

export const suggestBaarUpdate = (boyId: string, kind: string, details: string) =>
  rpc<void>("baar_suggest", { _boy_id: boyId, _kind: kind, _details: details });

export const findSimilarBoys = (name: string, excludeId?: string | null) =>
  rpc<BaarBoy[]>("baar_find_similar", {
    _name: name,
    _exclude_id: excludeId ?? null,
  });

/* ------------------------- Member-to-member inquiries ------------------------- */

export type BaarInquiryStatus = "pending" | "answered" | "closed";

export type BaarInquiryThread = {
  id: string;
  boy_id: string;
  boy_name: string;
  direction: "sent" | "received";
  status: BaarInquiryStatus;
  unread: number;
  last_message_at: string;
  created_at: string;
  other: Author;
  last_message: string | null;
};

export type BaarInquiryMessage = {
  id: string;
  body: string;
  created_at: string;
  mine: boolean;
  author: Author;
};

export type BaarInquiryDetail = {
  id: string;
  boy_id: string;
  boy_name: string;
  status: BaarInquiryStatus;
  direction: "sent" | "received";
  other: Author;
  messages: BaarInquiryMessage[];
};

export const BAAR_INQUIRY_STATUS_LABEL: Record<BaarInquiryStatus, string> = {
  pending: "ממתינה לתשובה",
  answered: "נענתה",
  closed: "נסגרה",
};

export const createBaarInquiry = (boyId: string, toUser: string, body: string) =>
  rpc<string>("baar_inquiry_create", { _boy_id: boyId, _to_user: toUser, _body: body });

export const replyBaarInquiry = (inquiryId: string, body: string) =>
  rpc<void>("baar_inquiry_reply", { _inquiry_id: inquiryId, _body: body });

export const fetchBaarInquiryThreads = () =>
  rpc<BaarInquiryThread[]>("baar_inquiry_threads");

export const fetchBaarInquiry = (inquiryId: string) =>
  rpc<BaarInquiryDetail>("baar_inquiry_thread", { _inquiry_id: inquiryId });

export const setBaarInquiryStatus = (inquiryId: string, status: BaarInquiryStatus) =>
  rpc<void>("baar_inquiry_set_status", { _inquiry_id: inquiryId, _status: status });

export const openInquiryForBoy = (boy: BaarBoyProfile) => {
  const event = new CustomEvent("liba:open-inquiry", {
    detail: {
      boy_name: boy.full_name,
      background: boy.ethnicity?.toLowerCase().includes("ספרד") ? "sephardi" : "ashkenazi",
      details: [boy.age ? `גיל: ${boy.age}` : "", boy.city ? `עיר: ${boy.city}` : "", boy.orientation ?? ""]
        .filter(Boolean)
        .join(" · "),
    },
  });
  window.dispatchEvent(event);
};
