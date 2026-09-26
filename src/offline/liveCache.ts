/**
 * "Live when online, last known-good when offline" for plain JSON content rows.
 * Everything here fails silently: reads return null, writes are best-effort,
 * and live fetches are capped by a timeout so a slow network never hangs a page.
 */
const PREFIX = "achotikala.live.";

export const readLiveCache = <T>(key: string): T[] | null => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: unknown };
    return Array.isArray(parsed?.rows) ? (parsed.rows as T[]) : null;
  } catch {
    return null;
  }
};

export const writeLiveCache = (key: string, rows: unknown[]) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: new Date().toISOString(), rows }));
  } catch {
    /* quota or private mode — keep going with what we have */
  }
};

/** Resolves to the rows, or null on error / timeout. Never rejects. */
export const fetchLiveRows = async <T>(
  run: () => PromiseLike<{ data: unknown; error: unknown }>,
  timeoutMs = 8000,
): Promise<T[] | null> => {
  try {
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
    const res = await Promise.race([Promise.resolve(run()), timeout]);
    if (!res || res.error || !Array.isArray(res.data)) return null;
    return res.data as T[];
  } catch {
    return null;
  }
};
