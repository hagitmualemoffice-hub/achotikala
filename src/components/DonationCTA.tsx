import { Heart } from "lucide-react";

export const DONATE_URL = "https://www.matara.pro/nedarimplus/online/?mosad=7018043";

type DonationCTAProps = {
  id?: string;
  title: string;
  paragraphs: string[];
  buttonLabel: string;
  variant?: "soft" | "gradient";
};

const renderEmphasis = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={idx} className="font-medium text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={idx}>{part}</span>
    )
  );

const DonationCTA = ({
  id,
  title,
  paragraphs,
  buttonLabel,
  variant = "soft",
}: DonationCTAProps) => {
  const isGradient = variant === "gradient";

  return (
    <section
      id={id}
      className="scroll-mt-24 px-6 md:px-10 pb-14 md:pb-20"
      dir="rtl"
    >
      <div className="max-w-3xl mx-auto">
        <div
          className={
            isGradient
              ? "relative overflow-hidden rounded-2xl md:rounded-[40px] p-7 md:p-12 text-right"
              : "relative overflow-hidden rounded-2xl md:rounded-[40px] border border-primary/20 bg-card p-7 md:p-12 text-right shadow-[0_10px_40px_-20px_hsl(0_0%_0%_/_0.18)]"
          }
          style={
            isGradient
              ? {
                  background:
                    "linear-gradient(120deg, hsl(24 90% 62%) 0%, hsl(325 75% 67%) 100%)",
                }
              : undefined
          }
        >
          <span
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs mb-5 ${
              isGradient ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
            }`}
          >
            <Heart className="w-3.5 h-3.5" fill="currentColor" />
            להיות חלק מהעשייה
          </span>

          <h2
            className={`text-xl md:text-3xl font-light leading-snug mb-5 ${
              isGradient ? "text-white" : "text-foreground"
            }`}
          >
            {title}
          </h2>

          <div className="space-y-3 mb-8">
            {paragraphs.map((t) => (
              <p
                key={t}
                className={`text-sm md:text-base leading-loose font-light ${
                  isGradient ? "text-white/95" : "text-foreground/70"
                }`}
              >
                {renderEmphasis(t)}
              </p>
            ))}
          </div>

          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={
              isGradient
                ? "inline-block px-9 py-3.5 rounded-full bg-white text-foreground text-sm md:text-base shadow-md hover:shadow-xl transition-all"
                : "inline-block px-9 py-3.5 rounded-full text-white text-sm md:text-base shadow-md hover:shadow-xl transition-all"
            }
            style={
              isGradient
                ? undefined
                : {
                    background:
                      "linear-gradient(90deg, hsl(24 90% 62%) 0%, hsl(325 75% 67%) 100%)",
                  }
            }
          >
            {buttonLabel}
          </a>
        </div>
      </div>
    </section>
  );
};

export default DonationCTA;
