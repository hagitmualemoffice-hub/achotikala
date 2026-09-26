# נוהל פרסום של גרסת האופליין

## הכנה חד-פעמית
1. לחבר את הפרויקט לריפו GitHub (תפריט + בצ'אט → GitHub → Connect project) **ולהפוך אותו לציבורי** —
   jsDelivr מגיש רק ריפו ציבורי.
2. למלא ב-`offline/config.json` את `ghOwner` ו-`ghRepo`.

## עדכון שוטף (המשתמשות לא עושות כלום)

```bash
bunx vite build --config vite.offline.config.ts      # יוצר offline-dist/
node scripts/pack-offline.mjs                        # חלקים + מניפסט ב-offline-cdn/
node scripts/verify-offline-publish.mjs --local      # חייב 0 בעיות
# push ל-GitHub (סנכרון Lovable עושה זאת אוטומטית)
curl -s "$(node -e 'import("./scripts/offline-shared.mjs").then(m=>console.log(m.purgeUrl()))')/updates/manifest.js"
node scripts/verify-offline-publish.mjs              # אימות מול jsDelivr
```

כתובות `@main` ב-jsDelivr נשמרות במטמון עד 12 שעות. ה-purge מזרז; גם בלעדיו העדכון
פשוט יגיע מאוחר יותר, ושום דבר לא נשבר בינתיים.

## התקנה ראשונה (ארבעה קישורי Google Drive קבועים)

```bash
node scripts/build-offline-package.mjs
```

נוצר `/mnt/documents/offline/achoti-kalah.html` — קובץ אחד עצמאי לחלוטין.
לאחר שהקובץ נשמר ב־Storage בנתיב `media/offline-app/achoti-kalah.html`, מפעילים את
`drive-upload-offline`. הפעולה מחליפה את התוכן של ארבעת קובצי Drive הקבועים המוגדרים
ב־`supabase/functions/drive-upload-offline/drive-files.json`; אין ליצור קבצים חדשים בפרסום שוטף.
כל ארבעת הקישורים נשארים קבועים ומתעדכנים יחד לאותו תוכן.
ההתקנה הראשונה ממנו אינה מבצעת אף בקשת רשת.

## אם משהו נכשל
- חלק שמגיע זעיר (~70 בתים) בייצור = חסימת סינון. להקטין `CHUNK_RAW` ולארוז מחדש.
- לא לפרסם גרסה חדשה לפני שהאימות עבר עם 0 בעיות.
- שינוי ב-`offline/launcher.html` מחייב קובץ התקנה חדש ל-Drive, אך התקנות קיימות ממשיכות לעבוד.
