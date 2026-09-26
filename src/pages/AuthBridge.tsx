import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

/**
 * גשר התחברות עבור גרסת האופליין (file://), שבה Google OAuth לא יכול לרוץ ישירות.
 * החלון המקומי פותח את הדף הזה בדפדפן עם nonce, כאן מתבצעת ההתחברות עם Google,
 * ובסיום נשלח ה-session בחזרה לחלון שפתח אותנו (window.opener) יחד עם אותו nonce.
 */
const AuthBridge = () => {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const started = useRef(false);
  const nonce = new URLSearchParams(window.location.search).get("nonce") || "";

  const sendBack = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return false;
    const payload = {
      type: "achotikala-auth",
      nonce,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
    try {
      window.opener?.postMessage(payload, "*");
    } catch {
      /* ignore */
    }
    setStatus("done");
    setTimeout(() => {
      try {
        window.close();
      } catch {
        /* ignore */
      }
    }, 1200);
    return true;
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void sendBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async () => {
    setStatus("working");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth-bridge?nonce=${encodeURIComponent(nonce)}`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      if (!(await sendBack())) setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-background px-6 text-center"
    >
      <div className="max-w-sm space-y-4">
        <h1 className="text-xl font-medium">התחברות עם Google</h1>
        {status === "done" ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            התחברת בהצלחה. אפשר לסגור את החלון הזה ולחזור לאחותי כלה.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ההתחברות נעשית כאן, ומיד אחר כך חוזרים אוטומטית לחלון שממנו הגעת.
            </p>
            <Button onClick={signIn} disabled={status === "working"} className="w-full h-12 rounded-2xl">
              {status === "working" && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              התחברות עם Google
            </Button>
            {status === "error" && (
              <p className="text-sm text-destructive">
                משהו לא עבד. אפשר לנסות שוב או להתחבר עם קוד לאימייל.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default AuthBridge;
