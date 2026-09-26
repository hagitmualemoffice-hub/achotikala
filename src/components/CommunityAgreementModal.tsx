import { useState } from "react";
import { Heart, Check, Loader2 } from "lucide-react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import threeHearts from "@/assets/liba-three-hearts.png.asset.json";

/** The three decorative Liba hearts */
const TopHeart = () => (
  <img
    src={threeHearts.url}
    alt=""
    aria-hidden
    className="mx-auto mb-4 h-16 w-auto object-contain"
  />
);

interface CommunityAgreementModalProps {
  open: boolean;
  onAccepted: () => void;
  onSubmit?: (community: boolean, advertising: boolean) => Promise<void>;
}

const principles = [
  {
    title: "במרחב הזה מדברות באהבה.",
    body: "גם כשאנחנו לא מסכימות. מאחורי כל שם וכל ניק נמצאת אישה אמיתית, ואנחנו משתדלות להיות בשביל השנייה כמו שהיינו רוצות שיהיו בשבילנו.",
  },
  {
    title: "במרחב הזה יש מקום לכולנו.",
    body: "לדעות שונות, לבחירות שונות, לחוויות שונות ולדרכים שונות. אנחנו לא חייבות להסכים כדי לתת מקום אחת לשנייה.",
  },
  {
    title: "במרחב הזה שומרות על הלשון.",
    body: "אפשר לדבר כאן על כמעט הכול, ובאותה נשימה משתדלות להימנע מלשון הרע, רכילות או דברים שעלולים לפגוע באחרים.",
  },
  {
    title: "מה שנכתב בליבה, נשאר בליבה.",
    body: "לא מעבירות צילומי מסך, סיפורים או שיתופים אישיים אל מחוץ למרחב בלי רשות. ולא משתפות פרטים מזהים של אישה אחרת ללא הסכמתה.",
  },
  {
    title: "גם מאחורי ניק יש אישה.",
    body: "הניק מאפשר לנו להרגיש חופשיות יותר, אבל לא פחות אחראיות למילים שלנו.",
  },
  {
    title: "זה מרחב שאפשר לדבר בו בחופשיות.",
    body: "אנחנו רוצות לאפשר שיחה פתוחה ולא לנהל כל מילה שנכתבת כאן. ובכל זאת, אם יעלה תוכן שאינו מתאים לרוח של ליבה, מנהלות המרחב יוכלו להסיר אותו.",
  },
];

const AgreeSquare = ({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={onToggle}
    className="flex w-full cursor-pointer items-start gap-3 rounded-lg text-right outline-none"
  >
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-all duration-150 ${
        checked
          ? "border-primary bg-primary"
          : "border-muted-foreground/40 bg-background hover:border-primary/60"
      }`}
    >
      {checked && <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />}
    </span>
    <span className="text-[14px] leading-relaxed text-foreground/90">{label}</span>
  </button>
);

export default function CommunityAgreementModal({
  open,
  onAccepted,
  onSubmit,
}: CommunityAgreementModalProps) {
  const [community, setCommunity] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = community && advertising;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit?.(community, advertising);
      onAccepted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={() => {}} contentClassName="bg-card" hideCloseButton>
      <div dir="rtl" className="flex max-h-[92vh] flex-col overflow-hidden">
        {/* scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10">
          {/* header */}
          <div className="mb-7 text-center">
            <TopHeart />
            <h2 className="text-2xl font-light tracking-tight text-foreground md:text-[1.75rem]">
              רגע לפני שנכנסות לליבה
            </h2>
          </div>

          {/* opening */}
          <div className="mb-7 space-y-3 text-center">
            <p className="text-[15px] leading-relaxed text-foreground/85">
              ליבה נוצרה כדי שיהיה לנו מקום להיות בו כמו שאנחנו.
            </p>
            <p className="text-[15px] leading-relaxed text-foreground/85">
              מקום להרגיש בנוח, להביא את מה שמעסיק אותנו, לשאול את מה שלא תמיד יש את מי לשאול, לשתף,
              להתייעץ, לצחוק, לחשוב יחד ולפעמים פשוט להיות.
            </p>
            <p className="text-[15px] leading-relaxed text-foreground/85">
              וכדי שליבה תוכל להישאר מקום כזה, אנחנו שומרות עליה יחד.
            </p>
          </div>

          {/* principles — clean list, no boxes */}
          <div className="mb-7 space-y-5">
            {principles.map((p) => (
              <div key={p.title} className="text-right">
                <div className="mb-1 flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 shrink-0 text-primary" fill="currentColor" strokeWidth={1.5} />
                  <h3 className="text-[15px] font-normal leading-snug text-foreground">{p.title}</h3>
                </div>
                <p className="text-[13.5px] leading-relaxed text-foreground/65" style={{ paddingInlineStart: "1.375rem" }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>

          {/* closing */}
          <p className="mb-7 text-center text-[15px] leading-relaxed text-foreground/85">
            ליבה היא של כולנו.
            <br />
            ככל שנשמור עליה יחד, היא תוכל להיות המקום הזה בשביל כל אחת מאיתנו.
          </p>

          {/* agreement squares */}
          <div className="mb-6 space-y-4">
            <AgreeSquare
              checked={community}
              onToggle={() => setCommunity((v) => !v)}
              label="קראתי, ואני רוצה להיות חלק מליבה ולשמור על המרחב שלנו."
            />
            <AgreeSquare
              checked={advertising}
              onToggle={() => setAdvertising((v) => !v)}
              label="אני מבינה שליבה אינה מקום לפרסום, ושפרסומות וקידום מסחרי מכל סוג אינם מותרים במרחב."
            />
          </div>

          <p className="mb-4 text-center text-[14px] font-light text-foreground/75">
            כמה טוב שאת חלק מהיופי במרחב הזה{" "}
            <Heart className="inline h-3.5 w-3.5 align-[-2px] text-primary" fill="currentColor" strokeWidth={1.5} />
          </p>
        </div>

        {/* sticky CTA */}
        <div className="shrink-0 border-t border-border/60 bg-card px-6 py-4 md:px-10">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full rounded-full bg-primary px-6 py-3.5 text-[15px] font-light text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-[hsl(var(--primary-glow))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                שומרות…
              </span>
            ) : (
              "נכנסת לליבה"
            )}
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
