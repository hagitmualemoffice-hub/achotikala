/**
 * Unsent drafts, kept on the woman's own device.
 *
 * Everything she typed — title, body, a comment, a reply, an edit — is written to
 * local storage while she types, so leaving the composer, opening a discussion,
 * refreshing, or closing and reopening the offline folder never loses her words.
 *
 * Each draft has its own key, so two conversations can never overwrite each other.
 * A draft is removed the moment its post/comment was published successfully.
 */
import { useEffect, useRef } from "react";

const PREFIX = "achotikala.community.draft.";

export type DraftFields = Record<string, string>;

/** Stable keys — one per composer / conversation. */
export const draftKeys = {
  newPost: "post:new",
  comment: (postId: string) => `comment:${postId}`,
  reply: (commentId: string) => `reply:${commentId}`,
  editPost: (postId: string) => `edit:post:${postId}`,
  editComment: (commentId: string) => `edit:comment:${commentId}`,
};

const storage = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // private mode — drafts simply won't survive
  }
};

export const readDraft = (key: string): DraftFields | null => {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fields?: DraftFields };
    return parsed?.fields ?? null;
  } catch {
    return null;
  }
};

/** One field of a saved draft, for lazy `useState` initialisers. */
export const draftField = (key: string, field: string, fallback = "") =>
  readDraft(key)?.[field] ?? fallback;

export const writeDraft = (key: string, fields: DraftFields) => {
  const s = storage();
  if (!s) return;
  const meaningful = Object.values(fields).some((v) => (v ?? "").trim().length > 0);
  try {
    if (!meaningful) s.removeItem(PREFIX + key);
    else s.setItem(PREFIX + key, JSON.stringify({ fields, at: Date.now() }));
  } catch {
    /* storage full / blocked — typing must never break */
  }
};

const CLEARED_EVENT = "achotikala:draft-cleared";

export const clearDraft = (key: string) => {
  const s = storage();
  try {
    s?.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(CLEARED_EVENT, { detail: key }));
};

/** Lets a second composer sharing the same key reset itself after a publish. */
export const useDraftCleared = (key: string | null, onCleared: () => void) => {
  const cb = useRef(onCleared);
  cb.current = onCleared;
  useEffect(() => {
    if (!key) return;
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) cb.current();
    };
    window.addEventListener(CLEARED_EVENT, handler);
    return () => window.removeEventListener(CLEARED_EVENT, handler);
  }, [key]);
};

/**
 * Saves `fields` under `key` shortly after every change, and flushes on unmount
 * (closing the composer, navigating away) so nothing is lost mid-keystroke.
 * Pass `enabled: false` after a successful publish to avoid re-saving a stale draft.
 */
export const useDraftAutosave = (key: string | null, fields: DraftFields, enabled = true) => {
  const latest = useRef(fields);
  latest.current = fields;
  const activeKey = useRef(key);
  activeKey.current = key;
  const on = useRef(enabled);
  on.current = enabled;

  useEffect(() => {
    if (!key || !enabled) return;
    const t = window.setTimeout(() => writeDraft(key, fields), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, JSON.stringify(fields)]);

  useEffect(
    () => () => {
      if (activeKey.current && on.current) writeDraft(activeKey.current, latest.current);
    },
    [],
  );
};
