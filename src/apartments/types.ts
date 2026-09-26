import { Home, Sparkles, CalendarClock, Search, type LucideIcon } from "lucide-react";

export type ListingType = "roommate_wanted" | "building_new" | "sublet" | "seeking_apartment";

export const LISTING_TYPES: ListingType[] = [
  "roommate_wanted",
  "building_new",
  "sublet",
  "seeking_apartment",
];

type TypeMeta = {
  label: string;
  short: string;
  hint: string;
  icon: LucideIcon;
  /** soft tint classes, all token based */
  chip: string;
  ring: string;
};

export const TYPE_META: Record<ListingType, TypeMeta> = {
  roommate_wanted: {
    label: "מחפשות שותפה לדירה קיימת",
    short: "מחפשות שותפה",
    hint: "יש דירת שותפות פעילה ומחפשות עוד בת",
    icon: Home,
    chip: "bg-primary/10 text-primary",
    ring: "ring-primary/25",
  },
  building_new: {
    label: "בונה דירה מאפס",
    short: "בונה דירה",
    hint: "רוצה להקים דירת שותפות חדשה",
    icon: Sparkles,
    chip: "bg-accent text-accent-foreground",
    ring: "ring-accent-foreground/20",
  },
  sublet: {
    label: "סאבלט",
    short: "סאבלט",
    hint: "מקום בדירה לתקופה מוגדרת",
    icon: CalendarClock,
    chip: "bg-secondary text-secondary-foreground",
    ring: "ring-border",
  },
  seeking_apartment: {
    label: "מחפשת דירה קיימת",
    short: "מחפשת דירה",
    hint: "רוצה להצטרף לדירת שותפות קיימת",
    icon: Search,
    chip: "bg-primary/10 text-primary",
    ring: "ring-primary/25",
  },
};

export const typeMeta = (t: string): TypeMeta =>
  TYPE_META[t as ListingType] ?? TYPE_META.seeking_apartment;

export type Listing = {
  id: string;
  author_id: string;
  author_name: string;
  listing_type: string;
  title: string | null;
  description: string | null;
  city: string | null;
  area: string | null;
  price: number | null;
  entry_date: string | null;
  phone: string | null;
  email: string | null;
  contact: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  current_women: number | null;
  seeking_count: number | null;
  total_women: number | null;
  private_room: boolean | null;
  sublet_from: string | null;
  sublet_to: string | null;
  max_roommates: number | null;
};

export const LISTING_DAYS = 14;

export const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "";

export const daysLeft = (expires: string) =>
  Math.max(0, Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000));

export const fmtPrice = (p: number | null) =>
  p == null ? "" : `${Math.round(p).toLocaleString("he-IL")} ₪`;

/** Small human readable tags shown on a card. */
export function listingTags(l: Listing): string[] {
  const tags: string[] = [];
  const t = l.listing_type as ListingType;
  if (l.entry_date) {
    const d = new Date(l.entry_date).getTime();
    if (d - Date.now() < 21 * 86400000) tags.push("כניסה מיידית");
  }
  if (t === "sublet") {
    tags.push("סאבלט");
    if (l.private_room) tags.push("חדר פרטי");
  }
  if ((t === "roommate_wanted" || t === "building_new") && l.seeking_count) {
    tags.push(l.seeking_count === 1 ? "מחפשות שותפה אחת" : `מחפשות ${l.seeking_count} שותפות`);
  }
  if (t === "seeking_apartment" && l.max_roommates) {
    tags.push(l.max_roommates >= 5 ? "5 ומעלה" : `עד ${l.max_roommates} שותפות`);
  }
  if (l.status === "closed") tags.push("נסגרה");
  return tags;
}
