import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { acknowledgeIdentity, publishIdentityState, refreshIdentityState, useIdentityExperiment } from "./identityExperiment";

export default function IdentityExperimentPopup({ blocked }: { blocked: boolean }) {
  const { state } = useIdentityExperiment();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const attempted = useRef<number | null>(null);
  const version = useRef(0);
  useEffect(() => {
    const refresh = () => void refreshIdentityState().catch(() => undefined);
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  useEffect(() => {
    if (blocked || !state?.needs_popup || attempted.current === state.version) return;
    const timer = window.setInterval(() => {
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      window.clearInterval(timer);
      attempted.current = state.version;
      version.current = state.version;
      setOpen(true);
      void acknowledgeIdentity(state.version, "shown").then(publishIdentityState).catch(() => {
        attempted.current = null;
        setOpen(false);
        toast.error("לא הצלחנו לשמור את הצגת ההודעה. ננסה שוב בהמשך.");
      });
    }, 750);
    return () => window.clearInterval(timer);
  }, [state, blocked]);
  useEffect(() => {
    if (state?.allow_nickname_posting || state?.announcement_active === false) setOpen(false);
  }, [state?.allow_nickname_posting, state?.announcement_active]);
  const respond = async (response: "love" | "try" | "dismiss") => {
    if (busy) return;
    setBusy(true);
    try {
      publishIdentityState(await acknowledgeIdentity(version.current, response));
      setOpen(false);
    } catch { toast.error("התשובה לא נשמרה. נסי שוב."); }
    finally { setBusy(false); }
  };
  return <ResponsiveDialog open={open} onOpenChange={(value) => { if (!value) void respond("dismiss"); }} desktopContentClassName="max-w-[620px]">
    <div className="popup-scroll px-6 py-7 md:px-10 md:py-10">
      <DialogTitle className="mb-6 text-2xl font-medium leading-relaxed text-primary">בא לנו לנסות משהו קצת אחר ❤️</DialogTitle>
      <DialogDescription className="space-y-5 text-base font-light leading-7 text-foreground">
        <span className="block">ליבה נבנית יחד איתכן, ולא מעט מכן סיפרו לנו שדווקא כשלא תמיד יודעים מי עומדת מאחורי פוסט או תגובה, משהו בתחושת ההיכרות הולך לאיבוד.</span>
        <span className="block">אז לתקופה הקרובה אנחנו עושות ניסוי קטן:<br /><strong className="font-medium">כותבות בליבה בשם שלנו.</strong></span>
        <span className="block">כל פוסט וכל תגובה יופיעו בשם המלא, כדי שנוכל להכיר קצת יותר, לחבר פנים למילים ולראות אם זה עוזר לליבה להפוך למרחב קרוב ואישי יותר.</span>
        <span className="block">זו לא החלטה סופית. ננסה, נקשיב למה שזה עושה למרחב ולמה שאתן מספרות לנו, ואז נחליט יחד איך נכון להמשיך.</span>
      </DialogDescription>
      <p className="mt-6 border-s-2 border-primary ps-4 text-sm font-medium leading-6 text-foreground">חשוב לדעת: בתקופה הזו, כל פוסט או תגובה שתכתבי בליבה יופיעו בשם המלא שלך.</p>
    </div>
    <div className="popup-footer grid grid-cols-2 gap-3 px-6 pt-5 md:px-10">
      <Button disabled={busy} onClick={() => void respond("love")} className="h-auto min-h-12 whitespace-normal py-3">אוהבת את זה ❤️</Button>
      <Button disabled={busy} onClick={() => void respond("try")} className="h-auto min-h-12 whitespace-normal py-3">אוקיי, ננסה 🙂</Button>
    </div>
  </ResponsiveDialog>;
}