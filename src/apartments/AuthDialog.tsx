import { useEffect, useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/apartments/googleSignIn";
import { IS_OFFLINE_RUNTIME } from "@/offline/isOffline";
import AccessRequestDialog from "@/apartments/AccessRequestDialog";

/** Diagnostic label sent with sign-in checks: "website" or "offline-rev14" (launcher revision). */
function signInClientTag(): string {
  if (!IS_OFFLINE_RUNTIME) return "website";
  const rev = (window as unknown as { AK_BOOT_REV?: unknown }).AK_BOOT_REV;
  return typeof rev === "number" ? `offline-rev${rev}` : "offline";
}

// Strips whitespace + invisible/bidi marks that sneak in from Hebrew keyboards or copy-paste.
const cleanEmail = (v: string) =>
  v.replace(/[\s\u00A0\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, "").toLowerCase();

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

/**
 * Sign-in for actions that need identity (apartment listings, community).
 *
 * Two paths, one account:
 *  - the live site: Google OAuth (needs a real http origin for the redirect)
 *  - the Offline / NetFree folder (file://): a one-time code sent to the same
 *    email address, or an email + password if one was set. Both end up with the
 *    exact same Supabase user, so permissions and content are identical.
 */
const AuthDialog = ({
  open,
  onOpenChange,
  title = "רגע לפני הפרסום",
  description = "ההתחברות היא רק כדי שנדע שהמודעה שלך, ושתוכלי לערוך או למחוק אותה בכל רגע.",
  redirectPath = "/apartments",
  initialMode = "choose",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: string;
  description?: string;
  redirectPath?: string;
  initialMode?: "choose" | "code";
}) => {
  // בגרסה המקומית (file://) קוד לאימייל הוא הדרך היחידה — בלי מסך של Google
  const startMode: "choose" | "code" = IS_OFFLINE_RUNTIME ? "code" : initialMode;
  const [mode, setMode] = useState<"choose" | "email" | "code">(startMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(startMode);
      setCodeSent(false);
      setCode("");
      setDeniedEmail(null);
      setRequestOpen(false);
    }
  }, [open, startMode]);

  const google = async () => {
    setLoading(true);
    try {
      const done = await signInWithGoogle(redirectPath);
      if (!done) return;
      toast.success("התחברת בהצלחה");
      onOpenChange(false);
    } catch {
      toast.error("ההתחברות דרך Google לא הושלמה. אפשר לנסות שוב או להתחבר עם קוד לאימייל.");
    } finally {
      setLoading(false);
    }
  };

  const netErr = (err: unknown) => {
    const msg = err instanceof Error ? `${err.name} ${err.message}` : "";
    // FunctionsFetchError = the request never reached the server (blocked/sandboxed/offline)
    return (
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      /fetch|network|failed to send a request|FunctionsFetchError|load failed/i.test(msg)
    );
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const normalizedEmail = cleanEmail(email);
      const { data: preparation, error: preparationError } = await supabase.functions.invoke(
        "ensure-member-account",
        { body: { email: normalizedEmail, client: signInClientTag() } },
      );
      // If the preparation call itself can't reach the server (some filters
      // block it), don't stop — try sending the code directly; the auth
      // service only sends to existing, approved accounts anyway.
      const prep = preparation as { ok?: boolean; eligible?: unknown } | null;
      const genuine =
        !preparationError && !!prep && typeof prep === "object" && prep.ok === true && typeof prep.eligible === "boolean";
      if (preparationError) {
        console.error("ensure-member-account failed", preparationError);
      } else if (!genuine) {
        // Not a real reply from our server (e.g. a filter's block page) — never treat as "not found".
        const snippet = (typeof preparation === "string" ? preparation : JSON.stringify(preparation ?? null)).slice(0, 160);
        console.error("ensure-member-account invalid response", snippet);
        void supabase.functions
          .invoke("ensure-member-account", { body: { email: normalizedEmail, client: signInClientTag(), report: snippet || "empty" } })
          .catch(() => {});
        toast.error("לא הצלחנו לקבל תשובה מהשרת. נסי שוב בעוד רגע.", {
          description: `(invalid-response: ${snippet})`.slice(0, 160),
        });
        return;
      } else if (!prep!.eligible) {
        setDeniedEmail(normalizedEmail);
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setCodeSent(true);
      toast.success("שלחנו לך קוד בן 8 ספרות לאימייל");
    } catch (err) {
      toast.error(
        netErr(err)
          ? "לא הצלחנו להתחבר לשרת. בדקי את החיבור לאינטרנט ונסי שוב."
          : "לא הצלחנו לשלוח קוד לכתובת הזו. בדקי את האימייל או שלחי בקשת גישה.",
        { description: `(${err instanceof Error ? err.message : String(err)})`.slice(0, 160) },
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: cleanEmail(email),
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      toast.success("התחברת בהצלחה");
      onOpenChange(false);
    } catch (err) {
      toast.error(netErr(err) ? "לא הצלחנו להתחבר לשרת. בדקי את החיבור לאינטרנט ונסי שוב." : "הקוד אינו נכון או שפג תוקפו");
    } finally {
      setLoading(false);
    }
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail(email),
        password,
      });
      if (error) throw error;
      toast.success("התחברת בהצלחה");
      onOpenChange(false);
    } catch (err) {
      toast.error(netErr(err) ? "לא הצלחנו להתחבר לשרת. בדקי את החיבור לאינטרנט ונסי שוב." : "האימייל או הסיסמה אינם נכונים");
    } finally {
      setLoading(false);
    }
  };

  if (deniedEmail) {
    return (
      <>
        <ResponsiveDialog
          open={open && !requestOpen}
          onOpenChange={(o) => {
            if (!o) setDeniedEmail(null);
            onOpenChange(o);
          }}
          desktopContentClassName="max-w-[440px]"
        >
          <div className="px-8 md:px-14 py-10 md:py-14 text-center" dir="rtl">
            <h2 className="text-xl font-medium">הכתובת הזו עדיין לא רשומה אצלנו</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              חיפשנו את הכתובת שהקלדת ולא מצאנו אותה ברשימת חברות הקהילה:
            </p>
            <div
              className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-sm font-medium"
              dir="ltr"
            >
              {deniedEmail}
            </div>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              אם יש כאן טעות קטנה בכתיבה, אפשר לתקן ולנסות שוב. ואם זו הכתובת הנכונה — שלחי
              בקשת גישה ונחזור אליך.
            </p>
            <div className="mt-6 space-y-3">
              <Button
                onClick={() => setRequestOpen(true)}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground"
              >
                שליחת בקשת גישה
              </Button>
              <button
                type="button"
                onClick={() => setDeniedEmail(null)}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                תיקון כתובת האימייל
              </button>
            </div>
          </div>
        </ResponsiveDialog>

        <AccessRequestDialog
          open={requestOpen}
          onOpenChange={(o) => {
            setRequestOpen(o);
            if (!o) {
              setDeniedEmail(null);
              onOpenChange(false);
            }
          }}
          title="בקשת גישה לליבה"
          initialEmail={deniedEmail}
        />
      </>
    );
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      desktopContentClassName="max-w-[440px]"
    >
      <div className="px-10 md:px-14 py-11 md:py-14 text-center" dir="rtl">
        <h2 className="text-xl font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>


        {mode === "choose" && !IS_OFFLINE_RUNTIME && (
          <div className="mt-6 space-y-3">
            <Button
              onClick={google}
              disabled={loading}
              className="w-full h-12 rounded-2xl gap-2 bg-card text-foreground border border-border hover:bg-secondary"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
              התחברות עם Google
            </Button>
            <button
              type="button"
              onClick={() => setMode("code")}
              className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              התחברות עם קוד לאימייל
            </button>
          </div>
        )}

        {mode === "code" && (
          <form onSubmit={codeSent ? verifyCode : sendCode} className="mt-6 space-y-3 text-right">
            {!codeSent ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ap-otp-email">אימייל</Label>
                  <Input
                    id="ap-otp-email"
                    type="email"
                    dir="ltr"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full h-12 rounded-2xl" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  שלחי לי קוד
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  שלחנו קוד בן 8 ספרות ל־<span dir="ltr">{cleanEmail(email)}</span>
                  <br />
                  הזיני אותו כאן כדי להיכנס
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="ap-otp-code">הזיני את הקוד בן 8 הספרות שקיבלת במייל</Label>
                  <Input
                    id="ap-otp-code"
                    dir="ltr"
                    inputMode="numeric"
                    pattern="[0-9]{8}"
                    minLength={8}
                    maxLength={8}
                    required
                    autoComplete="one-time-code"
                    placeholder="12345678"
                    className="text-center tracking-[0.4em] text-lg"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    onPaste={(e) => {
                      e.preventDefault();
                      setCode(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8));
                    }}
                  />

                </div>
                <Button type="submit" className="w-full h-12 rounded-2xl" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  כניסה
                </Button>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => sendCode()}
                    disabled={loading}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    שלחי קוד חדש
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCodeSent(false);
                      setCode("");
                    }}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    לשנות כתובת אימייל
                  </button>
                </div>
              </>
            )}
            {!IS_OFFLINE_RUNTIME && (
              <button
                type="button"
                onClick={() => setMode("email")}
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                יש לי סיסמה
              </button>
            )}
          </form>
        )}

        {mode === "email" && (
          <form onSubmit={submitEmail} className="mt-6 space-y-3 text-right">
            <div className="space-y-1.5">
              <Label htmlFor="ap-email">אימייל</Label>
              <Input
                id="ap-email"
                type="email"
                dir="ltr"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-pass">סיסמה</Label>
              <Input
                id="ap-pass"
                type="password"
                dir="ltr"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-2xl" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              התחברות
            </Button>
            <button
              type="button"
              onClick={() => setMode("code")}
              className="text-sm text-muted-foreground hover:text-primary w-full text-center"
            >
              במקום זה, שלחו לי קוד לאימייל
            </button>
          </form>
        )}
      </div>
    </ResponsiveDialog>
  );
};

export default AuthDialog;
