import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/admin", { replace: true });
    });
  }, [navigate]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("התחברת בהצלחה");
        navigate("/admin", { replace: true });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/admin/reset-password`,
        });
        if (error) throw error;
        toast.success("נשלח מייל לאיפוס סיסמה. יש ללחוץ על הקישור שבמייל.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4" dir="rtl">
      <div className="w-full max-w-sm bg-background rounded-xl border shadow-sm p-6">
        <h1 className="text-xl font-medium text-center mb-1">מערכת ניהול</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">אחותי כלה</p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {mode === "signin" ? "התחברות" : "שליחת קישור לאיפוס סיסמה"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm space-y-3">
          {mode === "signin" ? (
            <>
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => setMode("forgot")}
              >
                שכחתי סיסמה
              </button>
              <p className="text-xs text-muted-foreground">
                יצירת חשבון חדש מתבצעת רק מתוך מערכת הניהול, על ידי מנהלת מחוברת.
              </p>
            </>
          ) : (
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => setMode("signin")}
            >
              חזרה להתחברות
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

