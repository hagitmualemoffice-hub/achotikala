import pesachCover from "@/assets/magazine-pesach.jpg";
import shavuotCover from "@/assets/magazine-shavuot.jpg";

type Magazine = {
  title: string;
  description: string;
  cover: string;
  pdf: string;
};

const magazines: Magazine[] = [
  {
    title: "מגזין שבועות",
    description: "תוכן שיחבר אותך לעצמך ולחג השבועות",
    cover: shavuotCover,
    pdf: "./magazines/shavuot.pdf",
  },
  {
    title: "מגזין פסח",
    description: "תוכן שיחבר אותך לעצמך ולחג הפסח",
    cover: pesachCover,
    pdf: "./magazines/pesach.pdf",
  },
];

const MagazinesStrip = () => {
  return (
    <div dir="rtl">
      <div className="text-right mb-5 md:mb-7 px-1">
        <h3 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-2 md:mb-3">
          להיות - מגזין הבית של אחותי כלה
        </h3>
        <p className="text-foreground/80 text-sm md:text-lg font-light">
          תוכן שנוצר באהבה ובמחשבה ממש בשבילך
        </p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {magazines.map((m) => (
          <a
            key={m.title}
            href={m.pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-card rounded-2xl md:rounded-3xl shadow-[0_15px_40px_-15px_hsl(0_0%_0%_/_0.12)] overflow-hidden flex flex-row text-right transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_25px_50px_-15px_hsl(var(--primary)/0.25)]"
          >
            <div className="w-28 md:w-40 shrink-0 bg-accent overflow-hidden">
              <img
                src={m.cover}
                alt={`שער ${m.title}`}
                loading="lazy"
                width={768}
                height={1024}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex-1 px-4 md:px-7 py-4 md:py-6 flex flex-col justify-center">
              <h4 className="text-foreground text-base md:text-2xl font-light leading-tight mb-2 group-hover:text-primary transition-colors">
                {m.title}
              </h4>
              <p className="text-foreground/75 text-xs md:text-sm font-light leading-relaxed mb-3">
                {m.description}
              </p>
              <span className="text-primary text-xs md:text-sm font-medium group-hover:text-[hsl(var(--primary-glow))] transition-colors">
                לצפייה במגזין ←
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default MagazinesStrip;
