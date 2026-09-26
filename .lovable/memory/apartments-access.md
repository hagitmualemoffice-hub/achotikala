---
name: הרשאות לוח הדירות
description: גישה ללוח הדירות רק למי שמופיעה ב-authorized_emails, שמסונכרנת מארבע רשימות Google Contacts
type: feature
---
- מקור האמת: ארבע רשימות ב-Google Contacts — "אחותי כלה", "אחותי כלה 2", "מתעניינות", "צעירות".
- מראה באתר: `public.authorized_emails(email, authorized, source, updated_at)` — קריאה למנהלות בלבד.
- אכיפה: RLS על `apartment_listings`/`apartment_comments` דרך `public.has_apartment_access(auth.uid())`; ה-client בודק דרך RPC `my_apartment_access()`.
- סנכרון: Edge Function `apartment-access-sync` (actions: upsert / revoke / replace / pull). cron `apartment-access-hourly` קורא pull כל שעה; pull ללא credentials מוגבל לפעם ב-15 דקות.
- `subscribe-lead` מאשר אוטומטית כל נרשמת חדשה לתפוצה.
- Secret: `CONTACTS_SYNC_TOKEN` (header `x-sync-token`).
- הוראות ל-Apps Script: `docs/apartments-access-apps-script.md`.
- אזהרות Linter 0029 על `has_apartment_access` / `my_apartment_access` / `has_role` / `is_forum_member` מכוונות — נדרשות ל-RLS.
- Apps Script: ContactsApp הושבת (ינואר 2025) — להשתמש רק ב-People API advanced service.
