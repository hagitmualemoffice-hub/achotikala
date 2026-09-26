import type { OfflineContent } from "./contentTypes";

/**
 * Cache for the downloaded content file.
 * localStorage for small payloads, IndexedDB when new media pushes it over the
 * ~4MB localStorage limit. Every failure is silent — the app must always open.
 */
const LS_KEY = "achotikala.offline.content";
const DB_NAME = "achotikala-offline";
const STORE = "content";
const IDB_KEY = "latest";
const LS_LIMIT = 3_500_000;

export const isContent = (v: unknown): v is OfflineContent =>
  !!v && typeof v === "object" && typeof (v as OfflineContent).contentVersion === "number";

export const readLocalCache = (): OfflineContent | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isContent(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const openDb = () =>
  new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

export const readIdbCache = async (): Promise<OfflineContent | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(isContent(req.result) ? (req.result as OfflineContent) : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

export const writeCache = async (content: OfflineContent) => {
  const raw = JSON.stringify(content);
  if (raw.length < LS_LIMIT) {
    try {
      localStorage.setItem(LS_KEY, raw);
      return;
    } catch {
      /* fall through to IndexedDB */
    }
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE, "readwrite").objectStore(STORE).put(content, IDB_KEY);
  } catch {
    /* out of quota — keep working in memory */
  }
};
