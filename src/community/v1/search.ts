/**
 * חיפוש אחד לכל ליבה.
 *
 * Everything runs through one security-definer function on the server
 * (community_global_search) so permissions are enforced there — הבאר results
 * are simply never returned to a woman without baar access, not hidden in UI.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SpaceId } from "./spaces";

export type SearchKind = "posts" | "inquiries" | "boys" | "places" | "events";

export type SearchPost = {
  id: string;
  space: SpaceId;
  title: string | null;
  body: string;
  created_at: string;
};

export type SearchInquiry = {
  id: string;
  boy_name: string;
  age: number | null;
  city: string | null;
  yeshiva: string | null;
  background: string | null;
  info_types: string[] | null;
  status: string;
  created_at: string;
};

export type SearchBoy = {
  id: string;
  full_name: string;
  age: number | null;
  city: string | null;
  status: string | null;
  ethnicity: string | null;
  has_recommendation: boolean;
};

export type SearchPlace = {
  id: string;
  name: string;
  kind: string | null;
  area: string | null;
  kashrut: string | null;
  crowd_level: number | null;
};

export type SearchEvent = {
  id: string;
  slug: string | null;
  title: string;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  city: string | null;
};

export type SearchGroup<T> = { total: number; items: T[] };

export type SearchResults = {
  authorized: boolean;
  baarAccess: boolean;
  groups: {
    posts?: SearchGroup<SearchPost>;
    inquiries?: SearchGroup<SearchInquiry>;
    boys?: SearchGroup<SearchBoy>;
    places?: SearchGroup<SearchPlace>;
    events?: SearchGroup<SearchEvent>;
  };
};

export const KIND_LABEL: Record<SearchKind, string> = {
  posts: "שיחות ודיונים",
  inquiries: "בירורים",
  boys: "הבאר",
  places: "ליד הבאר",
  events: "אירועים",
};

/** the order the groups are shown in */
export const KIND_ORDER: SearchKind[] = ["posts", "inquiries", "boys", "places", "events"];

export const searchLiba = async (
  q: string,
  opts: { kind?: SearchKind | null; limit?: number; offset?: number } = {},
): Promise<SearchResults> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("community_global_search", {
    _q: q,
    _kind: opts.kind ?? null,
    _limit: opts.limit ?? 5,
    _offset: opts.offset ?? 0,
  });
  if (error) throw error;
  const r = (data ?? {}) as { authorized?: boolean; baar_access?: boolean; groups?: SearchResults["groups"] };
  return {
    authorized: !!r.authorized,
    baarAccess: !!r.baar_access,
    groups: r.groups ?? {},
  };
};

export const totalResults = (r: SearchResults) =>
  KIND_ORDER.reduce((sum, k) => sum + (r.groups[k]?.total ?? 0), 0);

/* ----------------------------- recent searches ---------------------------- */
/** kept only on her own device — never sent anywhere, never shown to others */
const RECENT_KEY = "achotikala.liba.recent-searches";

export const recentSearches = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
};

export const rememberSearch = (q: string): string[] => {
  const term = q.trim();
  if (term.length < 2) return recentSearches();
  const next = [term, ...recentSearches().filter((x) => x !== term)].slice(0, 6);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private browsing — nothing to keep */
  }
  return next;
};

export const forgetSearch = (q: string): string[] => {
  const next = recentSearches().filter((x) => x !== q);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* quiet */
  }
  return next;
};

export const clearSearches = () => {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* quiet */
  }
};

/* --------------------------------- links ---------------------------------- */

export const postLink = (p: SearchPost) => `/liba?post=${p.id}`;
export const inquiryLink = (i: SearchInquiry) =>
  `/liba?birurim=1&q=${encodeURIComponent(i.boy_name)}`;
export const boyLink = (b: SearchBoy) => `/liba/baar?boy=${b.id}`;
export const placeLink = (p: SearchPlace) => `/liba/mekomot?place=${p.id}`;
export const eventLink = (e: SearchEvent) => `/events#event-${e.id}`;
