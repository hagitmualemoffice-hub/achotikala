import { useEffect, useState } from "react";

const KEY = "site_preview_mode";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "1") {
      sessionStorage.setItem(KEY, "1");
      return true;
    }
    if (params.get("preview") === "0") {
      sessionStorage.removeItem(KEY);
      return false;
    }
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

// Cache so all consumers agree within the same tab load
let cached: boolean | null = null;
export function isPreviewMode(): boolean {
  if (cached === null) cached = readInitial();
  return cached;
}

export function exitPreviewMode() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  cached = false;
  window.location.href = window.location.pathname;
}

export function usePreviewMode(): boolean {
  const [on] = useState<boolean>(() => isPreviewMode());
  useEffect(() => {
    // no-op; static per tab load
  }, []);
  return on;
}
