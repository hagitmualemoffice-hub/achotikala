import { Mail, Ticket } from "lucide-react";
import type { EventItem } from "@/data/events";

const WhatsAppIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.595 5.385l.36.572-1.002 3.66 3.749-.984-.213.668z"/>
  </svg>
);

const RegistrationButton = ({ event }: { event: EventItem }) => {
  const { registration } = event;
  const status = event.registrationStatus ?? "open";
  const label = registration.label ?? "להרשמה";

  if (status !== "open") {
    const text =
      status === "not_open"
        ? "ההרשמה תיפתח בקרוב"
        : status === "closed_full"
        ? "האירוע מלא"
        : "ההרשמה סגורה";
    return (
      <div className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-muted text-foreground/60 text-sm font-medium cursor-not-allowed">
        {text}
      </div>
    );
  }

  if (registration.type === "email" && registration.email) {
    const subject = encodeURIComponent(`הרשמה לאירוע: ${event.title}`);
    return (
      <a
        href={`mailto:${registration.email}?subject=${subject}`}
        className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[hsl(var(--primary-glow))] transition-colors"
      >
        <Mail className="h-4 w-4" />
        {label}
      </a>
    );
  }

  if (registration.type === "whatsapp" && registration.whatsapp) {
    const num = registration.whatsapp.replace(/\D/g, "");
    return (
      <a
        href={`https://wa.me/${num}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#E8FAD4] text-[#075E54] text-sm font-medium border-2 border-[#5FE080] hover:bg-[#dcf5bf] transition-colors"
      >
        <WhatsAppIcon className="h-4 w-4 text-[#5FE080]" />
        {label} בווטסאפ
      </a>
    );
  }

  return (
    <a
      href={registration.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[hsl(var(--primary-glow))] transition-colors"
    >
      <Ticket className="h-4 w-4" />
      {label}
    </a>
  );
};

export default RegistrationButton;
