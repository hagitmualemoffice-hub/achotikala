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

export function whatsappMessage(draft: Pick<CommunicationDraft, "title" | "body" | "registration_url">): string {
  return [draft.title, draft.body, draft.registration_url].filter(Boolean).join("\n\n");
}

export function plannedInstant(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}