/**
 * "How many new?" counters for the ליבה top bar — הבאר · בירורים · דירות.
 * The last-visit moment per area lives on her device; the counting itself is
 * done server-side, so nothing is revealed to someone without באר access.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LibaArea = "baar" | "birurim" | "dirot";
export type LibaNewCounts = Record<LibaArea, number>;

const KEY = (area: LibaArea) => `achotikala.liba.seen.${area}`;
const EMPTY: LibaNewCounts = { baar: 0, birurim: 0, dirot: 0 };

const readSeen = (area: LibaArea): string | null => {
  try {
    return localStorage.getItem(KEY(area));
  } catch {
    return null;
  }
};

export const markAreaSeen = (area: LibaArea) => {
  try {
    localStorage.setItem(KEY(area), new Date().toISOString());
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("liba:area-seen", { detail: area }));
};

export const fetchLibaNewCounts = async (): Promise<LibaNewCounts> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("liba_new_counts", {
    _baar_since: readSeen("baar"),
    _birurim_since: readSeen("birurim"),
    _dirot_since: readSeen("dirot"),
  });
  if (error) throw error;
  return {
    baar: Number(data?.baar ?? 0),
    birurim: Number(data?.birurim ?? 0),
    dirot: Number(data?.dirot ?? 0),
  };
};

export const useLibaNewCounts = () => {
  const [counts, setCounts] = useState<LibaNewCounts>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      setCounts(await fetchLibaNewCounts());
    } catch {
      setCounts(EMPTY);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 180000);
    const onSeen = (event: Event) => {
      const area = (event as CustomEvent<LibaArea>).detail;
      if (area) setCounts((c) => ({ ...c, [area]: 0 }));
    };
    window.addEventListener("liba:area-seen", onSeen);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("liba:area-seen", onSeen);
    };
  }, [refresh]);

  return counts;
};
