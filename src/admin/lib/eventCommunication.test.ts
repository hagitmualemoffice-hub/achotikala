import { describe, expect, it } from "vitest";
import { tickchakLink, registrationHref, whatsappMessage, plannedInstant, nextWaveSize, WAVE_CAP } from "./eventCommunication";
import { safeRegistrationHref } from '../../../supabase/functions/_shared/registration';

describe("event communications", () => {
  it("registration goes directly to HTTPS Tickchak", () => {
    expect(tickchakLink("https://tickchak.co.il/12345")).toBe(true);
    expect(tickchakLink("https://tickchak.co.il.example.com/12345")).toBe(false);
    expect(tickchakLink("javascript:alert(1)")).toBe(false);
    expect(tickchakLink("http://tickchak.co.il/12345")).toBe(false);
  });
  it("an event with no registration link sends without one", () => {
    expect(registrationHref("")).toBe("");
    expect(registrationHref("   ")).toBe("");
    expect(safeRegistrationHref("")).toBe("");
    expect(safeRegistrationHref(null)).toBe("");
    expect(safeRegistrationHref("javascript:alert(1)")).toBeNull();
    expect(safeRegistrationHref("https://tickchak.co.il/12345")).toBe("https://tickchak.co.il/12345");
  });
  it("email registration opens the selected single address", () => {
    expect(safeRegistrationHref("mailto:register@example.com")).toBe("mailto:register@example.com");
    expect(registrationHref("mailto:register@example.com")).toBe("mailto:register@example.com");
    expect(safeRegistrationHref("mailto:not-an-email")).toBeNull();
    expect(safeRegistrationHref("mailto:a@example.com,b@example.com")).toBeNull();
    expect(safeRegistrationHref("mailto:a@example.com?bcc=other@example.com")).toBeNull();
    expect(safeRegistrationHref("mailto:a@example.com\r\nBcc:b@example.com")).toBeNull();
  });
  it("WhatsApp includes the email registration address", () => {
    expect(whatsappMessage({ title: "מפגש", body: "נפגשות", registration_url: "mailto:register@example.com" }))
      .toBe("*מפגש*\n\nנפגשות\n\nלהרשמה במייל: register@example.com");
  });
  it("WhatsApp message leaves out the registration line when there is no link", () => {
    expect(whatsappMessage({ title: "מפגש", body: "נפגשות", registration_url: "" }))
      .toBe("*מפגש*\n\nנפגשות");
  });
  it("manual WhatsApp shares the edited event and direct registration link", () => {
    expect(whatsappMessage({ title: "מפגש", body: "ההרשמה המוקדמת מסתיימת", registration_url: "https://tickchak.co.il/12345" }))
      .toBe("*מפגש*\n\nההרשמה המוקדמת מסתיימת\n\nלהרשמה בטיקצ׳אק:\nhttps://tickchak.co.il/12345");
  });
  it("retains the selected sending instant without changing it", () => {
    expect(plannedInstant("2026-11-09T20:00:00+02:00")).toBe("2026-11-09T18:00:00.000Z");
    expect(plannedInstant("")).toBe(null);
  });
  it("sends a 623-name list in two same-day hidden-copy waves", () => {
    expect(nextWaveSize(623)).toBe(312);
    expect(nextWaveSize(623 - 312)).toBe(311);
  });
  it("keeps every wave inside the Gmail recipient ceiling", () => {
    expect(WAVE_CAP).toBe(450);
    expect(nextWaveSize(450)).toBe(450);
    expect(nextWaveSize(900)).toBe(450);
    expect(nextWaveSize(0)).toBe(0);
  });
});
import { bodyToHtml, bodyToWhatsapp } from "./eventCommunication";
describe("text marks", () => {
  it("bold becomes strong in email and stars in WhatsApp", () => {
    expect(bodyToHtml("שלום **חברות**")).toBe("שלום <strong>חברות</strong>");
    expect(bodyToWhatsapp("שלום **חברות**")).toBe("שלום *חברות*");
  });
  it("large line is bigger in email and bold in WhatsApp", () => {
    expect(bodyToHtml("## כותרת")).toContain("font-size:22px");
    expect(bodyToWhatsapp("## כותרת")).toBe("*כותרת*");
  });
});
