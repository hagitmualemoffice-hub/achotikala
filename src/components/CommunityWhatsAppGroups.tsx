import { MessageCircle, FileSpreadsheet, ClipboardList, Phone, ExternalLink, Heart, Sparkles, Users, Pill } from "lucide-react";

type GroupType = "whatsapp" | "sheet" | "form" | "org";

interface Group {
  name: string;
  description: string;
  contact?: string;
  url?: string;
  type: GroupType;
  category: "fridge" | "support" | "meds" | "org";
}

const groups: Group[] = [
  // ===== המקרר השיתופי =====
  {
    name: "מקרר התרופות השיתופי - חיפוש תרופות",
    description: "אקסל שיתופי של תרופות שמוסרות משמרות פוריות מהקהילה עבור אחרות.",
    contact: "חיה בתאל · 052-276-4629",
    url: "https://docs.google.com/spreadsheets/d/1fgakciTdJORHhOip1MwBzUrU4k0H15f5IZY6Liewdi0/edit?gid=0#gid=0&fvid=709051320",
    type: "sheet",
    category: "fridge",
  },
  {
    name: "מקרר התרופות - תרומת תרופות",
    description: "כאן את יכולה לתרום תרופות עבור משמרות פוריות אחרות.",
    contact: "חיה בתאל · 052-276-4629",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSe8a81B50lSfqiSQNEPh99C3fKMkZRk0dGhadcwSO-4q5QacA/viewform",
    type: "form",
    category: "fridge",
  },

  // ===== קבוצות תמיכה =====
  {
    name: "שימור פוריות של אחותי כלה",
    description: "כל שאלה ועזרה שאת צריכה - יש פה בנות מהממות שישמחו לעזור.",
    url: "https://chat.whatsapp.com/LgqnNzric622JYq3FvP8Wn?mode=wwt",
    type: "whatsapp",
    category: "support",
  },
  {
    name: "SHE-MORE",
    description: "קבוצת ווצאפ מהממת של תמיכה בדרך. שאלות ותשובות מנשים שעברו את התהליך.",
    url: "https://chat.whatsapp.com/CgbKWTWFSrbIbDzHHxgG6m?mode=wwt",
    type: "whatsapp",
    category: "support",
  },
  {
    name: "אחיות למסע",
    description: "קבוצה לשאלות, בעיות, או סתם לפרוק. מקום בטוח לדבר.",
    url: "https://chat.whatsapp.com/Cp7kxPD5vhb47S8Pfl3iBp",
    type: "whatsapp",
    category: "support",
  },
  {
    name: "מייעצות מה-❤️",
    description: "ייעוץ חברתי על טיפולי פוריות + פרסומים למסירה בלבד. לא ניתן למכור תרופות.",
    contact: "054-522-4233",
    url: "https://chat.whatsapp.com/DMJcCSk5woY4wz7eOwX343",
    type: "whatsapp",
    category: "support",
  },

  // ===== תרופות =====
  {
    name: "שיתוף ב❤️ - נתינה ללא תמורה",
    description: "מסירה בלבד, לא ניתן למכור תרופות בקבוצה.",
    contact: "052-431-3135",
    url: "https://chat.whatsapp.com/K5EHPsKJzoRFn6eixD3MDU",
    type: "whatsapp",
    category: "meds",
  },
  {
    name: "שיתוף ב❤️ - נתינה ללא תמורה (2)",
    description: "תרופות למסירה. הקבוצה נועדה לעזור אחת לשניה ע״י מסירת תרופות או ייעוץ.",
    contact: "055-663-9322",
    url: "https://chat.whatsapp.com/K5EHPsKJzoRFn6eixD3MDU",
    type: "whatsapp",
    category: "meds",
  },
  {
    name: "תרופות פוריות בירושלים",
    description: "תרופות פוריות בירושלים בלבד. לא מוכרים תרופות פתוחות.",
    contact: "050-545-0550",
    url: "https://chat.whatsapp.com/IZ6CmlEcgbGD9QbfC2CiOc",
    type: "whatsapp",
    category: "meds",
  },
  {
    name: "י-ם מסירה בלבד",
    description: "מסירת תרופות בירושלים.",
    url: "https://chat.whatsapp.com/JH2Tw5pVsLbLbIZquR7O8I",
    type: "whatsapp",
    category: "meds",
  },
  {
    name: "מחיר עלות",
    description: "תרופות למכירה במחיר עלות.",
    contact: "054-522-4233",
    url: "https://chat.whatsapp.com/FaUxxC7nP972zqrY8muJb",
    type: "whatsapp",
    category: "meds",
  },

  // ===== ארגונים =====
  {
    name: "מוריה - גמ״ח פרטי",
    description: "אישה מיוחדת שעוזרת למצוא חלק נכבד מהתרופות. סגורות.",
    contact: "03-579-2220",
    type: "org",
    category: "org",
  },
  {
    name: "חברים לרפואה - עזרה בתרופות",
    description: "ארגון שעוזר במציאת תרופות וגם בקנייה בהוזלה גדולה מבית מרקחת ״אורניום פארם״ בירושלים.",
    url: "https://form.haverim.org.il/t/i2CadQ8djMus?daf=%D7%99%D7%A7%D7%A8%D7%95%D7%AA",
    type: "org",
    category: "org",
  },
  {
    name: "ארגון לגדל",
    description: "מידי פעם נותנים תרופות, שווה לנסות. ליצירת קשר בטלפון.",
    url: "https://legadel.org.il/",
    type: "org",
    category: "org",
  },
];

const typeMeta: Record<GroupType, { label: string; icon: typeof MessageCircle; chipBg: string; chipText: string }> = {
  whatsapp: { label: "קבוצת ווצאפ", icon: MessageCircle, chipBg: "bg-[#25D366]/10", chipText: "text-[#128C7E]" },
  sheet: { label: "גוגל שיטס", icon: FileSpreadsheet, chipBg: "bg-emerald-500/10", chipText: "text-emerald-700" },
  form: { label: "טופס תרומה", icon: ClipboardList, chipBg: "bg-sky-500/10", chipText: "text-sky-700" },
  org: { label: "ארגון", icon: Heart, chipBg: "bg-primary/10", chipText: "text-primary" },
};

const sections: { id: Group["category"]; title: string; subtitle: string; icon: typeof Users }[] = [
  { id: "fridge", title: "המקרר השיתופי של הקהילה", subtitle: "תרופות שעוברות בין נשים - מתרומה לחיים חדשים.", icon: Pill },
  { id: "support", title: "קבוצות תמיכה", subtitle: "שיחה, חיבוק וירטואלי, ושאלות לכל התשובות שלך.", icon: Users },
  { id: "meds", title: "תרופות - מסירה והוזלה", subtitle: "קבוצות לחילופי תרופות פוריות.", icon: Sparkles },
  { id: "org", title: "ארגונים שיכולים לעזור", subtitle: "גופים וגמ״חים שעוזרים במציאת ובהוזלת תרופות.", icon: Heart },
];

const GroupCard = ({ group }: { group: Group }) => {
  const meta = typeMeta[group.type];
  const Icon = meta.icon;
  const isLink = !!group.url;
  const Wrapper: any = isLink ? "a" : "div";
  const wrapperProps = isLink ? { href: group.url, target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group relative bg-card rounded-2xl border border-border/60 p-5 md:p-6 text-right flex flex-col gap-3 transition-all duration-300 ${
        isLink ? "hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_hsl(var(--primary)/0.25)] hover:border-primary/40 cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${meta.chipBg} ${meta.chipText}`}>
          <Icon className="w-3 h-3" />
          {meta.label}
        </span>
        {isLink && (
          <ExternalLink className="w-4 h-4 text-foreground/30 group-hover:text-primary transition-colors" />
        )}
      </div>

      <h3 className="text-foreground text-base md:text-lg font-bold leading-snug group-hover:text-primary transition-colors">
        {group.name}
      </h3>

      <p className="text-foreground/70 text-xs md:text-sm font-light leading-relaxed flex-1">
        {group.description}
      </p>

      {group.contact && (
        <div className="flex items-center gap-1.5 text-xs text-foreground/60 pt-1 border-t border-border/50">
          <Phone className="w-3 h-3" />
          <span className="font-light">{group.contact}</span>
        </div>
      )}
    </Wrapper>
  );
};

const CommunityWhatsAppGroups = () => {
  return (
    <section
      id="community-groups"
      className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6 bg-gradient-to-b from-accent/40 via-card to-card"
    >
      <div className="w-full md:w-[min(1100px,80%)] mx-auto" dir="rtl">
        {/* Header */}
        <div className="text-right mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Heart className="w-3.5 h-3.5" fill="currentColor" />
            את לא לבד במסע
          </div>
          <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-3">
            <span className="font-light">קהילה ועזרה הדדית</span>
          </h2>
          <p className="text-foreground/70 text-sm md:text-lg font-light max-w-2xl">
            קבוצות ווצאפ, מקרר תרופות שיתופי וארגונים - כל הקהילה במקום אחד.
          </p>
        </div>


        {/* Sections */}
        <div className="space-y-10 md:space-y-14">
          {sections.map((sec) => {
            const items = groups.filter((g) => g.category === sec.id);
            const SecIcon = sec.icon;
            return (
              <div key={sec.id}>
                <div className="flex items-center gap-3 mb-5 md:mb-6">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <SecIcon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-foreground text-lg md:text-2xl font-bold leading-tight">{sec.title}</h3>
                    <p className="text-foreground/60 text-xs md:text-sm font-light">{sec.subtitle}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {items.map((g) => (
                    <GroupCard key={g.name + (g.contact || "")} group={g} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-12 md:mt-16 text-center">
          <p className="text-foreground/60 text-xs md:text-sm font-light max-w-xl mx-auto">
            יודעת על קבוצה או יוזמה שעוזרת? <span className="text-primary font-medium">ספרי לנו</span> ונוסיף אותה כאן כדי שתגיע לעוד נשים.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CommunityWhatsAppGroups;
