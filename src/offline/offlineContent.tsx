import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import bundled from "./bundledContent.json";
import type { OfflineContent, UpdateSource, UpdateStatus } from "./contentTypes";
import { isContent, readIdbCache, readLocalCache, writeCache } from "./contentCache";
import { setRuntimeMedia } from "./runtimeMedia";

/** True only in the downloadable Offline build (see vite.offline.config.ts). */
export const IS_OFFLINE_BUILD = import.meta.env.VITE_OFFLINE_BUILD === "1";

const CHECKED_KEY = "achotikala.offline.lastCheck";

declare global {
  interface Window {
    /** Editable in update-config.js next to index.html — no rebuild needed. */
    ACHOTIKALA_UPDATE_SOURCES?: UpdateSource[];
  }
}

const bundledContent = bundled as OfflineContent;

/**
 * NetFree-friendly source URLs:
 * The installed app reads only the project's first-party content endpoint.
 */
const sourceUrl = (s: UpdateSource) => s.url;

/** Tries every configured source in order; resolves null when none is reachable. */
export async function fetchRemoteContent(
  sources: UpdateSource[],
): Promise<{ content: OfflineContent; source: UpdateSource } | null> {
  for (const s of sources) {
    try {
      const url = sourceUrl(s);
      const bust = `${url.includes("?") ? "&" : "?"}_=${Date.now()}`;
      const res = await fetch(url + bust, { cache: "no-store" });
      if (!res.ok) continue;
      const json: unknown = await res.json();
      // The fixed Google update file contains the app bundle and its content.
      // Keep accepting the old standalone content shape for existing installs.
      const candidate =
        json && typeof json === "object" && "content" in json
          ? (json as { content?: unknown }).content
          : json;
      if (isContent(candidate)) return { content: candidate, source: s };
    } catch {
      /* blocked / offline — try the next source silently */
    }
  }
  return null;
}

type Ctx = {
  content: OfflineContent;
  status: UpdateStatus;
  lastCheck: string | null;
  checkForUpdates: () => Promise<void>;
  importContent: (file: File) => Promise<boolean>;
};

const OfflineContentContext = createContext<Ctx | null>(null);

export const OfflineContentProvider = ({ children }: { children: React.ReactNode }) => {
  const [content, setContent] = useState<OfflineContent>(() => {
    const cached = IS_OFFLINE_BUILD ? readLocalCache() : null;
    const initial =
      cached && cached.contentVersion >= bundledContent.contentVersion ? cached : bundledContent;
    setRuntimeMedia(initial.media);
    return initial;
  });
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [lastCheck, setLastCheck] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CHECKED_KEY);
    } catch {
      return null;
    }
  });
  const running = useRef(false);
  const versionRef = useRef(content.contentVersion);

  const apply = useCallback((next: OfflineContent) => {
    versionRef.current = next.contentVersion;
    setRuntimeMedia(next.media);
    setContent(next);
    void writeCache(next);
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setStatus("checking");
    const sources = window.ACHOTIKALA_UPDATE_SOURCES ?? [];
    const found = sources.length ? await fetchRemoteContent(sources) : null;
    if (found) {
      const stamp = new Date().toISOString();
      try {
        localStorage.setItem(CHECKED_KEY, stamp);
      } catch {
        /* ignore */
      }
      setLastCheck(stamp);
      if (found.content.contentVersion > versionRef.current) {
        apply(found.content);
        setStatus("updated");
      } else {
        setStatus("current");
      }
    } else {
      setStatus("offline");
    }
    running.current = false;
  }, [apply]);

  const importContent = useCallback(
    async (file: File) => {
      try {
        const json: unknown = JSON.parse(await file.text());
        if (!isContent(json)) return false;
        apply(json);
        setStatus("updated");
        return true;
      } catch {
        return false;
      }
    },
    [apply],
  );

  useEffect(() => {
    if (!IS_OFFLINE_BUILD) return;
    // 1. large cached payloads live in IndexedDB — load them without blocking paint
    // 2. then look for a newer content file, silently
    void (async () => {
      const idb = await readIdbCache();
      if (idb && idb.contentVersion > versionRef.current) apply(idb);
      await checkForUpdates();
    })();
    // run once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ content, status, lastCheck, checkForUpdates, importContent }),
    [content, status, lastCheck, checkForUpdates, importContent],
  );

  return <OfflineContentContext.Provider value={value}>{children}</OfflineContentContext.Provider>;
};

export const useOfflineContent = () => useContext(OfflineContentContext);

/** Content rows for the offline build (null on the normal online site). */
export function useOfflineRows<K extends "events" | "posts" | "podcast">(key: K): unknown[] | null {
  const ctx = useContext(OfflineContentContext);
  if (!IS_OFFLINE_BUILD || !ctx) return null;
  return ctx.content[key] ?? [];
}
