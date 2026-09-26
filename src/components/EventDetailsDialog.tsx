import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { Calendar as CalendarIcon, MapPin, Utensils, Users } from "lucide-react";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import RegistrationButton from "@/components/EventRegistrationButton";
import type { EventItem } from "@/data/events";

const dateLabel = (event: EventItem) => {
  const d = parseISO(event.date);
  if (Number.isNaN(d.getTime())) return event.date;
  if (event.endDate && event.endDate !== event.date) {
    return `${format(d, "d בMMMM", { locale: he })} – ${format(parseISO(event.endDate), "d בMMMM yyyy", { locale: he })}`;
  }
  return `${format(d, "EEEE, d בMMMM yyyy", { locale: he })}`;
};

/** All the details of one event — used on the events page and for new-event announcements in ליבה. */
export default function EventDetailsDialog({
  event,
  onClose,
  kicker,
}: {
  event: EventItem | null;
  onClose: () => void;
  kicker?: string;
}) {
  const isSaveTheDate = event?.eventType === "save_the_date";
  return (
    <ResponsiveDialog open={!!event} onOpenChange={(v) => !v && onClose()} desktopContentClassName="max-w-xl">
      {event && (
        <div dir="rtl" className="overflow-y-auto text-right">
          {event.image && (
            <img src={event.image} alt={event.title} className="max-h-[42vh] w-full bg-muted object-contain" />
          )}
          <div className="space-y-4 px-6 pb-10 pt-5 md:px-10">
            {kicker && <p className="text-[12px] font-medium text-primary">{kicker}</p>}
            <h2 className="whitespace-pre-line text-2xl font-semibold leading-snug text-foreground">{event.title}</h2>

            <div className="space-y-2.5 text-sm text-foreground/80">
              <div className="flex items-start gap-2">
                <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  {dateLabel(event)}
                  {event.hebrewDate ? ` · ${event.hebrewDate}` : ""}
                  {!isSaveTheDate && event.time ? ` | ${event.time}${event.endTime ? ` עד ${event.endTime}` : ""}` : ""}
                </span>
              </div>
              {event.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {event.location}
                    {event.city ? ` · ${event.city}` : ""}
                  </span>
                </div>
              )}
              {event.menu && (
                <div className="flex items-start gap-2">
                  <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="whitespace-pre-line">{event.menu}</span>
                </div>
              )}
              {event.capacity != null && (
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{event.capacity} מקומות</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="whitespace-pre-line text-[15px] font-light leading-relaxed text-foreground/85">
                {event.description}
              </p>
            )}

            {!isSaveTheDate && (event.earlyPrice != null || event.regularPrice != null) && (
              <div className="grid grid-cols-2 gap-2">
                {event.earlyPrice != null && (
                  <div className="rounded-xl border border-primary/30 bg-accent p-3 text-center">
                    <div className="text-[11px] text-foreground/60">רישום מוקדם</div>
                    <div className="text-lg font-semibold text-primary">₪{event.earlyPrice}</div>
                    {event.earlyPriceDeadline && (
                      <div className="text-[10.5px] text-foreground/50">
                        עד {format(parseISO(event.earlyPriceDeadline), "d בMMMM", { locale: he })}
                      </div>
                    )}
                  </div>
                )}
                {event.regularPrice != null && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                    <div className="text-[11px] text-foreground/60">רישום רגיל</div>
                    <div className="text-lg font-semibold text-foreground">₪{event.regularPrice}</div>
                  </div>
                )}
              </div>
            )}

            {isSaveTheDate && !event.registration?.url ? (
              <p className="rounded-xl border border-dashed border-primary/30 bg-accent/40 p-4 text-center text-sm text-foreground/70">
                פרטים והרשמה בקרוב — שמרו את התאריך ביומן 💌
              </p>
            ) : (
              <RegistrationButton event={event} />
            )}
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
