/**
 * Reactions in the community — independent of each other.
 * The database keys stay as they were, so every existing reaction keeps counting.
 */
import type { ReactionKind } from "./api";

export type PostReaction = { kind: ReactionKind; label: string; emoji: string; heart?: boolean };

export const POST_REACTIONS: PostReaction[] = [
  { kind: "heart", label: "לב", emoji: "❤️", heart: true },
  { kind: "like", label: "לייק", emoji: "👍" },
  { kind: "happy", label: "מצחיק", emoji: "😂" },
  { kind: "sad", label: "עצוב", emoji: "😢" },
  { kind: "excited", label: "מתרגשת", emoji: "🤩" },
  { kind: "hug", label: "חיבוק", emoji: "🤗" },
  { kind: "wow", label: "נדהמת", emoji: "😮" },
  { kind: "pray", label: "נגעת בי", emoji: "🙏" },
  { kind: "useful", label: "עזרת לי", emoji: "💡" },
  { kind: "me_too", label: "גם אני", emoji: "🙋‍♀️" },
];

/** Three faces always visible. */
export const QUICK_REACTIONS = POST_REACTIONS.filter((r) =>
  ["heart", "like", "happy"].includes(r.kind),
);

/** The rest of the faces, inside a small panel that opens. */
export const MORE_REACTIONS = POST_REACTIONS.filter((r) =>
  ["sad", "excited", "hug", "wow"].includes(r.kind),
);

/** Three expressive actions, shown as gentle outlined buttons. */
export const TEXT_REACTIONS = POST_REACTIONS.filter((r) =>
  ["pray", "useful", "me_too"].includes(r.kind),
);

export const reactionByKind = (kind: ReactionKind) =>
  POST_REACTIONS.find((r) => r.kind === kind) ?? POST_REACTIONS[0];

/* --------------------------- free-choice emojis ---------------------------- */

/** Reactions a woman picked herself are stored as "emoji:<char>". */
export const EMOJI_PREFIX = "emoji:";

export const isEmojiKind = (kind: string) => kind.startsWith(EMOJI_PREFIX);

export const emojiOfKind = (kind: string) => kind.slice(EMOJI_PREFIX.length);

export const emojiKind = (emoji: string) => `${EMOJI_PREFIX}${emoji}`;

/** Label for any reaction, drawn or free-choice. */
export const reactionLabel = (kind: string) =>
  isEmojiKind(kind) ? emojiOfKind(kind) : reactionByKind(kind as ReactionKind).label;
