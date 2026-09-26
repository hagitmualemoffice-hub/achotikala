/**
 * Letter avatars for the community.
 *
 * Each woman gets a stable, vivid colour derived from her displayed name, so the
 * same name always looks the same everywhere. `imageUrl` is already supported,
 * so the day profile photos arrive they simply replace the letter.
 */

/** Soft, varied community palette, defined as semantic tokens in the design system. */
const PALETTE = [
  "hsl(var(--avatar-rose))",
  "hsl(var(--avatar-sage))",
  "hsl(var(--avatar-gold))",
  "hsl(var(--avatar-blue))",
  "hsl(var(--avatar-orchid))",
  "hsl(var(--avatar-olive))",
  "hsl(var(--avatar-coral))",
  "hsl(var(--avatar-lavender))",
  "hsl(var(--avatar-pink))",
  "hsl(var(--avatar-blush))",
];

/**
 * FNV-1a — spreads similar seeds (ids sharing a prefix, names sharing a first
 * letter) across the whole palette, so two women rarely get the same colour.
 */
const hash = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

export const avatarColor = (seed: string) => PALETTE[hash(seed || "?") % PALETTE.length];


export const avatarInitials = (name: string, nickname = false) => {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (nickname || words.length === 1) return Array.from(words[0])[0] ?? "?";
  return `${Array.from(words[0])[0] ?? ""}${Array.from(words.at(-1) ?? "")[0] ?? ""}` || "?";
};

type Size = "xs" | "sm" | "md" | "lg";

type AvatarContext = {
  sourceType?: "baar" | "inquiry" | "post" | "comment" | "direct";
  sourceId?: string | null;
  title?: string | null;
  subtitle?: string | null;
  link?: string | null;
};

const SIZES: Record<Size, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-[12px]",
  md: "h-11 w-11 text-[15px]",
  lg: "h-12 w-12 text-[17px]",
};

export const MemberAvatar = ({
  name,
  seed,
  size = "md",
  nickname = false,
  imageUrl,
  ring = false,
  online = false,
  userId,
  context,
  className = "",
}: {
  name: string;
  /** stable identifier (user id) — keeps the colour identical everywhere */
  seed?: string | null;
  size?: Size;
  /** posting under a nickname — marked with a soft ring, colour stays stable */
  nickname?: boolean;
  imageUrl?: string | null;
  ring?: boolean;
  online?: boolean;
  /** A verified member id makes the avatar open her shared profile. */
  userId?: string | null;
  context?: AvatarContext | null;
  className?: string;
}) => {
  const color = avatarColor(userId || seed || name);
  const avatar = imageUrl ? (
      <span className="relative block shrink-0">
        <img
          src={imageUrl}
          alt={name}
          className={`${SIZES[size]} rounded-full object-cover ${ring ? "ring-2 ring-background" : ""}`}
        />
        {online && <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-[hsl(var(--presence-online))]" title="מחוברת עכשיו" />}
      </span>
  ) : (
    <span className="relative block shrink-0">
      <span
        title={name}
        className={`flex select-none items-center justify-center rounded-full font-medium text-primary-foreground ${
          SIZES[size]
        } ${ring ? "ring-2 ring-background" : ""} ${nickname ? "ring-2 ring-background/60" : ""}`}
        style={{ backgroundColor: color }}
      >
        {avatarInitials(name, nickname)}
      </span>
      {online && <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-[hsl(var(--presence-online))]" title="מחוברת עכשיו" />}
    </span>
  );
  if (!userId) return <span className={`relative shrink-0 ${className}`}>{avatar}</span>;
  return (
    <button
      type="button"
      aria-label={`לפתיחת הפרופיל של ${name}`}
      title={`לפרופיל של ${name}`}
      onClick={(event) => {
        event.stopPropagation();
        window.dispatchEvent(
          new CustomEvent("liba:member-profile", { detail: { userId, context: context ?? null } }),
        );
      }}
      className={`relative shrink-0 rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
    >
      {avatar}
    </button>
  );
};

/** 3–5 overlapping participants, then "+N". */
export const AvatarStack = ({
  people,
  total,
  size = "xs",
  max = 5,
}: {
  people: { name: string; nickname?: boolean; seed?: string | null; imageUrl?: string | null; online?: boolean }[];
  total?: number;
  size?: Size;
  max?: number;
}) => {
  const shown = people.slice(0, max);
  const extra = Math.max(0, (total ?? people.length) - shown.length);
  if (shown.length === 0) return null;
  return (
    <span className="flex items-center">
      <span className="flex items-center">
        {shown.map((p, i) => (
          <span key={`${p.name}-${i}`} className={i === 0 ? "" : "-ms-2"}>
            <MemberAvatar
              name={p.name}
              seed={p.seed}
              imageUrl={p.imageUrl}
              nickname={p.nickname}
              size={size}
              ring
              online={p.online}
            />

          </span>
        ))}
      </span>
      {extra > 0 && (
        <span className="ms-1.5 text-[11px] font-light tabular-nums text-muted-foreground">
          +{extra}
        </span>
      )}
    </span>
  );
};

export default MemberAvatar;
