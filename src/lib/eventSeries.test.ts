import { describe, expect, it } from "vitest";
import { eventOccurrenceDates } from "./eventSeries";
import type { EventItem } from "@/data/events";

const course: EventItem = {
  id: "course", title: "חופשיה לנוע", description: "", date: "2026-11-09", endDate: "2027-01-09",
  recurrenceWeekday: 1, eventType: "course", time: "20:00", endTime: "21:15", location: "רד״ק 2",
  registration: { type: "phone", phone: "0504845504" },
};
describe("weekly winter series", () => {
  it("includes all Mondays in the requested two-month range", () => {
    expect(eventOccurrenceDates(course)).toEqual(["2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28", "2027-01-04"]);
  });
  it("changing dates removes meetings outside the new range", () => {
    expect(eventOccurrenceDates({ ...course, date: "2026-11-10", endDate: "2026-11-30" })).toEqual(["2026-11-16", "2026-11-23", "2026-11-30"]);
  });
  it("leaves ordinary events as one calendar date", () => {
    expect(eventOccurrenceDates({ ...course, eventType: "event" })).toEqual(["2026-11-09"]);
  });
});