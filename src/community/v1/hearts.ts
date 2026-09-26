/**
 * "הלב שלי בליבה" — the warm, non-competitive heart layer.
 *
 * Everything here is presentation only. The real arithmetic lives in the
 * database (a heart ledger with one row per rewarded action), so the numbers a
 * woman sees can never drift from the numbers she earned. The values below are
 * a gentle fallback for the very first render and for the offline runtime; the
 * server config always wins once it arrives.
 */

export type HeartLevel = { key: string; label: string; emoji: string; min: number };
export type HeartRule = { action: string; hearts: number; label: string };

export type HeartsState = {
  hearts: number;
  level: HeartLevel | null;
  next: HeartLevel | null;
  rules: HeartRule[];
  levels: HeartLevel[];
};

/** Mirrors public.community_heart_levels — kept in sync by the same migration. */
export const FALLBACK_LEVELS: HeartLevel[] = [
  { key: "entered", label: "נכנסת ללב", emoji: "♡", min: 0 },
  { key: "present", label: "לב נוכח", emoji: "🩷", min: 20 },
  { key: "open", label: "לב פתוח", emoji: "💗", min: 75 },
  { key: "beating", label: "לב פועם", emoji: "💓", min: 200 },
  { key: "liba", label: "הלב של ליבה", emoji: "❤️", min: 500 },
];

/** Mirrors public.community_heart_rules. */
export const FALLBACK_RULES: HeartRule[] = [
  { action: "profile_complete", hearts: 20, label: 'השלמת "תכירו אותי"' },
  { action: "post", hearts: 3, label: "פרסום פוסט" },
  { action: "comment", hearts: 2, label: "תגובה לפוסט של אחרת" },
  { action: "helpful_received", hearts: 7, label: 'קיבלת "עזרת לי"' },
  { action: "react_pray", hearts: 1, label: '"נגעת בי"' },
  { action: "react_me_too", hearts: 1, label: '"גם אני"' },
  { action: "daily_visit", hearts: 1, label: "כניסה יומית" },
  { action: "react_heart", hearts: 0, label: "לב ורוד" },
];

export const emptyHearts = (): HeartsState => ({
  hearts: 0,
  level: FALLBACK_LEVELS[0],
  next: FALLBACK_LEVELS[1],
  rules: FALLBACK_RULES,
  levels: FALLBACK_LEVELS,
});

/** Fills in anything the server did not send, so the UI never renders blanks. */
export const normalizeHearts = (raw: Partial<HeartsState> | null | undefined): HeartsState => {
  const levels = raw?.levels?.length ? raw.levels : FALLBACK_LEVELS;
  const hearts = Math.max(0, raw?.hearts ?? 0);
  const sorted = [...levels].sort((a, b) => a.min - b.min);
  return {
    hearts,
    level: raw?.level ?? [...sorted].reverse().find((l) => l.min <= hearts) ?? sorted[0],
    next: raw?.next ?? sorted.find((l) => l.min > hearts) ?? null,
    rules: raw?.rules?.length ? raw.rules : FALLBACK_RULES,
    levels: sorted,
  };
};

/** 0–1 progress inside the current level; a full heart when she reached the last one. */
export const levelProgress = (s: HeartsState) => {
  if (!s.next || !s.level) return 1;
  const span = s.next.min - s.level.min;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0.02, (s.hearts - s.level.min) / span));
};

export const heartsToNext = (s: HeartsState) => (s.next ? Math.max(0, s.next.min - s.hearts) : 0);

/** A short, human line — never "level up". */
export const growthMessage = (level: HeartLevel) =>
  level.key === "liba"
    ? "את כבר ממש חלק מהדופק של ליבה 💓"
    : `הלב שלך בליבה גדל — הגעת ל"${level.label}"`;

/** Areas a woman can offer help in. Extend freely; stored as plain tags. */
export const MASTERY_TAGS = [
  "קריירה",
  "קורות חיים",
  "לימודים",
  "טכנולוגיה",
  "עיצוב",
  "כספים",
  "רכב",
  "בירוקרטיה וזכויות",
  "שידוכים",
  "שימור פוריות",
  "בריאות",
  "בישול ואפייה",
  "טיולים",
  "ירושלים",
  "אירוח",
  "התארגנות לבית",
  "אחר",
];

const LEVEL_SEEN_KEY = "achotikala.community.heartLevel";

/**
 * Remembers the last level we already celebrated, so a growth moment appears
 * once — and never on her very first load.
 */
export const takeLevelGrowth = (level: HeartLevel | null): HeartLevel | null => {
  if (!level) return null;
  try {
    const seen = localStorage.getItem(LEVEL_SEEN_KEY);
    localStorage.setItem(LEVEL_SEEN_KEY, level.key);
    if (!seen || seen === level.key) return null;
    const order = FALLBACK_LEVELS.map((l) => l.key);
    return order.indexOf(level.key) > order.indexOf(seen) ? level : null;
  } catch {
    return null;
  }
};
