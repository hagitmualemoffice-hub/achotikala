import { supabase } from "@/integrations/supabase/client";

export type OfflineSyncState = {
  content_version: number;
  last_status: string | null;
  last_error: string | null;
  last_synced_at: string | null;
  media_count: number | null;
  size_bytes: number | null;
};

/**
 * Publishes a new content version through the project's own Offline endpoint.
 * Never throws — publishing content must not depend on it.
 */
export const syncOfflineContent = async (): Promise<{ ok: boolean; error?: string; version?: number }> => {
  try {
    const { data, error } = await supabase.functions.invoke("sync-offline-content", { body: {} });
    if (error) {
      const details =
        "context" in error && error.context instanceof Response
          ? await error.context.text()
          : error.message;
      return { ok: false, error: details };
    }
    const res = data as { ok?: boolean; error?: string; contentVersion?: number };
    return res?.ok ? { ok: true, version: res.contentVersion } : { ok: false, error: res?.error };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

export const readOfflineSyncState = async (): Promise<OfflineSyncState | null> => {
  const { data } = await supabase
    .from("offline_sync_state")
    .select("content_version,last_status,last_error,last_synced_at,media_count,size_bytes")
    .eq("id", 1)
    .maybeSingle();
  return (data as OfflineSyncState) ?? null;
};

export type OfflineAppStatus = {
  appVersion: number | null;
  publishedFingerprint: string | null;
  siteFingerprint: string;
  upToDate: boolean;
  generatedAt: string | null;
};

/**
 * Compares the code published to the Offline version with the code this site is
 * running, so a missed Offline publish can never go unnoticed.
 */
export const readOfflineAppStatus = async (): Promise<OfflineAppStatus | null> => {
  const siteFingerprint = (import.meta.env.VITE_SOURCE_FINGERPRINT as string) ?? "";
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/offline-app?manifest=1&_=${Date.now()}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const m = (await res.json()) as {
      appVersion?: number;
      sourceFingerprint?: string;
      generatedAt?: string;
    };
    return {
      appVersion: m.appVersion ?? null,
      publishedFingerprint: m.sourceFingerprint ?? null,
      siteFingerprint,
      upToDate: !!m.sourceFingerprint && m.sourceFingerprint === siteFingerprint,
      generatedAt: m.generatedAt ?? null,
    };
  } catch {
    return null;
  }
};
