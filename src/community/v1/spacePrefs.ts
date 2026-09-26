/**
 * העדכונים שלי + מאסטריות — one small API over the per-space preferences.
 *
 * Everything lives in community_space_prefs and is only ever read/written
 * through security-definer RPCs that answer about the caller herself.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SpaceId } from "./spaces";

const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export type EmailFreq = "each" | "daily" | "weekly" | "none";
/** how a מאסטרית wants to hear about a new question in her space */
export type MasteritMode = "each_both" | "each_app" | "daily" | "weekly";

export type SpacePref = {
  space: SpaceId | string;
  in_app: boolean;
  email_freq: EmailFreq;
  masterit: boolean;
  masterit_in_app: boolean;
  masterit_email_freq: EmailFreq;
  masterit_since: string | null;
  masterit_count: number;
};

export type SpacePrefsState = { authorized: boolean; spaces: SpacePref[] };

const normalize = (raw: unknown): SpacePrefsState => {
  const r = (raw ?? {}) as { authorized?: boolean; spaces?: SpacePref[] };
  return {
    authorized: !!r.authorized,
    spaces: (r.spaces ?? []).map((s) => ({
      ...s,
      masterit_count: Number(s.masterit_count ?? 0),
    })),
  };
};

export const fetchSpacePrefs = async (): Promise<SpacePrefsState> =>
  normalize(await rpc("community_space_prefs"));

export const setSpacePref = async (
  space: string,
  patch: { inApp?: boolean; emailFreq?: EmailFreq },
): Promise<SpacePrefsState> =>
  normalize(
    await rpc("community_set_space_pref", {
      _space: space,
      _in_app: patch.inApp ?? null,
      _email_freq: patch.emailFreq ?? null,
    }),
  );

export const setMasterit = async (
  space: string,
  on: boolean,
  mode: MasteritMode = "each_app",
): Promise<SpacePrefsState> =>
  normalize(await rpc("community_set_masterit", { _space: space, _on: on, _mode: mode }));

/* --------------------------------- labels --------------------------------- */

export const EMAIL_FREQ_LABEL: Record<EmailFreq, string> = {
  each: "כל פרסום חדש",
  daily: "סיכום יומי",
  weekly: "סיכום שבועי",
  none: "לא לקבל במייל",
};

export const MASTERIT_MODES: { key: MasteritMode; label: string; note: string }[] = [
  { key: "each_both", label: "כל פרסום חדש", note: "בתוך ליבה וגם במייל" },
  { key: "each_app", label: "כל פרסום חדש", note: "רק בתוך ליבה" },
  { key: "daily", label: "סיכום יומי", note: "מייל אחד ביום עם כל מה שחדש" },
  { key: "weekly", label: "סיכום שבועי", note: "מייל אחד בשבוע" },
];

export const masteritMode = (p: SpacePref): MasteritMode => {
  if (p.masterit_email_freq === "daily") return "daily";
  if (p.masterit_email_freq === "weekly") return "weekly";
  if (p.masterit_email_freq === "each") return "each_both";
  return "each_app";
};

export const masteritModeLabel = (p: SpacePref) => {
  const m = MASTERIT_MODES.find((x) => x.key === masteritMode(p));
  return m ? `${m.label} · ${m.note}` : "";
};

export const emptyPref = (space: string): SpacePref => ({
  space,
  in_app: false,
  email_freq: "none",
  masterit: false,
  masterit_in_app: true,
  masterit_email_freq: "none",
  masterit_since: null,
  masterit_count: 0,
});
