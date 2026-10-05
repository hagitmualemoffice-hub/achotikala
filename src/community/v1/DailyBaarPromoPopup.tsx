import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flower2, Heart, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { baarBootstrap } from "./baar";

const SEEN_KEY = "liba:seen-daily-baar-promo";

/**
 * One-time announcement of "ההשתדלות היומית" for members who don't have
 * baar access yet — explains the feature and how to join the baar.
 * Members with access get the daily card itself instead.
 */
export default function DailyBaarPromoPopup() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (localStorage.getItem(SEEN_KEY)) return;
    const timer = window.setTimeout(() => {
      baarBootstrap()
        .then((boot) => {
          if (cancelled || !boot) return;
          if (boot.authenticated && !boot.baar_access) setOpen(true);
        })
        .catch(() => undefined);
    }, 3500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const close = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent dir="rtl" className="max-w-md rounded-[28px] p-0 overflow-hidden">
        <div className="bg-gradient-to-b from-primary/[0.10] to-transparent px-7 pt-8 pb-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Flower2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-[22px] font-light text-foreground">
            חדש בבאר: ההשתדלות היומית 💛
          </h2>
          <p className="mt-3 text-[14.5px] font-light leading-relaxed text-muted-foreground">
            בכל יום מחכה לך בבאר כרטיס של בחור אחד — רגע קטן ואישי: להכיר, להמליץ,
            לשתף עם חברה, או פשוט לומר "לא עכשיו".
          </p>
        </div>

        <div className="px-7 pb-7">
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              איך מצטרפות?
            </p>
            <p className="mt-1.5 text-[13px] font-light leading-relaxed text-muted-foreground">
              הבאר נבנה על ידי הקהילה: כל אחת מוסיפה שני בחורים למאגר — והבאר נפתחת עבורה,
              כולל ההשתדלות היומית.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button
              className="rounded-full"
              onClick={() => {
                close();
                navigate("/liba/baar");
              }}
            >
              <Heart className="h-4 w-4" />
              להצטרפות לבאר
            </Button>
            <button
              onClick={close}
              className="text-[12.5px] font-light text-muted-foreground transition-opacity hover:opacity-70"
            >
              אולי בהמשך
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
