import { Bookmark, BookmarkCheck, CalendarDays, Coins, Home, MapPin } from "lucide-react";
import { WomanFilled, womenCount } from "./WomenVisual";
import { daysLeft, fmtDate, fmtPrice, typeMeta, type Listing, type ListingType } from "./types";

/* גוון לכל סוג מודעה — מתוך הפלטה הסמנטית של האתר */
const TYPE_TONE: Record<ListingType, string> = {
  roommate_wanted: "bg-[hsl(var(--tag-rose-bg))] text-[hsl(var(--tag-rose))]",
  building_new: "bg-[hsl(var(--tag-lilac-bg))] text-[hsl(var(--tag-lilac))]",
  sublet: "bg-[hsl(var(--tag-mint-bg))] text-[hsl(var(--tag-mint))]",
  seeking_apartment: "bg-[hsl(var(--tag-amber-bg))] text-[hsl(var(--tag-amber))]",
};

const ListingCard = ({
  listing,
  onOpen,
  saved = false,
  onToggleSave,
}: {
  listing: Listing;
  onOpen: () => void;
  saved?: boolean;
  onToggleSave?: () => void;
}) => {
  const meta = typeMeta(listing.listing_type);
  const t = listing.listing_type as ListingType;
  const tone = TYPE_TONE[t] ?? TYPE_TONE.roommate_wanted;
  const left = daysLeft(listing.expires_at);
  const women = womenCount(listing);

  const dateText =
    listing.listing_type === "sublet"
      ? [fmtDate(listing.sublet_from), fmtDate(listing.sublet_to)].filter(Boolean).join(" – ") ||
        "תאריכים גמישים"
      : fmtDate(listing.entry_date) || "כניסה גמישה";

  const priceText = fmtPrice(listing.price);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      dir="rtl"
      className="group relative flex min-h-[200px] w-full min-w-0 max-w-full cursor-pointer flex-col rounded-3xl border border-border/70 bg-card p-5 text-right shadow-[var(--shadow-soft)] transition-all [overflow-wrap:anywhere] hover:border-primary/30 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {onToggleSave && (
        <button
          type="button"
          aria-label={saved ? "להסיר מהשמורים" : "לשמור לאזור האישי"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          className="absolute left-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
        </button>
      )}

      <div className="flex items-start gap-3 pe-8">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Home className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[19px] font-semibold leading-tight text-foreground">
            {listing.title?.trim() || meta.label}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] font-light text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {[listing.city, listing.area].filter(Boolean).join(" · ") || "אזור לא צוין"}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${tone}`}>{meta.short}</span>
        {women ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11.5px] font-medium text-primary">
            <WomanFilled className="h-3.5 w-3.5" />
            {women}
          </span>
        ) : null}
        {priceText ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-medium text-foreground/80">
            <Coins className="h-3.5 w-3.5" />
            {priceText}
          </span>
        ) : null}
      </div>

      <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-light text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
        {dateText}
      </p>

      {listing.description && (
        <p className="mt-2.5 line-clamp-2 flex-1 text-[13px] font-light leading-relaxed text-foreground/75">
          {listing.description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-[11.5px] font-light text-muted-foreground">
          {left > 0 ? `עוד ${left} ימים בלוח` : "פג תוקף"}
        </span>
        <span className="text-[12px] font-light text-primary">לפרטים</span>
      </div>
    </article>
  );
};

export default ListingCard;
