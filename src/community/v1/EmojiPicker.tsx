import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

/* Simple, quiet emoji picker for posts, comments and replies. */

export const COMMUNITY_EMOJIS = [
  // רגשות
  "😀", "😃", "😄", "😁", "😊", "🙂", "🥰", "😍", "🤩", "🤗",
  "😉", "😌", "🥹", "🥺", "😂", "🤣", "😅", "😇", "🤭", "🫣",
  "🤔", "🫠", "🙃", "😴", "🤒", "😢", "😭", "😞", "😔", "😟",
  "😩", "😤", "😠", "😡", "😮", "😯", "😳", "🤯", "🙈", "🫡",
  // ידיים ומחוות
  "🙏", "🙌", "👏", "👍", "👎", "💪", "🤝", "🫶", "✌️", "🤞",
  "👌", "🤲", "👋", "🫂", "🤙", "☝️", "👆", "👇", "👉", "👈",
  // לבבות
  "❤️", "🩷", "🧡", "💛", "💚", "💙", "🩵", "💜", "🤎", "🖤",
  "🩶", "🤍", "💗", "💖", "💕", "💞", "💓", "💝", "💘", "💟",
  "❣️", "❤️‍🔥", "❤️‍🩹", "💔", "💋", "💌", "💐", "🌹", "🎀", "🧸",
  // חיים ותנועה
  "💃", "🕺", "🤸‍♀️", "🏃‍♀️", "🚶‍♀️", "🧘‍♀️", "🎉", "🎊", "🎈", "🥳",
  "✨", "🌟", "⭐", "💫", "⚡", "🔥", "🌈", "☀️", "🌤️", "🌙",
  // פרחים וטבע
  "🌸", "🌷", "🌻", "🌺", "🪷", "🌼", "🌱", "🌿", "🍀", "🌳",
  "🦋", "🐦", "🕊️", "🐞", "🐝", "🌊", "🪻", "🍁", "🌾", "🌵",
  // אוכל ופינוקים
  "☕", "🫖", "🍵", "🍰", "🧁", "🍫", "🍓", "🍒", "🍉", "🍋",
  "🍯", "🥗", "🥐", "🍪", "🍩", "🍦", "🍬", "🥂", "🍷", "🧋",
  // כלים
  "💡", "✍️", "💬", "📌", "📍", "📅", "⏰", "✅", "❌", "❓",
  "🚗", "🚌", "✈️", "💰", "🏡", "🎁", "🛍️", "🧺", "🚪", "🔑",
  "🎵", "🎶", "📚", "📖", "🖊️", "🧩", "🧿", "🪄", "🕯️", "📞",
];

/** Inserts an emoji at the caret position inside a textarea. */
export function insertAtCursor(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  value: string,
  emoji: string,
  set: (v: string) => void,
) {
  if (!el) {
    set(value + emoji);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? start;
  set(value.slice(0, start) + emoji + value.slice(end));
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + emoji.length;
    el.setSelectionRange(pos, pos);
  });
}

interface Props {
  onPick: (emoji: string) => void;
  size?: "md" | "sm";
  label?: string;
  defaultOpen?: boolean;
}

export default function EmojiPicker({ onPick, size = "md", label, defaultOpen }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="הוספת אימוג'י"
        title="הוספת אימוג'י"
        className={`inline-flex items-center gap-1.5 rounded-full transition-colors ${
          size === "md" ? "px-2.5 py-1.5" : "p-1.5"
        } ${open ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-primary/[0.07] hover:text-primary"}`}
      >
        <Smile className={size === "md" ? "h-3.5 w-3.5" : "h-3.5 w-3.5"} />
        {label && <span className="font-light">{label}</span>}
      </button>

      {open && (
        <span className="absolute bottom-full start-0 z-30 mb-2 block max-h-[320px] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-border/70 bg-card p-2.5 shadow-[var(--shadow-card)]">
          <span className="grid grid-cols-8 gap-1 sm:grid-cols-10">
            {COMMUNITY_EMOJIS.map((e, index) => (
              <button
                key={`${e}-${index}`}
                type="button"
                onClick={() => {
                  onPick(e);
                  setOpen(false);
                }}
                className="grid aspect-square place-items-center rounded-lg text-[19px] leading-none transition-colors hover:bg-primary/[0.08]"
              >
                {e}
              </button>
            ))}
          </span>
          <span className="mt-1.5 block px-1.5 pb-0.5 text-[10.5px] font-light text-muted-foreground">
            אפשר גם להקליד אימוג׳י ישירות.
          </span>
        </span>
      )}
    </span>
  );
}
