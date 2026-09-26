/**
 * She only needs to be checked once.
 *
 * Every gated area (הבאר · ליד הבאר · דירות) used to show
 * "בודקות את ההרשאה שלך…" on every single entrance, which made moving around
 * ליבה feel stuck. Once an area answered "granted" we keep that answer for the
 * until she explicitly signs out, so the next entrance opens straight away while the real
 * check runs quietly in the background. The server (RLS) is still the only
 * thing that actually decides what she may see.
 */
export type GateArea = "liba" | "baar" | "mekomot" | "dirot";

const key = (area: GateArea) => `achotikala.access.${area}`;
const MEMBER_KEY = "achotikala.community.member";

type StoredGrant<T> = { userId: string; value: T };

const rememberedUserId = () => {
  try {
    const raw = localStorage.getItem(MEMBER_KEY);
    return raw ? (JSON.parse(raw) as { userId?: string }).userId ?? null : null;
  } catch {
    return null;
  }
};

/** the granted answer from the last real check, if we still hold one */
export const cachedGrant = <T,>(area: GateArea): T | null => {
  try {
    const raw = localStorage.getItem(key(area));
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredGrant<T>;
    const userId = rememberedUserId();
    return userId && stored.userId === userId ? stored.value : null;
  } catch {
    return null;
  }
};

/** keep a granted answer (or drop it when she is no longer allowed) */
export const rememberGrant = (area: GateArea, boot: unknown | null) => {
  try {
    const userId = rememberedUserId();
    if (boot && userId) localStorage.setItem(key(area), JSON.stringify({ userId, value: boot }));
    else localStorage.removeItem(key(area));
  } catch {
    /* private mode — we'll simply check again */
  }
};

/** on sign-out nothing is remembered any more */
export const forgetAllGrants = () => {
  (["liba", "baar", "mekomot", "dirot"] as GateArea[]).forEach((a) => rememberGrant(a, null));
};
