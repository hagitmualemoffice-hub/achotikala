import { describe, expect, it } from "vitest";
import { tickchakLink, whatsappMessage, plannedInstant, nextWaveSize, WAVE_CAP } from "./eventCommunication";

describe("event communications", () => {
  it("registration goes directly to HTTPS Tickchak", () => {
    expect(tickchakLink("https://tickchak.co.il/12345")).toBe(true);
    expect(tickchakLink("https://tickchak.co.il.example.com/12345")).toBe(false);
    expect(tickchakLink("javascript:alert(1)")).toBe(false);
    expect(tickchakLink("http://tickchak.co.il/12345")).toBe(false);
  });
  it("manual WhatsApp shares the edited event and direct registration link", () => {
    expect(whatsappMessage({ title: "מפגש", body: "ההרשמה המוקדמת מסתיימת", registration_url: "https://tickchak.co.il/12345" }))
      .toBe("מפגש\n\nההרשמה המוקדמת מסתיימת\n\nhttps://tickchak.co.il/12345");
  });
  it("retains the selected sending instant without changing it", () => {
    expect(plannedInstant("2026-11-09T20:00:00+02:00")).toBe("2026-11-09T18:00:00.000Z");
    expect(plannedInstant("")).toBe(null);
  });
});