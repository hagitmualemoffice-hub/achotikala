import { addDays, format, parseISO } from "date-fns";
import type { EventItem } from "@/data/events";

export const weekdayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function eventOccurrenceDates(event: EventItem): string[] {
  if (event.eventType !== "course") return [event.date];
  const weekday = event.recurrenceWeekday;
  if (weekday === undefined || weekday < 0 || weekday > 6 || !event.endDate || event.endDate < event.date) return [];
  const start = parseISO(event.date);
  if (Number.isNaN(start.getTime())) return [];
  const dates: string[] = [];
  let day = addDays(start, (weekday - start.getDay() + 7) % 7);
  while (format(day, "yyyy-MM-dd") <= event.endDate) {
    dates.push(format(day, "yyyy-MM-dd"));
    day = addDays(day, 7);
  }
  return dates;
}

export function seriesSchedule(event: EventItem): string {
  const day = event.recurrenceWeekday;
  return `כל יום ${day === undefined ? "" : weekdayNames[day]} · ${event.time}${event.endTime ? `–${event.endTime}` : ""}`;
}