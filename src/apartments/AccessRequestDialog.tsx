import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CONNECTION_OPTIONS = [
  "קבוצת וואטסאפ",
  "השתתפתי בפעילות / אירוע",
  "דרך חברה בקהילה",
  "אחר",
] as const;

/** בקשת גישה — נשמרת כ"ממתינה" ומחייבת אישור מנהלת. */
const AccessRequestDialog = ({
  open,
  onOpenChange,
  title = "בקשת גישה",
  initialEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  initialEmail?: string;
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [connection, setConnection] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    if (initialEmail) {
      setEmail(initialEmail.trim().toLowerCase());
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email && !email) setEmail(data.user.email);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialEmail]);


  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (fullName.trim().length < 2) return toast.error("נא למלא שם מלא");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return toast.error("נא למלא כתובת מייל תקינה");
    if (phone.trim().length < 6) return toast.error("נא למלא מספר טלפון");
    if (!connection) return toast.error("נא לבחור איך את מחוברת לקהילה");

    setBusy(true);
    const { error } = await supabase.from("apartment_access_requests").insert({
      full_name: fullName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      connection,
      note: note.trim() ? note.trim().slice(0, 1000) : null,
      status: "pending",
    });
    setBusy(false);
    if (error) {
      toast.error("שליחת הבקשה נכשלה, נסי שוב");
      return;
    }
    setDone(true);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} desktopContentClassName="max-w-md">
      <div dir="rtl" className="min-h-0 overflow-y-auto px-5 pb-6 pt-4 text-right md:px-10 md:py-10">
        <h2 className="pe-10 text-right text-xl font-light">{done ? "ברוכה הבאה לליבה" : title}</h2>

        {done ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" strokeWidth={1.5} />
            <p className="mt-4 text-sm text-muted-foreground font-light leading-relaxed">
              הבקשה אושרה! אפשר כבר עכשיו להיכנס באמצעות כתובת המייל שציינת.
            </p>
            <Button className="mt-6 h-11 rounded-full px-6 font-light" onClick={() => onOpenChange(false)}>
              סגירה
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ar-name">שם מלא</Label>
              <Input id="ar-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ar-email">כתובת המייל שאיתה את מתחברת ל‑Google</Label>
              <Input id="ar-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ar-phone">טלפון</Label>
              <Input id="ar-phone" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>איך את מחוברת לקהילה?</Label>
              <div className="flex flex-wrap gap-2">
                {CONNECTION_OPTIONS.map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    variant="outline"
                    onClick={() => setConnection(opt)}
                    className={`rounded-full border px-4 py-2 text-sm font-light transition-colors ${
                      connection === opt
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ar-note">הערה (לא חובה)</Label>
              <Textarea id="ar-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button
              onClick={() => void submit()}
              disabled={busy}
              className="w-full h-12 rounded-full font-light"
            >
              {busy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              שליחת הבקשה
            </Button>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
};

export default AccessRequestDialog;
