import { safeRegistrationHref, registrationLabel } from '../../../supabase/functions/_shared/registration';
export { registrationLabel };

export type CommunicationDraft = {
  id?: string;
  event_id: string;
  subject: string;
  title: string;
  body: string;
  registration_url: string;
  brand_logo_url: string;
  show_brand_logo: boolean;
  extra_logos: { url: string; alt: string }[];
  audience: string;
  google_label: string;
  message_kind: string;
  planned_at: string | null;
};

export function tickchakLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "tickchak.co.il" || url.hostname.endsWith(".tickchak.co.il"));
  } catch { return false; }
}

/**
 * Registration is optional — not every event has an online registration link.
 * An empty value means "no button"; filled values accept Tickchak or a single mailto address.
 */
export function registrationHref(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return safeRegistrationHref(trimmed) ?? "";
}

/**
 * Simple text marks shared by the email and WhatsApp:
 * **מילים** = bold, a line starting with "## " = larger text.
 */
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));

export function bodyToHtml(body: string): string {
  return body.split("\n").map((line) => {
    const large = line.startsWith("## ");
    const html = escapeHtml(large ? line.slice(3) : line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return large ? `<span style="font-size:22px;font-weight:bold;line-height:1.5">${html}</span>` : html;
  }).join("<br>");
}

export function bodyToWhatsapp(body: string): string {
  return body.split("\n").map((line) => {
    const large = line.startsWith("## ");
    const text = (large ? line.slice(3) : line).replace(/\*\*(.+?)\*\*/g, "*$1*");
    return large && text.trim() ? `*${text.replace(/\*/g, "")}*` : text;
  }).join("\n");
}

type WhatsappEvent = { event_date?: string | null; event_time?: string | null; location?: string | null; city?: string | null; early_price?: number | null; early_price_deadline?: string | null; regular_price?: number | null };

export function whatsappMessage(draft: Pick<CommunicationDraft, "title" | "body" | "registration_url">, event?: WhatsappEvent): string {
  const when = event ? [event.event_date ? new Date(event.event_date).toLocaleDateString("he-IL") : "", event.event_time].filter(Boolean).join(" · ") : "";
  const where = event ? [event.location, event.city].filter(Boolean).join(" ") : "";
  const prices = event ? [
    event.early_price != null ? `רישום מוקדם: ₪${event.early_price}${event.early_price_deadline ? ` · עד ${new Date(event.early_price_deadline).toLocaleDateString("he-IL")}` : ""}` : "",
    event.regular_price != null ? `רישום רגיל: ₪${event.regular_price}` : "",
  ].filter(Boolean).join("\n") : "";
  return [
    draft.title ? `*${draft.title.replace(/\*/g, "")}*` : "",
    [when, where].filter(Boolean).join("\n"),
    bodyToWhatsapp(draft.body),
    prices,
    registrationHref(draft.registration_url) ? (draft.registration_url.startsWith('mailto:') ? registrationLabel(draft.registration_url) : `להרשמה בטיקצ׳אק:\n${draft.registration_url}`) : "",
  ].filter(Boolean).join("\n\n");
}

export function plannedInstant(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Gmail allows at most 500 recipients in one message; keep a safe margin. */
export const WAVE_CAP = 450;

/**
 * Hidden-copy sending goes out in waves on the same day: the whole list when it
 * already fits in one message, otherwise roughly half of what is left.
 */
export function nextWaveSize(remaining: number): number {
  if (remaining <= 0) return 0;
  if (remaining <= WAVE_CAP) return remaining;
  return Math.min(WAVE_CAP, Math.ceil(remaining / 2));
}