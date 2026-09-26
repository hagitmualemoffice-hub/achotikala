---
name: Offline/NetFree distribution lives in this project
description: Since Sep 2026 the offline installer and update system are built here (jsDelivr + Google Drive), not in the Connect & Thrive project
type: feature
---

hagitmualem.com נחסם כליל ע"י NetFree (ספטמבר 2026), ולכן מערכת ההפצה והעדכון של גרסת
האופליין הועברה לפרויקט הזה. אין יותר "פרויקט חיצוני שבונה את האופליין".

- **התקנה ראשונה**: קובץ HTML אחד עצמאי (`node scripts/build-offline-package.mjs`), מופץ דרך
  Google Drive. אפס בקשות רשת בהתקנה — כל התוכן מוטמע כ-`AK.seedPart`.
- **עדכונים**: `offline-cdn/` בריפו GitHub **ציבורי** של הפרויקט, מוגש ע"י
  `cdn.jsdelivr.net/gh/<owner>/<repo>@main/offline-cdn`. jsDelivr נבדק בפועל מול NetFree ועבר;
  `raw.githubusercontent.com` נכשל (rate limit) — לא להשתמש בו.
- ההגדרות ב-`offline/config.json`, האינוריאנטים ב-`docs/OFFLINE-ARCHITECTURE.md`,
  הנוהל ב-`docs/OFFLINE-PUBLISH.md`.
- חוברות PDF וקבצי הורדה (`magazines/`, `downloads/`) לא נארזים לאופליין — הם מנפחים את חבילת ההתקנה.
