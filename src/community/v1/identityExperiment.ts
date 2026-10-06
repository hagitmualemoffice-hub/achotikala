import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type IdentityState = {
  allow_nickname_posting: boolean;
  announcement_active: boolean;
  version: number;
  needs_popup: boolean;
  full_name: string;
  has_full_name: boolean;
};
export type IdentityAdminState = IdentityState & { stats: { shown: number; responded: number; love: number; try: number; unanswered: number; dismissed: number } };
let state: IdentityState | null = null;
const listeners = new Set<() => void>();
let pending: Promise<IdentityState> | null = null;
const rpc = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as T;
};
export function publishIdentityState(value: IdentityState | null) {
  state = value;
  listeners.forEach((listener) => listener());
}
export function refreshIdentityState(): Promise<IdentityState> {
  if (pending) return pending;
  pending = rpc<IdentityState>("community_identity_state").then((value) => {
    publishIdentityState(value);
    return value;
  }).finally(() => { pending = null; });
  return pending;
}
export function useIdentityExperiment() {
  const value = useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, () => state);
  useEffect(() => {
    if (!state) void refreshIdentityState().catch(() => undefined);
  }, []);
  return { state: value, allowNickname: value?.allow_nickname_posting === true, ready: value !== null };
}
export const identityAdmin = async (allowNickname?: boolean, announcementActive?: boolean) => {
  const value = await rpc<IdentityAdminState>("community_identity_admin", {
    _allow_nickname: allowNickname ?? null,
    _announcement_active: announcementActive ?? null,
  });
  publishIdentityState(value);
  return value;
};
export const acknowledgeIdentity = (version: number, event: "shown" | "love" | "try" | "dismiss") =>
  rpc<IdentityState>("community_identity_ack", { _version: version, _event: event });

export function validatePostingIdentity(value: IdentityState, asNickname: boolean) {
  if (!value.allow_nickname_posting && asNickname) {
    throw new Error("בתקופת הניסוי ניתן לפרסם בשם המלא בלבד. בדקי את השם המוצג לפני ניסיון נוסף.");
  }
  if (!value.allow_nickname_posting && !value.has_full_name) {
    throw new Error("יש להשלים שם פרטי ושם משפחה בהגדרות החשבון לפני הפרסום.");
  }
}
export const requirePostingIdentity = async (asNickname: boolean) =>
  validatePostingIdentity(await refreshIdentityState(), asNickname);

export const identityErrorMessage = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : (error as { message?: string })?.message ?? "";
  if (/nickname_posting_disabled/.test(message)) return "בתקופת הניסוי ניתן לפרסם בשם המלא בלבד. הפרסום לא נשמר.";
  if (/full_name_required/.test(message)) return "יש להשלים שם פרטי ושם משפחה בהגדרות החשבון לפני הפרסום.";
  return /בתקופת הניסוי|יש להשלים שם/.test(message) ? message : fallback;
};