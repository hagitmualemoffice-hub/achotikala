# Offline / NetFree builds

מערכת ההפצה והעדכון של גרסת האופליין נמצאת מעתה בפרויקט הזה (הועברה מ-hagitmualem.com
שנחסם כליל ע"י NetFree בספטמבר 2026).

- ארכיטקטורה ואינוריאנטים: `docs/OFFLINE-ARCHITECTURE.md`
- נוהל פרסום: `docs/OFFLINE-PUBLISH.md`
- קובץ הפתיחה: `offline/launcher.html`, הגדרות: `offline/config.json`
- סקריפטים: `scripts/pack-offline.mjs`, `scripts/build-offline-package.mjs`,
  `scripts/verify-offline-publish.mjs`, `scripts/offline-shared.mjs`
- פלט לפרסום: `offline-cdn/` (מוגש ע"י jsDelivr מריפו GitHub ציבורי)

`src/offline/` ממשיך להחזיק את עוזרי זמן הריצה (זיהוי סביבת אופליין, קריאת תוכן/מדיה מקומיים).
