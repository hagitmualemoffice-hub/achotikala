/**
 * Registration is optional: not every event has an online registration link.
 * Returns '' when no link was given, the verified link when it is a direct
 * HTTPS Tickchak address, or null when a link was given but is not valid.
 */
export function safeRegistrationHref(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!(url.hostname === 'tickchak.co.il' || url.hostname.endsWith('.tickchak.co.il'))) return null;
  return url.href;
}
