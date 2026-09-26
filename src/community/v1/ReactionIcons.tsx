/**
 * The Achoti Kala reaction family — one single style everywhere.
 *
 * Every reaction, whether it is one of ours or an emoji a woman picked herself,
 * is drawn with the same lively emoji glyph, so a reaction always looks the
 * same in the picker, in the summary and in the "who reacted" sheet.
 */
import type { ReactionKind } from "./api";
import { emojiOfKind, isEmojiKind, reactionByKind } from "./reactions";

/** the emoji is sized to the box the caller asked for (h-4, h-[19px], …) */
const boxFontSize = (cls: string) => {
  const px = cls.match(/h-\[(\d+(?:\.\d+)?)px\]/);
  if (px) return `${Number(px[1]) * 0.95}px`;
  const step = cls.match(/(?:^|\s)h-(\d+(?:\.\d+)?)(?:\s|$)/);
  if (step) return `${Number(step[1]) * 4 * 0.95}px`;
  return "17px";
};

interface Props {
  kind: ReactionKind;
  className?: string;
  /** the heart stays open until the woman herself chose a heart */
  filled?: boolean;
}

export const ReactionIcon = ({ kind, className = "h-5 w-5", filled = true }: Props) => {
  const glyph = isEmojiKind(kind)
    ? emojiOfKind(kind)
    : kind === "heart" && !filled
      ? "🤍"
      : reactionByKind(kind).emoji;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`}
      style={{ fontSize: boxFontSize(className) }}
      role="img"
    >
      {glyph}
    </span>
  );
};

export default ReactionIcon;
