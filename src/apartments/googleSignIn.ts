import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { IS_OFFLINE_BUILD } from "@/offline/offlineContent";

/** התחברות עם Google מתוך התיקייה המקומית (file://) — דרך חלון גשר באתר. */
const googleOffline = () =>
  new Promise<void>((resolve, reject) => {
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const popup = window.open(
      `https://achotikala.com/auth-bridge?nonce=${encodeURIComponent(nonce)}`,
      "achotikala-auth",
      "width=520,height=680",
    );
    if (!popup) {
      reject(new Error("popup-blocked"));
      return;
    }
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearInterval(watch);
    };
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== "https://achotikala.com") return;
      const data = event.data as
        | { type?: string; nonce?: string; access_token?: string; refresh_token?: string }
        | null;
      if (!data || data.type !== "achotikala-auth" || data.nonce !== nonce) return;
      if (!data.access_token || !data.refresh_token) return;

      cleanup();
      const { error } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (error) reject(error);
      else resolve();
    };
    window.addEventListener("message", onMessage);
    const watch = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("closed"));
      }
    }, 700);
  });

/**
 * התחברות עם Google.
 * מחזירה true אם ההתחברות הושלמה, ו־false אם הדפדפן מועבר לדף של Google.
 */
export const signInWithGoogle = async (redirectPath = "/apartments"): Promise<boolean> => {
  if (IS_OFFLINE_BUILD) {
    await googleOffline();
    return true;
  }
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: `${window.location.origin}${redirectPath}`,
  });
  if (result.error) throw result.error;
  if (result.redirected) return false;
  return true;
};
