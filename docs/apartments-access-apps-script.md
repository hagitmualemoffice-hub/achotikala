# הרשאות לוח הדירות — Google Apps Script (People API בלבד)

הרשאת הגישה ללוח הדירות נקבעת לפי טבלת `authorized_emails` באתר.
Google Contacts נשאר מקור האמת, וה-Apps Script הקיים מעדכן את האתר.

> שירות ה-`ContactsApp` הישן הושבת על ידי גוגל בינואר 2025. כל הקוד כאן משתמש
> ב-People API advanced service (`People`) בלבד.

## דרישות מוקדמות

1. Apps Script → Services → הוסיפי **Google People API** בשם `People` (v1).
2. `appsscript.json` → oauthScopes כולל `https://www.googleapis.com/auth/contacts`.
3. Deploy → Manage deployments → Execute as: **Me**, Who has access: **Anyone**.

## כתובת ה-endpoint באתר

```
POST https://fwwgvmkksdcrysddyiur.supabase.co/functions/v1/apartment-access-sync
Headers: { "Content-Type": "application/json", "x-sync-token": "<CONTACTS_SYNC_TOKEN>" }
```

| action    | גוף הבקשה                           | מה קורה                                                       |
| --------- | ----------------------------------- | ------------------------------------------------------------- |
| `upsert`  | `{"action":"upsert","emails":[…]}`  | מאשר גישה לכתובות                                             |
| `revoke`  | `{"action":"revoke","emails":[…]}`  | מבטל גישה לכתובות                                             |
| `replace` | `{"action":"replace","emails":[…]}` | הרשימה המלאה: מי שאינה בה מאבדת גישה (reconciliation)         |
| `pull`    | `{"action":"pull"}`                 | האתר מבקש מה-Web App את הרשימה המלאה (רץ אוטומטית כל שעה)      |

## הקוד — People API

```javascript
/* ============================================================
   Achoti Kala — apartments access sync (People API only)
   ============================================================ */

const SYNC_TOKEN = '<CONTACTS_SYNC_TOKEN>'; // אותו מפתח ששמור באתר
const SITE_SYNC_URL =
  'https://fwwgvmkksdcrysddyiur.supabase.co/functions/v1/apartment-access-sync';

const ACCESS_LABELS = ['אחותי כלה', 'אחותי כלה 2', 'מתעניינות', 'צעירות'];

/** normalize: trim + lowercase, מחזיר '' אם לא נראה כמו מייל */
function normEmail_(value) {
  const v = String(value == null ? '' : value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : '';
}

/** כל קבוצות המשתמש (עם pagination) → מיפוי שם → resourceName */
function listContactGroups_() {
  const byName = {};
  let pageToken = null;
  do {
    const res = People.ContactGroups.list({ pageSize: 200, pageToken: pageToken || undefined });
    (res.contactGroups || []).forEach(function (g) {
      const name = String((g.formattedName || g.name || '')).trim();
      if (name) byName[name] = g.resourceName;
    });
    pageToken = res.nextPageToken || null;
  } while (pageToken);
  return byName;
}

/** כל ה-people/… שחברים בקבוצה (עם pagination על maxMembers) */
function groupMemberResourceNames_(groupResourceName) {
  const members = [];
  let pageToken = null;
  do {
    const res = People.ContactGroups.get(groupResourceName, {
      maxMembers: 1000,
      pageToken: pageToken || undefined,
    });
    const list = (res && res.memberResourceNames) || [];
    for (let i = 0; i < list.length; i++) members.push(list[i]);
    pageToken = (res && res.nextPageToken) || null;
  } while (pageToken);
  return members;
}

/** כתובות המייל של קבוצת resourceNames — batchGet ב-50 לכל בקשה */
function emailsForResourceNames_(resourceNames) {
  const out = [];
  for (let i = 0; i < resourceNames.length; i += 50) {
    const chunk = resourceNames.slice(i, i + 50);
    const res = People.People.getBatchGet({
      resourceNames: chunk,
      personFields: 'emailAddresses',
    });
    (res.responses || []).forEach(function (r) {
      const person = r && r.person;
      if (!person) return;
      (person.emailAddresses || []).forEach(function (e) {
        const v = normEmail_(e.value);
        if (v) out.push(v);
      });
    });
  }
  return out;
}

/**
 * כל כתובות המייל שנמצאות לפחות באחת מארבע הרשימות.
 * People API בלבד, ללא ContactsApp. מוחזרת רשימה ייחודית ומנורמלת.
 */
function collectAuthorizedEmails() {
  const groups = listContactGroups_();
  const seenPeople = {};
  const seenEmails = {};

  ACCESS_LABELS.forEach(function (label) {
    const resourceName = groups[label];
    if (!resourceName) {
      console.warn('Contact group not found: ' + label);
      return;
    }
    groupMemberResourceNames_(resourceName).forEach(function (rn) {
      if (rn) seenPeople[rn] = true;
    });
  });

  emailsForResourceNames_(Object.keys(seenPeople)).forEach(function (e) {
    seenEmails[e] = true;
  });

  return Object.keys(seenEmails);
}

/** דחיפה לאתר — server-to-server בלבד */
function pushToSite(action, emails) {
  const clean = (emails || []).map(normEmail_).filter(String);
  if (!clean.length) return;
  UrlFetchApp.fetch(SITE_SYNC_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-sync-token': SYNC_TOKEN },
    payload: JSON.stringify({ action: action, emails: clean }),
    muteHttpExceptions: true,
  });
}

/** טריגר יומי אופציונלי (reconciliation מלא) */
function nightlyReconcile() {
  pushToSite('replace', collectAuthorizedEmails());
}

/** בלוק שצריך להיכנס בתוך ה-doGet הקיים, בשורות הראשונות שלו */
function handleAuthorizedEmailsRequest_(e) {
  const p = (e && e.parameter) || {};
  if (p.action !== 'authorizedEmails') return null;
  if (p.token !== SYNC_TOKEN) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ emails: collectAuthorizedEmails() }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** בדיקה ידנית מתוך העורך */
function testCollect() {
  const emails = collectAuthorizedEmails();
  console.log('authorized: ' + emails.length);
  console.log(emails.slice(0, 10).join(', '));
}
```

## שילוב ב-`doGet` הקיים (בלי ליצור doGet שני)

בתוך ה-`doGet` שכבר קיים בסקריפט שלך, כשורות הראשונות:

```javascript
function doGet(e) {
  const handled = handleAuthorizedEmailsRequest_(e);
  if (handled) return handled;

  // …כאן נשאר כל הקוד הקיים שלך…
}
```

## שילוב ב-`doPost` / בפונקציות הקיימות

- בסוף הפונקציה שמוסיפה נרשמת ל"אחותי כלה 2": `pushToSite('upsert', [email]);`
- בסוף הפונקציה שמסירה מארבע הרשימות: `pushToSite('revoke', [email]);`

`findContactByEmail_` וכל שאר הקוד הקיים נשארים כמו שהם — אין כאן שום פונקציה
בשם זהה, ואין שימוש ב-`ContactsApp`.
