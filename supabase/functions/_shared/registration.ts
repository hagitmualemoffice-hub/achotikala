/**
 * Registration is optional: not every event has an online registration link.
 * Returns '' when no link was given, the verified link when it is a direct
 * HTTPS Tickchak address or a single mailto address, or null for invalid input.
 */
export function safeRegistrationHref(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('mailto:')) {
    const address = raw.slice(7);
    return address.length <= 254 && /^[A-Za-z0-9.!#$'*+\-/=_`{|}~^]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(address)
      ? `mailto:${address}` : null;
  }
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

export function registrationLabel(href: string): string {
  return href.startsWith('mailto:') ? `להרשמה במייל: ${href.slice(7)}` : 'להרשמה בטיקצ׳אק';
}
