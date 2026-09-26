/**
 * The one door between the community UI and the backend.
 *
 * Every read and write goes through security-definer functions that verify
 * membership on the server (same access list as the apartments board).
 * The tables themselves are closed to the client, so there is no way to read
 * or write around these calls.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SpaceId } from "./spaces";
import { normalizeHearts, type HeartsState } from "./hearts";

/* ---------------------------------- types --------------------------------- */

export type NamedReactionKind =
  | "heart"
  | "pray"
  | "clap"
  | "useful"
  | "me_too"
  | "like"
  | "sad"
  | "happy"
  | "excited"
  | "hug"
  | "wow";

/**
 * Either one of the drawn reactions above, or any emoji a woman picked herself,
 * stored as "emoji:<char>" so new emojis never need a code change.
 */
export type ReactionKind = NamedReactionKind | (string & {});

/** Anything a reaction can hang on. */
export type ReactionTarget = "post" | "comment" | "pulse_response";

export type ReactionMap = Partial<Record<string, { count: number; mine: boolean }>>;


export type Author = {
  name: string;
  initials: string;
  /** true when the writer chose to post under her nickname */
  nickname: boolean;
  mine: boolean;
  /** admins only: the real name behind a nickname */
  real_name: string | null;
  user_id: string | null;
  /** set only when she wrote in her own name — lets others open her profile */
  profile_id?: string | null;
  /** profile photo — never sent for nickname activity unless she allowed it */
  avatar_url?: string | null;
  /** stable colour seed; the nickname identity gets its own seed */
  seed?: string | null;
  /** visible only when she opted in and was active recently */
  online?: boolean;
};


export type AttachmentKind = "file" | "link" | "pdf" | "excel" | "doc" | "image";

export type ApiAttachment = {
  id: string;
  kind: AttachmentKind;
  title: string;
  meta: string | null;
  url: string | null;
  has_file: boolean;
  curated: boolean;
};

/** what the composer sends up before a post exists */
export type NewAttachment = {
  kind: AttachmentKind;
  title: string;
  meta?: string | null;
  url?: string | null;
  storage_path?: string | null;
};

export type ApiComment = {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author: Author;
  mine: boolean;
  reactions: ReactionMap;
  /** the woman who wrote the post said this response helped her */
  helpful?: boolean;
  replies?: ApiComment[];
};

export type Participant = {
  name: string;
  initials: string;
  nickname: boolean;
  user_id?: string | null;
  avatar_url?: string | null;
  seed?: string | null;
  online?: boolean;
};


export type ApiPost = {
  id: string;
  space: SpaceId;
  title: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  last_activity_at?: string | null;
  pinned: boolean;
  author: Author;
  mine: boolean;
  can_moderate: boolean;
  unread: boolean;
  comment_count: number;
  saved: boolean;
  reactions: ReactionMap;
  attachments: ApiAttachment[];
  participants?: Participant[];
  participant_count?: number;
};


export type SinceLastVisit = {
  first_visit: boolean;
  new_posts: number;
  replies_to_me: number;
  in_my_threads: number;
  new_tools: number;
  hearts_on_my_posts: number;
  me_too_on_my_posts: number;
};

export type Notice = { id: string; title: string; note: string | null };
export type CommunityEvent = {
  id: string;
  title: string;
  date: string | null;
  place: string | null;
  url: string | null;
};
export type Tool = {
  id: string;
  title: string;
  kind: string;
  space: SpaceId | null;
  by: string | null;
  url: string | null;
  has_file: boolean;
  attachment_id: string | null;
};
export type TalkingNow = { id: string; space: SpaceId; title: string; recent: number };

/** Email notification switches — new ones can be added without touching the model. */
export type NotifyPrefs = {
  comment_on_my_post?: boolean;
  reply_to_my_comment?: boolean;
  [key: string]: boolean | undefined;
};

export type CommunityProfile = {
  display_name: string;
  initials: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  avatar_in_nickname_mode: boolean;
  notify_prefs: NotifyPrefs;
  show_online: boolean;
  /** true when we still have no real first name for her */
  needs_name: boolean;

  /* ------- "תכירו אותי": everything she chose to share with the others ------- */
  about_area: string | null;
  about_work: string | null;
  about_loves: string | null;
  about_help: string | null;
  mastery_tags: string[];
  mastery_note: string | null;
  contact_via_liba: boolean;
  contact_whatsapp: string | null;
  contact_email: string | null;
  contact_show_whatsapp: boolean;
  contact_show_email: boolean;
  profile_complete: boolean;
  hearts: HeartsState;
};

/** What she can edit in "תכירו אותי" — all of it optional. */
export type AboutInput = {
  area?: string | null;
  work?: string | null;
  loves?: string | null;
  help?: string | null;
  mastery_tags?: string[];
  mastery_note?: string | null;
  contact_via_liba?: boolean;
  contact_whatsapp?: string | null;
  contact_email?: string | null;
  contact_show_whatsapp?: boolean;
  contact_show_email?: boolean;
};

export type Bootstrap = {
  authenticated: boolean;
  authorized: boolean;
  is_admin?: boolean;
  requires_agreement?: boolean;
  profile?: CommunityProfile;

  since?: SinceLastVisit;
  notices?: Notice[];
  events?: CommunityEvent[];
  tools?: Tool[];
  talking_now?: TalkingNow[];
  admin_pending?: { tools: number; reports: number } | null;
};

export type AdminQueue = {
  tools: {
    id: string;
    title: string;
    kind: string;
    space: SpaceId | null;
    url: string | null;
    note: string | null;
    by: string | null;
    submitted_at: string;
  }[];
  reports: {
    id: string;
    target_type: "post" | "comment";
    target_id: string;
    reason: string | null;
    created_at: string;
    excerpt: string | null;
  }[];
};

/* --------------------------------- helpers -------------------------------- */

/** Supabase RPC returns `unknown` for jsonb; narrow it in one place. */
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args ?? {});
  if (error) throw error;
  return data as T;
};

export const isNotAuthorized = (e: unknown) =>
  typeof e === "object" && e !== null && /not_authorized|42501/.test(JSON.stringify(e));

export const isOffline = (e: unknown) =>
  typeof e === "object" &&
  e !== null &&
  /fetch|network|failed to fetch/i.test((e as { message?: string }).message ?? "");

/** Short Hebrew relative time without the redundant "לפני" prefix. */
export const relTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `${m} דקות`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "שעה" : `${h} שעות`;
  const d = Math.round(h / 24);
  if (d === 1) return "אתמול";
  if (d < 7) return `${d} ימים`;
  const w = Math.round(d / 7);
  if (w < 5) return w === 1 ? "שבוע" : `${w} שבועות`;
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long" });
};

/* ----------------------------------- reads -------------------------------- */

export const bootstrap = async (): Promise<Bootstrap> => {
  const b = await rpc<Bootstrap>("community_bootstrap");
  return b?.profile ? { ...b, profile: withHearts(b.profile) } : b;
};

export const fetchFeed = (opts: {
  space?: SpaceId | null;
  query?: string | null;
  sort?: "new" | "active";
  saved?: boolean;
  limit?: number;
  offset?: number;
}) =>
  rpc<ApiPost[]>("community_feed", {
    _space: opts.space ?? null,
    _query: opts.query ?? null,
    _sort: opts.sort ?? "new",
    _saved: opts.saved ?? false,
    _limit: opts.limit ?? 20,
    _offset: opts.offset ?? 0,
  });

export const fetchThread = (postId: string) =>
  rpc<ApiComment[]>("community_thread", { _post_id: postId });

/* ---------------------------------- writes -------------------------------- */

export const setNickname = (nick: string) =>
  rpc<{ nickname: string }>("community_set_nickname", { _nick: nick });

/** Server sends hearts as loose json; give the UI a complete object every time. */
export const withHearts = (p: CommunityProfile): CommunityProfile => ({
  ...p,
  mastery_tags: Array.isArray(p?.mastery_tags) ? p.mastery_tags : [],
  hearts: normalizeHearts(p?.hearts as Partial<HeartsState> | null),
});

/** Everything the woman owns about herself: name, nickname, photo, privacy, notifications. */
export const updateProfile = async (input: {
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  avatar?: string | null;
  clearAvatar?: boolean;
  avatarInNicknameMode?: boolean | null;
  notifyPrefs?: NotifyPrefs | null;
  showOnline?: boolean | null;
  about?: AboutInput | null;
}) =>
  withHearts(
    await rpc<CommunityProfile>("community_update_profile", {
      _first: input.firstName ?? null,
      _last: input.lastName ?? null,
      _nick: input.nickname ?? null,
      _avatar: input.avatar ?? null,
      _clear_avatar: input.clearAvatar ?? false,
      _avatar_in_nickname_mode: input.avatarInNicknameMode ?? null,
      _notify_prefs: input.notifyPrefs ?? null,
      _show_online: input.showOnline ?? null,
      _about: input.about ?? null,
    }),
  );

/** A member's card as others may see it: only what she chose to share. */
export type MemberProfile = {
  user_id: string;
  name: string;
  initials: string;
  avatar_url: string | null;
  seed: string | null;
  online: boolean;
  mine: boolean;
  about_area: string | null;
  about_work: string | null;
  about_loves: string | null;
  about_help: string | null;
  mastery_tags: string[];
  mastery_note: string | null;
  contact_via_liba: boolean;
  /** present only when she explicitly allowed showing it */
  contact_whatsapp: string | null;
  contact_email: string | null;
  hearts: HeartsState;
};

export const memberProfile = async (userId: string): Promise<MemberProfile> => {
  const p = await rpc<MemberProfile>("community_member_profile", { _uid: userId });
  return {
    ...p,
    mastery_tags: Array.isArray(p?.mastery_tags) ? p.mastery_tags : [],
    hearts: normalizeHearts(p?.hearts as Partial<HeartsState> | null),
  };
};

/** Her own heart count — never anyone else's, and never a ranking. */
export const myHearts = async (): Promise<HeartsState> =>
  normalizeHearts(await rpc<Partial<HeartsState>>("community_my_hearts"));

/**
 * A small moment of appreciation: only the woman who wrote the post can say a
 * response helped her, and only once per response.
 */
export const markHelpful = (commentId: string) =>
  rpc<{ helpful: boolean }>("community_mark_helpful", { _comment_id: commentId });

/** Refreshes presence without exposing a writable profile row to the client. */
export const touchPresence = () => rpc<null>("community_touch_presence");


export const acceptAgreement = (community: boolean, advertising: boolean) =>
  rpc<null>("community_accept_agreement", { _community: community, _advertising: advertising });

export const createPost = async (input: {
  space: SpaceId;
  body: string;
  title?: string | null;
  asNickname?: boolean;
  attachments?: NewAttachment[];
}) => {
  const id = await rpc<string>("community_create_post", {
    _space: input.space,
    _body: input.body,
    _title: input.title ?? null,
    _as_nickname: input.asNickname ?? false,
    _attachments: input.attachments ?? [],
  });
  // whoever asked to hear about every publication in this space (and the
  // מאסטריות who chose email) gets it now — quietly, never blocking publishing.
  void supabase.functions
    .invoke("community-space-notify", { body: { postId: id } })
    .catch(() => undefined);
  return id;
};

export const addComment = (input: {
  postId: string;
  body: string;
  parentId?: string | null;
  asNickname?: boolean;
}) =>
  rpc<string>("community_add_comment", {
    _post_id: input.postId,
    _body: input.body,
    _parent_id: input.parentId ?? null,
    _as_nickname: input.asNickname ?? false,
  });

export const toggleReaction = (
  targetType: ReactionTarget,
  targetId: string,
  kind: ReactionKind,
) =>
  rpc<ReactionMap>("community_toggle_reaction", {
    _target_type: targetType,
    _target_id: targetId,
    _kind: kind,
  });

export const toggleSave = (postId: string) =>
  rpc<boolean>("community_toggle_save", { _post_id: postId });

/**
 * Who reacted (names follow the same privacy rules). Without a kind it returns
 * every reaction on the item, each row carrying the reaction she chose.
 */
export const reactionActors = (
  targetType: ReactionTarget,
  targetId: string,
  kind?: ReactionKind | null,
) =>
  rpc<(Participant & { kind?: ReactionKind })[]>("community_reaction_actors", {
    _target_type: targetType,
    _target_id: targetId,
    _kind: kind ?? null,
  });


export const updateContent = (
  type: "post" | "comment",
  id: string,
  body: string,
  title?: string | null,
) => rpc<null>("community_update_content", { _type: type, _id: id, _body: body, _title: title ?? null });

export const deleteContent = (type: "post" | "comment", id: string) =>
  rpc<null>("community_delete_content", { _type: type, _id: id });

export const reportContent = (type: "post" | "comment", id: string, reason?: string) =>
  rpc<null>("community_report", { _type: type, _id: id, _reason: reason ?? null });

export const recommendTool = (postId: string, attachmentId?: string | null, note?: string) =>
  rpc<null>("community_recommend_tool", {
    _post_id: postId,
    _attachment_id: attachmentId ?? null,
    _note: note ?? null,
  });

/* ---------------------------------- admin --------------------------------- */

export const adminQueue = () => rpc<AdminQueue>("community_admin_queue");

export const adminPin = (postId: string, pinned: boolean) =>
  rpc<null>("community_admin_pin", { _post_id: postId, _pinned: pinned });

export const adminSetSidebar = (postId: string, show: boolean) =>
  rpc<null>("community_admin_set_sidebar", { _post_id: postId, _show: show });

export type SidebarNotice = { id: string; title: string; body: string; created_at: string };
export const fetchSidebarNotices = () => rpc<SidebarNotice[]>("community_sidebar_notices");

export const adminReviewTool = (id: string, approve: boolean, title?: string | null) =>
  rpc<null>("community_admin_review_tool", { _id: id, _approve: approve, _title: title ?? null });

export const adminReviewReport = (id: string, action: "dismiss" | "remove") =>
  rpc<null>("community_admin_review_report", { _id: id, _action: action });

/* ------------------------------ בדיקת דופק -------------------------------- */

export type PulseOption = {
  id: string;
  label: string;
  note: string | null;
  /** null until she voted (or the poll shows results openly) */
  votes: number | null;
};

export type PulseResponse = {
  id: string;
  body: string;
  created_at: string;
  mine: boolean;
  /** true when she chose to share without her name */
  anonymous: boolean;
  author: Author | null;
  reactions: ReactionMap;
};

export type PulseCheck = {
  id: string;
  space: SpaceId;
  title: string;
  intro: string | null;
  options: PulseOption[];
  anonymous: boolean;
  multi: boolean;
  hide_results: boolean;
  followup_question: string | null;
  followup_placeholder: string | null;
  followup_anonymous: boolean;
  followup_visible: boolean;
  pinned: boolean;
  featured: boolean;
  status: "open" | "closed" | "archived";
  closes_at: string | null;
  is_open: boolean;
  my_options: string[];
  voted: boolean;
  results_visible: boolean;
  total_voters: number;
  responses: PulseResponse[];
  my_response: string | null;
  my_response_anonymous: boolean | null;
  can_moderate: boolean;
  created_at: string;
};

/** Everything an admin can configure when publishing a pulse-check. */
export type PulseInput = {
  space: SpaceId;
  title: string;
  intro?: string | null;
  options: { id: string; label: string; note?: string | null }[];
  anonymous: boolean;
  multi: boolean;
  hide_results: boolean;
  followup_question?: string | null;
  followup_placeholder?: string | null;
  followup_anonymous: boolean;
  followup_visible: boolean;
  pinned: boolean;
  featured: boolean;
  status?: "open" | "closed" | "archived";
  closes_at?: string | null;
};

const normalizePulse = (p: PulseCheck): PulseCheck => ({
  ...p,
  options: Array.isArray(p?.options) ? p.options : [],
  my_options: Array.isArray(p?.my_options) ? p.my_options : [],
  responses: (Array.isArray(p?.responses) ? p.responses : []).map((r) => ({
    ...r,
    reactions: r?.reactions ?? {},
  })),
});

/** `space` may be a space id, "all" (featured only) or null for everything. */
export const fetchPulseChecks = async (space?: SpaceId | "all" | null, includeArchived = false) =>
  ((await rpc<PulseCheck[]>("community_pulse_list", {
    _space: space ?? null,
    _all: includeArchived,
  })) ?? []).map(normalizePulse);

export const votePulse = async (id: string, options: string[]) =>
  normalizePulse(await rpc<PulseCheck>("community_pulse_vote", { _id: id, _options: options }));

export const respondPulse = async (id: string, body: string, anonymous = true) =>
  normalizePulse(
    await rpc<PulseCheck>("community_pulse_respond", {
      _id: id,
      _body: body,
      _anonymous: anonymous,
    }),
  );

export const savePulse = async (input: PulseInput, id?: string | null) =>
  normalizePulse(await rpc<PulseCheck>("community_pulse_upsert", { _id: id ?? null, _payload: input }));

export const setPulseState = async (
  id: string,
  patch: { pinned?: boolean; featured?: boolean; status?: "open" | "closed" | "archived" },
) =>
  normalizePulse(
    await rpc<PulseCheck>("community_pulse_admin_set", {
      _id: id,
      _pinned: patch.pinned ?? null,
      _featured: patch.featured ?? null,
      _status: patch.status ?? null,
    }),
  );

export const removePulseResponse = (id: string) =>
  rpc<null>("community_pulse_remove_response", { _id: id });

export const deletePulse = (id: string) => rpc<null>("community_pulse_delete", { _id: id });

/* ---------------------------------- files --------------------------------- */

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/community-files`;

const authHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not_signed_in");
  return { Authorization: `Bearer ${token}` };
};

/** Uploads one file to the private community bucket and returns attachment fields. */
export const uploadFile = async (file: File): Promise<NewAttachment> => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(FN_URL, { method: "POST", headers: await authHeaders(), body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "upload_failed");
  return {
    kind: json.kind as AttachmentKind,
    title: json.title as string,
    meta: json.meta as string,
    storage_path: json.storage_path as string,
  };
};

/** Short-lived signed link for a stored attachment / tool file. */
export const fileUrl = async (ref: { attachmentId?: string; toolId?: string }) => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ attachment_id: ref.attachmentId, tool_id: ref.toolId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "download_failed");
  return json.url as string;
};

/** Opens an attachment: external links directly, stored files through a signed url. */
export const openAttachment = async (a: { url: string | null; has_file: boolean; id: string }) => {
  if (a.url) {
    window.open(a.url, "_blank", "noopener,noreferrer");
    return;
  }
  if (a.has_file) window.open(await fileUrl({ attachmentId: a.id }), "_blank", "noopener,noreferrer");
};
