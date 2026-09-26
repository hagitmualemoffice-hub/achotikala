import { useState } from "react";
import {
  Building2,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  ShieldCheck,
  Stethoscope,
  Info,
  ChevronDown,
} from "lucide-react";
import { HOSPITALS, type Hospital } from "@/data/hospitals";
import { Badge } from "@/components/ui/badge";

const InfoRow = ({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-start gap-2.5 text-right">
    <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-foreground/60 mb-0.5">{label}</div>
      <div className="text-sm text-foreground/85 font-light leading-relaxed break-words">{children}</div>
    </div>
  </div>
);

const HospitalCard = ({ hospital: h }: { hospital: Hospital }) => {
  const [open, setOpen] = useState(false);
  const hasInitial = h.initialPhone || h.initialEmail || h.initialFax;
  const hasCycle = h.cycleContact || h.responseTime;
  const hasNurses = h.nursesPhone || h.nursesHours || h.emergencyPhone;
  const hasInfo = hasInitial || hasCycle || hasNurses || h.supervisionNotes || h.doctorChoice || h.priceNote || h.extraNotes;

  return (
    <article className="bg-card rounded-2xl border border-primary/10 shadow-[0_4px_20px_-8px_hsl(0_0%_0%_/_0.08)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 md:px-6 py-4 md:py-5 flex items-center justify-between gap-3 text-right hover:bg-secondary/30 transition-colors"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-full p-2">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-foreground font-bold text-base md:text-lg leading-tight">{h.name}</h3>
            <p className="text-foreground/60 text-xs md:text-sm font-light">{h.region}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasInfo && (
            <Badge variant="outline" className="text-xs font-light border-amber-300 text-amber-700 bg-amber-50">
              מידע בקרוב
            </Badge>
          )}
          <ChevronDown
            className={`h-5 w-5 text-foreground/50 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && hasInfo && (
        <div className="px-5 md:px-6 pb-5 md:pb-6 pt-1 space-y-4 border-t border-border" dir="rtl">
          {hasInitial && (
            <div className="bg-secondary/30 rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-bold text-foreground/70 mb-1">קביעת תור ראשוני</div>
              {h.initialPhone && (
                <InfoRow icon={Phone} label="טלפון">
                  <a href={`tel:${h.initialPhone.replace(/[^\d+]/g, "")}`} className="hover:text-primary">
                    {h.initialPhone}
                  </a>
                </InfoRow>
              )}
              {h.initialEmail && (
                <InfoRow icon={Mail} label="מייל">
                  <a href={`mailto:${h.initialEmail}`} className="hover:text-primary break-all">
                    {h.initialEmail}
                  </a>
                </InfoRow>
              )}
              {h.initialFax && (
                <InfoRow icon={Phone} label="פקס">
                  {h.initialFax}
                </InfoRow>
              )}
            </div>
          )}

          {hasCycle && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-foreground/70">תקשורת במהלך הסבב</div>
              {h.cycleContact && (
                <InfoRow icon={MessageSquare} label="איך מתקשרים">
                  {h.cycleContact}
                </InfoRow>
              )}
              {h.responseTime && (
                <InfoRow icon={Clock} label="זמן תגובה">
                  {h.responseTime}
                </InfoRow>
              )}
            </div>
          )}

          {hasNurses && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-foreground/70">טלפון אחיות / חירום</div>
              {h.nursesPhone && (
                <InfoRow icon={Phone} label="אחיות">
                  {h.nursesPhone}
                </InfoRow>
              )}
              {h.nursesHours && (
                <InfoRow icon={Clock} label="שעות מענה">
                  {h.nursesHours}
                </InfoRow>
              )}
              {h.emergencyPhone && (
                <InfoRow icon={Phone} label="חירום">
                  {h.emergencyPhone}
                </InfoRow>
              )}
            </div>
          )}

          {h.supervisionNotes && (
            <InfoRow icon={ShieldCheck} label="השגחה הלכתית">
              {h.supervisionNotes}
            </InfoRow>
          )}

          {h.doctorChoice && (
            <InfoRow icon={Stethoscope} label="בחירת רופא/ה">
              {h.doctorChoice}
            </InfoRow>
          )}

          {h.priceNote && (
            <InfoRow icon={Info} label="מחיר">
              {h.priceNote}
            </InfoRow>
          )}

          {h.extraNotes && (
            <div className="bg-primary/5 rounded-xl p-3 text-sm text-foreground/80 font-light leading-relaxed">
              {h.extraNotes}
            </div>
          )}
        </div>
      )}

      {open && !hasInfo && (
        <div className="px-5 md:px-6 pb-5 pt-1 text-sm text-foreground/60 font-light text-right border-t border-border" dir="rtl">
          המידע על בית החולים הזה עדיין נאסף. אם עברת שם תהליך - נשמח שתעזרי להשלים את הפרטים.
        </div>
      )}
    </article>
  );
};

const HospitalsDirectory = () => {
  return (
    <section
      id="hospitals"
      className="w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6 scroll-mt-28"
    >
      <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
        <div className="text-right mb-8 md:mb-12">
          <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-2 md:mb-3">
            המדריך לבתי החולים
          </h2>
          <p className="text-foreground/80 text-sm md:text-lg font-light">
            איך פונים, איך מתקשרים במהלך סבב, וכל מה שכדאי לדעת לפני שבוחרים איפה לעשות.
          </p>
        </div>

        <div className="grid gap-3 md:gap-4">
          {HOSPITALS.map((h) => (
            <HospitalCard key={h.id} hospital={h} />
          ))}
        </div>

        <p className="text-foreground/55 text-xs font-light text-right mt-6 leading-relaxed">
          * המידע מבוסס על חוויות אישיות של נשים שעברו את התהליך. הפרטים יכולים להשתנות - תמיד שווה לאמת
          מול המחלקה. חסר לך מידע על בית חולים? כתבי לנו ונוסיף.
        </p>
      </div>
    </section>
  );
};

export default HospitalsDirectory;
