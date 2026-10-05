/**
 * Client API for ההשתדלות היומית — one boy, chosen by the server, once a day.
 * All reads/writes go through security-definer RPCs; the client never chooses.
 */
import { supabase } from "@/integrations/supabase/client";
import type { BaarBoyProfile } from "./baar";

const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args ?? {});
  if (error) throw error;
  return data as T;
};

export type DailyFilterKind = "age" | "ethnicity" | "dress_style";
export type DailyCadence = "daily" | "every_other_day" | "muted";

export type DailyState = {
  authorized: boolean;
  active: boolean;
  hidden: boolean;
  cadence: DailyCadence;
  min_age: number | null;
  max_age: number | null;
  last_shown_date: string | null;
  filter_kind: DailyFilterKind | null;
  filter_value: string | null;
  today: {
    exposure_id: string;
    boy_id: string;
    response: "maybe" | "friend" | "info" | "contact" | "not_now" | null;
    unavailable: boolean;
    boy: BaarBoyProfile | null;
  } | null;
};

export type DailyPick =
  | { status: "ok"; exposure_id: string; boy: BaarBoyProfile }
  | { status: "filter_empty" }
  | { status: "empty" }
  | { status: "unavailable"; exposure_id: string };

export type DailyResponse = "maybe" | "friend" | "info" | "contact" | "not_now";

export const fetchDailyState = () => rpc<DailyState>("baar_daily_state");

export const pickDailyBoy = (ignoreFilter = false) =>
  rpc<DailyPick>("baar_daily_pick", { _ignore_filter: ignoreFilter });

export const respondDaily = (exposureId: string, response: DailyResponse) =>
  rpc<void>("baar_daily_respond", { _exposure_id: exposureId, _response: response });

export const setDailySettings = (
  active: boolean,
  filterKind: DailyFilterKind | null,
  filterValue: string | null,
) =>
  rpc<void>("baar_daily_settings_set", {
    _active: active,
    _filter_kind: filterKind,
    _filter_value: filterValue,
  });

export const setDailyPreferences = (cadence: DailyCadence, filterKind: DailyFilterKind | null, filterValue: string | null, minAge: number | null, maxAge: number | null, hidden = false) =>
  rpc<void>("baar_daily_preferences_set", {
    _cadence: cadence, _filter_kind: filterKind, _filter_value: filterValue,
    _min_age: minAge, _max_age: maxAge, _hidden: hidden,
  });

export const sendDailyCardChat = (boyId: string, toUser: string, body: string) =>
  rpc<{ ok: boolean; thread_id: string }>("baar_daily_send_chat", {
    _boy_id: boyId,
    _to_user: toUser,
    _body: body,
  });

/** Email share goes through an edge function — the RPC layer never sends mail. */
export const sendDailyCardEmail = async (boyId: string, toEmail: string, message: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("not_signed_in");
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/baar-daily-share`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ boyId, toEmail, message }),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error((payload as { error?: string }).error || `email_failed_${res.status}`);
  }
  return (await res.json()) as { ok: boolean; sent: boolean };
};

/** Friendly error text in her words, per failure mode. */
export const dailyErrorText = (raw: string) =>
  /paused/i.test(raw)
    ? "ההשתדלות היומית מושהית אצלך. אפשר להפעיל אותה מחדש בהגדרות."
    : /limit_reached/i.test(raw)
      ? "כבר שלחת את הכרטיס הזה כמה פעמים — נגביל את זה כדי שהפרטיות תישמר 💗"
      : /self_send/i.test(raw)
        ? "כתובת המייל הזאת היא שלך — אפשר לשלוח רק לחברה אחרת."
        : /bad_email|invalid/i.test(raw)
          ? "נראה שכתובת המייל לא תקינה. אפשר לנסות שוב."
          : /not_today_card/i.test(raw)
            ? "הכרטיס הזה כבר לא הכרטיס של היום. אפשר לפתוח את ההשתדלות מחדש."
            : "משהו לא עבד כרגע. אפשר לנסות שוב בעוד רגע.";
