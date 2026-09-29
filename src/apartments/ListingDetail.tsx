import { CalendarDays, Coins, Mail, MapPin, Pencil, Phone, Trash2, X } from "lucide-react";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import WomenVisual from "./WomenVisual";
import { daysLeft, fmtDate, fmtPrice, listingTags, typeMeta, type Listing } from "./types";

const Row = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </span>
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground font-light">{label}</div>
      <div className="text-sm font-light leading-relaxed break-words">{value}</div>
    </div>
  </div>
);

const ListingDetail = ({
  listing,
  onClose,
  canManage = false,
  onEdit,
  onDelete,
}: {
  listing: Listing | null;
  onClose: () => void;
  /** true when the signed-in user owns this listing (or is an admin) */
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) => {
  if (!listing) return null;
  const meta = typeMeta(listing.listing_type);
  const Icon = meta.icon;
  const phone = listing.phone?.trim() || null;
  const email = listing.email?.trim() || null;
  const legacy = !phone && !email ? listing.contact?.trim() : null;

  return (
    <ResponsiveDialog
      open={!!listing}
      onOpenChange={(o) => !o && onClose()}
      mobileContentClassName="h-[92dvh] max-h-[92dvh]"
    >
      <div className="flex flex-col h-full min-h-0" dir="rtl">
        <div className="flex-1 overflow-y-auto">
          <div className="relative bg-white px-7 md:px-9 pt-8 pb-7">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
              aria-label="סגירה"
            >
              <X className="h-5 w-5" />
            </button>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${meta.chip}`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {meta.label}
            </span>
            <h2 className="mt-3 text-xl sm:text-2xl font-medium leading-snug">
              {listing.title?.trim() || meta.label}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              פורסמה על ידי {listing.author_name} · נותרו {daysLeft(listing.expires_at)} ימים
            </p>

            {canManage && (
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-foreground text-xs md:text-sm font-light hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  עריכת המודעה
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-destructive/30 text-destructive text-xs md:text-sm font-light hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  מחיקת המודעה
                </button>
              </div>
            )}
          </div>

          <div className="px-7 md:px-9 py-7 md:py-8 space-y-6">
            <WomenVisual listing={listing} />

            <div className="grid sm:grid-cols-2 gap-4">
              <Row
                icon={MapPin}
                label="עיר ואזור"
                value={[listing.city, listing.area].filter(Boolean).join(" · ") || "לא צוין"}
              />
              <Row
                icon={Coins}
                label="מחיר / תקציב"
                value={fmtPrice(listing.price) || "גמיש"}
              />
              <Row
                icon={CalendarDays}
                label={listing.listing_type === "sublet" ? "תקופת הסאבלט" : "תאריך כניסה"}
                value={
                  listing.listing_type === "sublet"
                    ? [fmtDate(listing.sublet_from), fmtDate(listing.sublet_to)]
                        .filter(Boolean)
                        .join(" – ") || "גמיש"
                    : fmtDate(listing.entry_date) || "גמיש"
                }
              />
              {listing.listing_type === "sublet" && (
                <Row
                  icon={CalendarDays}
                  label="חדר"
                  value={listing.private_room ? "חדר פרטי" : "שיתוף חדר"}
                />
              )}
            </div>

            {listingTags(listing).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {listingTags(listing).map((t) => (
                  <span
                    key={t}
                    className="text-[11px] rounded-full bg-accent text-accent-foreground px-2.5 py-1"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {listing.description?.trim() && (
              <div className="rounded-3xl bg-secondary/60 p-5">
                <div className="text-xs text-muted-foreground mb-1.5">קצת יותר</div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{listing.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border/70 bg-card px-7 md:px-9 py-5 md:py-6">
          <div className="text-sm font-medium mb-3">יצירת קשר</div>
          <div className="flex flex-wrap items-center gap-2.5">
            {phone && (
              <a
                href={`tel:${phone}`}
                dir="ltr"
                className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-primary text-primary-foreground text-xs md:text-sm font-light hover:opacity-90 transition-opacity"
              >
                <Phone className="h-4 w-4" />
                {phone}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                dir="ltr"
                className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-card border border-border text-foreground text-xs md:text-sm font-light hover:bg-accent hover:text-accent-foreground transition-colors max-w-full"
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{email}</span>
              </a>
            )}
            {legacy && <p className="text-sm text-muted-foreground font-light">{legacy}</p>}
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
};

export default ListingDetail;
