import { LucideIcon } from "lucide-react";

interface ChapterHeaderProps {
  number?: string;
  eyebrow: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  id?: string;
}

const ChapterHeader = ({ eyebrow, title, description, id }: ChapterHeaderProps) => {
  return (
    <section
      id={id}
      className="w-full px-[42px] md:px-6 pt-12 md:pt-16 pb-1 md:pb-2 scroll-mt-24"
      dir="rtl"
    >
      <div className="w-full md:w-[min(1000px,72%)] mx-auto text-right">

        <h2 className="text-foreground text-2xl md:text-3xl font-light leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-foreground/60 text-sm md:text-base font-light max-w-[640px] mt-1.5">
            {description}
          </p>
        )}
      </div>
    </section>
  );
};

export default ChapterHeader;
