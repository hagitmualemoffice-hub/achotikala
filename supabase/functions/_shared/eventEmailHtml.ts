// One email layout for test and list sends, matching the event window on the site:
// card with rounded corners, title, date/place rows with pink icons, price boxes, full-width button.
import { registrationLabel } from './registration.ts';
const ICONS = 'https://achotikala.com/email-icons';

const escape = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));

const palette = {
  background: '#ffffff', foreground: '#354d64', soft: '#5d7183', primary: '#d35b7e',
  muted: '#8a8a8a', border: '#e6e6e6', accent: '#fbeef2', accentBorder: '#f0c3d1', mutedBox: '#f7f7f7',
};

const hebrewDay = (iso: string | null | undefined, withWeekday = true) => {
  if (!iso) return '';
  const date = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleDateString('he-IL', { ...(withWeekday ? { weekday: 'long' } : {}), day: 'numeric', month: 'long', timeZone: 'UTC' });
};

/** **bold** and lines starting with "## " (larger), the same marks as the admin editor. */
export const bodyHtml = (body: string) => String(body ?? '').split('\n').map((line) => {
  const large = line.startsWith('## ');
  const html = escape(large ? line.slice(3) : line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return large ? `<span style="font-size:22px;font-weight:bold;line-height:1.5;color:${palette.foreground}">${html}</span>` : html;
}).join('<br>');

type EmailInput = {
  title: string;
  body: string;
  registrationHref: string;
  logoHtml: string;
  coverUrl: string;
  event: Record<string, any>;
  unsubscribeUrl?: string;
};

const row = (icon: string, text: string) =>
  `<tr><td width="22" valign="top" style="padding:3px 0 3px 8px"><img src="${ICONS}/${icon}.png" width="16" height="16" alt="" style="display:block"></td><td style="padding:3px 0;font-size:14px;color:${palette.soft}">${text}</td></tr>`;

export function eventEmailHtml({ title, body, registrationHref, logoHtml, coverUrl, event, unsubscribeUrl }: EmailInput): string {
  const font = "Heebo,'Segoe UI',Arial,sans-serif";
  const time = event.event_time ? ` | ${escape(event.event_time)}${event.end_time ? ` עד ${escape(event.end_time)}` : ''}` : '';
  const when = `${escape(hebrewDay(event.event_date))}${event.hebrew_date ? ` · ${escape(event.hebrew_date)}` : ''}${time}`;
  const where = event.location ? `${escape(event.location)}${event.city ? ` · ${escape(event.city)}` : ''}` : '';
  const details = [row('calendar', when), where ? row('map-pin', where) : '',
    event.menu ? row('utensils', escape(event.menu).replace(/\n/g, '<br>')) : '',
    event.capacity != null ? row('users', `${escape(event.capacity)} מקומות`) : ''].join('');

  const early = event.early_price != null
    ? `<td width="50%" valign="top" style="padding:0 0 0 4px"><div style="border:1px solid ${palette.accentBorder};background:${palette.accent};border-radius:12px;padding:12px;text-align:center"><div style="font-size:11px;color:${palette.muted}">רישום מוקדם</div><div style="font-size:18px;font-weight:600;color:${palette.primary}">₪${escape(event.early_price)}</div>${event.early_price_deadline ? `<div style="font-size:11px;color:${palette.muted}">עד ${escape(hebrewDay(event.early_price_deadline, false))}</div>` : ''}</div></td>` : '';
  const regular = event.regular_price != null
    ? `<td width="50%" valign="top" style="padding:0 4px 0 0"><div style="border:1px solid ${palette.border};background:${palette.mutedBox};border-radius:12px;padding:12px;text-align:center"><div style="font-size:11px;color:${palette.muted}">רישום רגיל</div><div style="font-size:18px;font-weight:600;color:${palette.foreground}">₪${escape(event.regular_price)}</div></div></td>` : '';
  const prices = early || regular ? `<table role="presentation" width="100%" style="margin:20px 0 0;border-collapse:collapse"><tr>${early}${regular}</tr></table>` : '';

  const cover = coverUrl ? `<tr><td><img src="${escape(coverUrl)}" alt="${escape(event.title)}" width="600" style="display:block;width:100%;height:auto"></td></tr>` : '';
  const button = registrationHref
    ? `<table role="presentation" width="100%" style="margin:24px 0 0"><tr><td align="center" style="background:${palette.primary};border-radius:10px"><a href="${escape(registrationHref)}" style="display:block;color:${palette.background};padding:14px 8px;overflow-wrap:anywhere;word-break:break-word;text-decoration:none;font-size:16px;font-weight:600;text-align:center">${escape(registrationLabel(registrationHref))}</a></td></tr></table>`
    : '';
  const footer = unsubscribeUrl
    ? `<tr><td style="padding:18px;border-top:1px solid ${palette.border};font-size:12px;color:${palette.muted};text-align:center"><a href="${unsubscribeUrl}" style="color:${palette.muted}">להסרה מרשימת התפוצה</a></td></tr>` : '';

  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600&display=swap" rel="stylesheet"></head><body style="margin:0;background:${palette.background};color:${palette.foreground};font-family:${font}"><table role="presentation" width="100%"><tr><td align="center" style="padding:0 8px"><table role="presentation" width="600" style="width:100%;max-width:600px;direction:rtl;text-align:right;margin:24px auto;border:1px solid ${palette.border};border-radius:16px;overflow:hidden;border-collapse:separate;font-family:${font}">${logoHtml ? `<tr><td style="text-align:center;padding:18px">${logoHtml}</td></tr>` : ''}${cover}<tr><td style="padding:22px 28px 28px"><h1 style="margin:0 0 14px;font-size:24px;font-weight:600;line-height:1.35;color:${palette.foreground};white-space:pre-line">${escape(title)}</h1><table role="presentation" style="border-collapse:collapse;margin:0 0 16px">${details}</table><p style="margin:0;font-size:15px;font-weight:300;line-height:1.75;color:${palette.foreground}">${bodyHtml(body)}</p>${prices}${button}</td></tr>${footer}</table></td></tr></table></body></html>`;
}
