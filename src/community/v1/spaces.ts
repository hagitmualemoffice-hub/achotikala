import {
  PenLine,
  Car,
  Wallet,
  MessagesSquare,
  Flame,
  Sparkles,
  Flower2,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export type SpaceId =
  | "writing"
  | "car"
  | "finance"
  | "discussions"
  | "shabbat"
  | "spiritual"
  | "fertility"
  | "system";

export interface CommunitySpace {
  id: SpaceId;
  name: string;
  shortName: string;
  tagline: string;
  icon: LucideIcon;
  /** CSS variable name holding the space accent hue */
  accent: string;
}

export const SPACES: CommunitySpace[] = [
  {
    id: "system",
    name: "הודעות מערכת",
    shortName: "הודעות מערכת",
    tagline: "עדכונים והודעות מהנהלת ליבה",
    icon: Megaphone,
    accent: "--space-system",
  },
  {
    id: "discussions",
    name: "קבוצת דיונים",
    shortName: "קבוצת דיונים",
    tagline: "שיחה פתוחה על מה שעל הלב",
    icon: MessagesSquare,
    accent: "--space-discussions",
  },
  {
    id: "writing",
    name: "שיתוף כתיבה",
    shortName: "שיתוף כתיבה",
    tagline: "מילים שנכתבו כאן בפעם הראשונה",
    icon: PenLine,
    accent: "--space-writing",
  },
  {
    id: "shabbat",
    name: "שבתות וחגים",
    shortName: "שבתות וחגים",
    tagline: "אירוח, טיפים, מחשבות",
    icon: Flame,
    accent: "--space-shabbat",
  },
  {
    id: "car",
    name: "רכב",
    shortName: "רכב",
    tagline: "רישיון, קנייה, מוסכים וכל מה שבדרך",
    icon: Car,
    accent: "--space-car",
  },
  {
    id: "spiritual",
    name: "חיזוק רוחני",
    shortName: "חיזוק רוחני",
    tagline: "אמונה, תפילה וכוח מהמקום הפנימי",
    icon: Sparkles,
    accent: "--space-spiritual",
  },
  {
    id: "fertility",
    name: "שימור פוריות",
    shortName: "שימור פוריות",
    tagline: "מידע, ניסיון וליווי הדדי",
    icon: Flower2,
    accent: "--space-fertility",
  },
  {
    id: "finance",
    name: "פיננסים",
    shortName: "פיננסים",
    tagline: "דירות, חיסכון והשקעות",
    icon: Wallet,
    accent: "--space-finance",
  },
];

export const spaceById = (id: SpaceId) =>
  SPACES.find((s) => s.id === id) ?? SPACES.find((s) => s.id === "discussions")!;

/** only admins may publish in הודעות מערכת — set once Liba's bootstrap knows who she is */
let libaAdmin = false;
export const setLibaAdmin = (v: boolean) => {
  libaAdmin = v;
};
export const isLibaAdmin = () => libaAdmin;
export const postableSpaces = () => (libaAdmin ? SPACES : SPACES.filter((s) => s.id !== "system"));

export const accentBg = (space: CommunitySpace, alpha = 0.12) =>
  `hsl(var(${space.accent}) / ${alpha})`;

export const accentColor = (space: CommunitySpace) => `hsl(var(${space.accent}))`;
