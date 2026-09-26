import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EventDetailsDialog from "@/components/EventDetailsDialog";
import { rowToEvent, type DbRow } from "@/hooks/useEvents";
import type { EventItem } from "@/data/events";

const SEEN_KEY = "liba:seen-events";
const FRESH_DAYS = 21;

const readSeen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
};

/** A newly published upcoming event pops up once in ליבה, with all its details. */
export default function NewEventPopup() {
  const [event, setEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - FRESH_DAYS * 86400000).toISOString();
    supabase
      .from("events_db")
      .select("*")
      .eq("status", "published")
      .gte("event_date", today)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const seen = new Set(readSeen());
        const fresh = data.find((r) => !seen.has(r.id));
        if (fresh) setEvent(rowToEvent(fresh as unknown as DbRow));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    if (event) {
      const seen = readSeen();
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, event.id].slice(-100)));
    }
    setEvent(null);
  };

  return <EventDetailsDialog event={event} onClose={close} kicker="אירוע חדש באחותי כלה" />;
}
