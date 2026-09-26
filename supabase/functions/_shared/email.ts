// Strips whitespace + invisible/bidi marks (common when copying from Contacts/WhatsApp in Hebrew).
export const cleanEmail = (v: string) =>
  v.replace(/[\s\u00A0\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, "").toLowerCase();
