import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { events as staticEvents, type EventItem, type RegistrationType, type RegistrationStatus, type EventType } from "@/data/events";
import { isPreviewMode } from "@/lib/previewMode";
import { useOfflineRows } from "@/offline/offlineContent";
import { offlineMedia } from "@/offline/mediaMap";
import { fetchLiveRows, readLiveCache, writeLiveCache } from "@/offline/liveCache";

export type DbRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  event_time: string | null;
  end_time: string | null;
  hebrew_date: string | null;
  location: string | null;
  city: string | null;
  cover_image: string | null;
  capacity: number | null;
  early_price: number | null;
  regular_price: number | null;
  early_price_deadline: string | null;
  registration: {
    type: RegistrationType;
    url?: string;
    email?: string;
    whatsapp?: string;
    label?: string;
  } | null;
  tag: string | null;
  partner_logo: { url: string; alt: string } | null;
  featured: boolean;
  registration_status: RegistrationStatus;
  event_type: EventType | null;
  menu: string | null;
  poster_style: EventItem["posterStyle"] | null;
};


export const rowToEvent = (r: DbRow): EventItem => ({
  id: r.id,
  title: r.title,
  description: r.description ?? "",
  date: r.event_date,
  endDate: r.end_date ?? undefined,
  time: r.event_time ?? "",
  endTime: r.end_time ?? undefined,
  hebrewDate: r.hebrew_date ?? undefined,
  location: r.location ?? "",
  city: r.city ?? undefined,
  image: offlineMedia(r.cover_image) ?? undefined,
  capacity: r.capacity ?? undefined,
  earlyPrice: r.early_price ?? undefined,
  regularPrice: r.regular_price ?? undefined,
  earlyPriceDeadline: r.early_price_deadline ?? undefined,
  registration: r.registration ?? { type: "external" as RegistrationType },
  tag: r.tag ?? undefined,
  partnerLogo: r.partner_logo
    ? { ...r.partner_logo, url: offlineMedia(r.partner_logo.url) ?? r.partner_logo.url }
    : undefined,
  featured: r.featured,
  registrationStatus: r.registration_status ?? "open",
  eventType: r.event_type ?? undefined,
  menu: r.menu ?? undefined,
  posterStyle: r.poster_style ?? undefined,
});


export function useEvents(includePast = false): EventItem[] {
  const [dbEvents, setDbEvents] = useState<EventItem[]>([]);
  const offlineRows = useOfflineRows("events");

  useEffect(() => {
    let cancelled = false;
    const published = (rows: (DbRow & { status?: string })[]) =>
      rows.filter((r) => r.status === undefined || r.status === "published").map(rowToEvent);

    if (offlineRows) {
      // Offline: last live result if we have one, otherwise the baked snapshot.
      // Then try live (same backend the ליבה feed uses); any failure keeps what's shown.
      const cached = readLiveCache<DbRow & { status?: string }>("events");
      setDbEvents(published(cached ?? (offlineRows as (DbRow & { status?: string })[])));
      fetchLiveRows<DbRow & { status?: string }>(() =>
        supabase.from("events_db").select("*").eq("status", "published"),
      ).then((rows) => {
        if (cancelled || !rows || rows.length === 0) return;
        writeLiveCache("events", rows);
        setDbEvents(published(rows));
      });
      return () => {
        cancelled = true;
      };
    }

    const preview = isPreviewMode();
    const query = supabase.from("events_db").select("*");
    const q = preview ? query : query.eq("status", "published");
    q.then(({ data }) => {
      if (!cancelled && data) setDbEvents((data as unknown as DbRow[]).map(rowToEvent));
    });
    return () => {
      cancelled = true;
    };
  }, [offlineRows]);



  // Merge: DB events take precedence by id
  const staticFiltered = staticEvents.filter((s) => !dbEvents.some((d) => d.id === s.id));
  const all = [...dbEvents, ...staticFiltered];
  if (includePast) return all;

  // Hide past events (last day has fully ended)
  const now = new Date();
  return all.filter((e) => {
    const d = new Date(e.endDate ?? e.date);
    d.setHours(23, 59, 59, 999);
    return d >= now;
  });
}
