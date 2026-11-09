// Resolve one test destination only; older clients retain the connected-mailbox default.
export function testRecipient(requested: string | undefined, connected: string): string {
  const address = (requested ?? connected).trim();
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(address)) {
    throw new Error('יש להזין כתובת מייל אחת תקינה לבדיקה');
  }
  return address;
}