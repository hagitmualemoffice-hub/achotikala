/**
 * Client API for "מקומות לדייטים" — the places database inside ליבה.
 * Every read/write goes through security-definer RPCs that check ליבה membership,
 * so nothing here can be reached by someone who is not a member.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Author } from "./api";

const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args ?? {});
  if (error) throw error;
  return data as T;
};

export const AREA_OPTIONS = ["ירושלים", "מרכז", "אחר"] as const;
export const KIND_OPTIONS = ["בית קפה", "פתוח", "משולב", "מלון", "אטרקציה"] as const;
export const KASHRUT_OPTIONS = ["מהדרין", 'בד"ץ', "רבנות", "לא רלוונטי"] as const;

export const REPORT_REASONS = [
  "המקום נסגר",
  "פרטים לא מעודכנים",
  "לא מתאים לדייטים",
  "כפילות במאגר",
  "אחר",
] as const;

export type PlacesAccessState =
  | { authenticated: boolean; authorized: false }
  | {
      authenticated: true;
      authorized: true;
      is_admin: boolean;
      my_places: number;
      total_places: number;
      pending_reports: number;
      pending_suggestions: number;
      areas: string[];
      kinds: string[];
      kashrut_values: string[];
    };

export type PlaceCard = {
  id: string;
  name: string;
  kind: string | null;
  area: string | null;
  address: string | null;
  kashrut: string | null;
  crowd_level: number | null;
  transit: boolean | null;
  min_payment: boolean | null;
  loved_note: string | null;
  image_url: string | null;
  mine: boolean;
  saved: boolean;
  created_at: string;
};

export type PlaceDetail = PlaceCard & {
  details: string | null;
  link: string | null;
  extra: Record<string, unknown>;
  source: string;
  can_edit: boolean;
  updated_at: string;
  added_by: Author | null;
};

export type PlaceFilters = {
  query?: string;
  kind?: string;
  area?: string;
  kashrut?: string;
  transit?: boolean;
  noMinPayment?: boolean;
  maxCrowd?: number | null;
  savedOnly?: boolean;
  mineOnly?: boolean;
  sort?: "recent" | "name" | "quiet";
};

export type PlaceInput = {
  name: string;
  kind: string;
  area: string;
  address?: string | null;
  kashrut?: string | null;
  crowd_level?: number | null;
  transit?: boolean | null;
  min_payment?: boolean | null;
  loved_note?: string | null;
  details?: string | null;
  link?: string | null;
  image_url?: string | null;
};

export const placesBootstrap = async (): Promise<PlacesAccessState> => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { authenticated: false, authorized: false };
  try {
    return await rpc<PlacesAccessState>("places_bootstrap");
  } catch (e) {
    /* Expired/revoked token: the call reached the DB as anon, which has no
       EXECUTE grant. Treat it as "not signed in" so the page asks to sign in
       instead of showing a load failure. */
    const err = e as { code?: string; message?: string };
    if (err?.code === "42501" || /permission denied/i.test(err?.message ?? "")) {
      return { authenticated: false, authorized: false };
    }
    throw e;
  }
};

export const fetchPlaces = (
  filters: PlaceFilters,
  limit: number,
  offset: number,
): Promise<{ items: PlaceCard[]; total: number }> =>
  rpc("places_list", {
    _query: filters.query?.trim() || null,
    _kind: filters.kind || null,
    _area: filters.area || null,
    _kashrut: filters.kashrut || null,
    _transit: filters.transit ?? null,
    _no_min_payment: filters.noMinPayment ?? null,
    _max_crowd: filters.maxCrowd ?? null,
    _saved_only: filters.savedOnly ?? null,
    _mine_only: filters.mineOnly ?? null,
    _sort: filters.sort ?? "recent",
    _limit: limit,
    _offset: offset,
  });

export const fetchPlace = (id: string) => rpc<PlaceDetail>("places_detail", { _place_id: id });

export const findSimilarPlaces = (name: string, excludeId?: string | null) =>
  rpc<{ id: string; name: string; area: string | null; kind: string | null }[]>(
    "places_find_similar",
    { _name: name, _exclude_id: excludeId ?? null },
  );

const inputArgs = (input: PlaceInput) => ({
  _name: input.name,
  _kind: input.kind,
  _area: input.area,
  _address: input.address ?? null,
  _kashrut: input.kashrut ?? null,
  _crowd_level: input.crowd_level ?? null,
  _transit: input.transit ?? null,
  _min_payment: input.min_payment ?? null,
  _loved_note: input.loved_note ?? null,
  _details: input.details ?? null,
  _link: input.link ?? null,
  _image_url: input.image_url ?? null,
});

export const createPlace = (input: PlaceInput) => rpc<string>("places_create", inputArgs(input));

export const updatePlace = (id: string, input: PlaceInput) =>
  rpc<void>("places_update", { _place_id: id, ...inputArgs(input) });

export const archivePlace = (id: string, active = false) =>
  rpc<void>("places_set_active", { _place_id: id, _active: active });

export const togglePlaceSave = (id: string) => rpc<boolean>("places_toggle_save", { _place_id: id });

export const fetchSavedPlaces = () =>
  rpc<{
    authorized: boolean;
    items: { id: string; name: string; kind: string | null; area: string | null; address: string | null; saved_at: string }[];
  }>("places_saved_list");

export const reportPlace = (id: string, reason: string, details?: string) =>
  rpc<void>("places_report", { _place_id: id, _reason: reason, _details: details ?? null });

export const suggestPlaceUpdate = (id: string, details: string) =>
  rpc<void>("places_suggest", { _place_id: id, _details: details });

export const fetchPlacesAdminQueue = () =>
  rpc<{
    reports: { id: string; place_id: string; place_name: string; reason: string; details: string | null; created_at: string }[];
    suggestions: { id: string; place_id: string; place_name: string; details: string; created_at: string }[];
  }>("places_admin_queue");

export const resolvePlacesQueueItem = (kind: "report" | "suggestion", id: string, status: "handled" | "dismissed") =>
  rpc<void>("places_admin_resolve", { _kind: kind, _id: id, _status: status });

/** the friendly Hebrew reason behind a failed save */
export const placeErrorText = (error: unknown): string => {
  const raw = (error as { message?: string })?.message ?? "";
  if (raw.includes("name_required")) return "צריך למלא את שם המקום.";
  if (raw.includes("kind_required")) return "צריך לבחור סוג מקום.";
  if (raw.includes("area_required")) return "צריך לבחור אזור.";
  if (raw.includes("reason_required")) return "צריך לבחור סיבה לדיווח.";
  if (raw.includes("details_required")) return "צריך לכתוב לנו מה לעדכן (לפחות כמה מילים).";
  if (raw.includes("too_many_places")) return "הוספת הרבה מקומות בזמן קצר. אפשר להמשיך בעוד שעה.";
  if (raw.includes("not_authorized")) return "אין לך הרשאה לפעולה הזו.";
  return "משהו לא הסתדר בשמירה. אפשר לנסות שוב.";
};
