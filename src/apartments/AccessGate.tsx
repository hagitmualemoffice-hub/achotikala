import { useState } from "react";
import { Loader2, Lock, LogOut, Mail, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import AccessRequestDialog from "@/apartments/AccessRequestDialog";
import { IS_OFFLINE_RUNTIME } from "@/offline/isOffline";

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path
      fill="#4285F4"
      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1a7 7 0 0 1-6.6-4.8H1.4v3.1A11.9 11.9 0 0 0 12 24z"
    />
    <path fill="#FBBC05" d="M5.4 14.4a7.1 7.1 0 0 1 0-4.6V6.7H1.4a11.9 11.9 0 0 0 0 10.7l4-3z" />
    <path
      fill="#EA4335"
      d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A11.6 11.6 0 0 0 12 0 11.9 11.9 0 0 0 1.4 6.7l4 3.1A7 7 0 0 1 12 4.8z"
    />
  </svg>
);

export type AccessState = "loading" | "anon" | "denied" | "offline" | "granted";

/**
 * לוח הדירות פתוח רק לחברות הקהילה: כתובות מרשימות התפוצה, או אישור ידני של מנהלת.
 * המסך הזה הוא שכבת הנוחות בלבד — האכיפה עצמה מתבצעת בשרת (RLS).
 */
const AccessGate = ({
  state,
  onSignIn,
  onRetry,
  offlineTitle = "לוח הדירות זמין כשיש חיבור לרשת",
  gateTitle = "הלוח מיועד לחברות הקהילה",
  requestTitle = "בקשת גישה",
}: {
  state: Exclude<AccessState, "granted">;
  onSignIn: (mode?: "google" | "code") => void;
  onRetry: () => void;
  offlineTitle?: string;
  gateTitle?: string;
  requestTitle?: string;
}) => {
  const [requestOpen, setRequestOpen] = useState(false);

  return (
    <section className="w-full px-[30px] md:px-6 pt-4 pb-10 md:py-10">
      <div className="w-full md:w-[min(1100px,82%)] mx-auto">
        <div className="rounded-[28px] border border-border/70 bg-card p-8 md:p-12 text-center">
          {state === "loading" ? (
            <>
              <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground text-sm">בודקות את ההרשאה שלך…</p>
            </>
          ) : state === "offline" ? (
            <>
              <WifiOff className="h-8 w-8 mx-auto text-muted-foreground" />
              <h2 className="mt-5 text-xl md:text-2xl font-light">{offlineTitle}</h2>
              <p className="mt-3 text-sm md:text-base text-muted-foreground font-light">
                לא הצלחנו להתחבר כרגע. אפשר לנסות שוב בעוד רגע.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <Button variant="outline" className="h-11 rounded-full px-6 font-light" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 me-2" />
                  נסי שוב
                </Button>
                <Button className="h-11 rounded-full px-6 font-light" onClick={() => setRequestOpen(true)}>
                  {requestTitle}
                </Button>
              </div>
            </>
          ) : (

            <>
              <span
                className={`h-14 w-14 rounded-2xl grid place-items-center mx-auto ${
                  state === "anon" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Lock className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <h2 className="mt-5 text-xl md:text-2xl font-light">{gateTitle}</h2>
              <p className="mt-3 text-sm md:text-base text-muted-foreground font-light leading-relaxed max-w-md mx-auto">
                {IS_OFFLINE_RUNTIME
                  ? "אם את כבר רשומה אצלנו, נשלח לך קוד לאימייל וזו הדרך להתחבר כאן."
                  : "אם את כבר רשומה אצלנו, אפשר להתחבר עם Google או עם קוד שנשלח לאימייל."}
                <br />
                אם את חלק מהקהילה אבל כתובת המייל שלך אינה רשומה אצלנו, אפשר לשלוח בקשת גישה.
              </p>

              {state === "anon" && (
                <div className="mt-6 flex flex-col items-center gap-2.5">
                  {!IS_OFFLINE_RUNTIME && (
                    <Button
                      onClick={() => onSignIn("google")}
                      className="h-12 rounded-full px-7 font-light w-full max-w-xs"
                    >
                      <GoogleMark />
                      <span className="ms-2">התחברות עם Google</span>
                    </Button>
                  )}
                  <Button
                    variant={IS_OFFLINE_RUNTIME ? "default" : "outline"}
                    onClick={() => onSignIn("code")}
                    className="h-12 rounded-full px-7 font-light w-full max-w-xs"
                  >
                    <Mail className="h-4 w-4 me-2" />
                    התחברות דרך מייל
                  </Button>
                  <p className="text-xs text-muted-foreground font-light">
                    {IS_OFFLINE_RUNTIME
                      ? "נשלח לך קוד בן 8 ספרות לאימייל"
                      : "ההתחברות דרך מייל מתאימה גם לגרסת האופליין"}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                {state !== "anon" && (
                  <Button variant="outline" className="h-11 rounded-full px-6 font-light" onClick={onRetry}>
                    <RefreshCw className="h-4 w-4 me-2" />
                    בדיקה מחדש
                  </Button>
                )}
                <Button
                  variant={state === "anon" ? "outline" : "default"}
                  className="h-11 rounded-full px-6 font-light"
                  onClick={() => setRequestOpen(true)}
                >
                  {requestTitle}
                </Button>
                {state === "denied" && (
                  <Button
                    variant="ghost"
                    className="h-11 rounded-full px-5 font-light text-muted-foreground"
                    onClick={() => supabase.auth.signOut()}
                  >
                    <LogOut className="h-4 w-4 me-2" />
                    התחברות בחשבון אחר
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AccessRequestDialog open={requestOpen} onOpenChange={setRequestOpen} title={requestTitle} />
    </section>
  );
};

export default AccessGate;
