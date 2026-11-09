import { useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Stage = "form" | "requested" | "removed" | "already" | "error";

const Unsubscribe = () => {
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const call = async (body: Record<string, string>) => {
    const { data, error } = await supabase.functions.invoke("unsubscribe", { body });
    if (error) {
      const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
      throw new Error(details);
    }
    return data as { ok?: boolean; already?: boolean; removed?: boolean; mail_sent?: boolean };
  };

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("t");
    if (!token) return;
    setBusy(true);
    call({ action: "confirm", token })
      .then((result) => setStage(result.removed ? "removed" : "already"))
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "הפעולה נכשלה");
        setStage("error");
      })
      .finally(() => setBusy(false));
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      await call({ action: "request", email: email.trim() });
      setStage("requested");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "הפעולה נכשלה");
      setStage("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main dir="rtl" className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center px-6 py-16">
      <div className="space-y-6 rounded-2xl border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-medium">הסרה מרשימת התפוצה</h1>
        {stage === "form" && (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">
              הכניסי את כתובת המייל שלך. נשלח אליך קישור לאישור ההסרה — בלי הקישור הכתובת לא מוסרת.
            </p>
            <div className="space-y-2">
              <Label htmlFor="unsubscribe-email">כתובת מייל</Label>
              <Input
                id="unsubscribe-email"
                dir="ltr"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <Button className="w-full" disabled={busy || !email.trim()} onClick={() => void submit()}>
              {busy ? "שולחת קישור…" : "שלחי קישור הסרה"}
            </Button>
          </>
        )}
        {stage === "requested" && (
          <p className="leading-relaxed">
            שלחנו קישור לאישור ההסרה לכתובת {email.trim()}. פתחי את המייל ולחצי על הכפתור שבו.
          </p>
        )}
        {stage === "removed" && <p className="leading-relaxed">הכתובת הוסרה מרשימת התפוצה. לא תבוא אליך יותר כל הודעה.</p>}
        {stage === "already" && <p className="leading-relaxed">הכתובת כבר לא ברשימת התפוצה.</p>}
        {stage === "error" && (
          <>
            <p role="alert" className="leading-relaxed text-destructive">
              {message || "הפעולה נכשלה. נסי שוב או צרי איתנו קשר."}
            </p>
            <Button variant="outline" onClick={() => setStage("form")}>חזרי לטופס</Button>
          </>
        )}
      </div>
    </main>
  );
};

export default Unsubscribe;
