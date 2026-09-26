import type { SpaceId } from "./spaces";

export type AttachmentKind = "pdf" | "excel" | "doc" | "link";

export interface Attachment {
  kind: AttachmentKind;
  title: string;
  meta: string;
  /** already curated into "כלים מהקהילה" */
  curated?: boolean;
}

export interface Reaction {
  emoji: string;
  label: string;
  count: number;
  mine?: boolean;
}

export interface FeedReply {
  author: string;
  initials: string;
  nickname?: boolean;
  time: string;
  body: string;
}

export interface FeedComment {
  author: string;
  initials: string;
  nickname?: boolean;
  time: string;
  body: string;
  hearts?: number;
  fromWriter?: boolean;
  replies?: FeedReply[];
}

export interface FeedPost {
  id: string;
  space: SpaceId;
  title: string;
  body: string;
  author: string;
  initials: string;
  nickname?: boolean;
  time: string;
  pinned?: boolean;
  saved?: boolean;
  unread?: boolean;
  reactions: Reaction[];
  commentCount: number;
  attachment?: Attachment;
  comments?: FeedComment[];
}

export const SINCE_LAST_VISIT = [
  { text: "5 דיונים חדשים", tone: "new" as const },
  { text: "3 תגובות לפוסט שלך", tone: "you" as const },
  { text: "2 בדיונים שהשתתפת", tone: "follow" as const },
  { text: "כלי חדש בפיננסים", tone: "tool" as const },
];

/** quiet reinforcement for things that happened while she was away */
export const AWAY_REINFORCEMENT = [
  {
    glyph: "❤️",
    title: "7 נשים אמרו ״גם אני״ על מה שכתבת",
    note: "כנראה שנגעת במשהו משותף.",
  },
  {
    glyph: "💡",
    title: "התשובה שלך סומנה כמועילה",
    note: "מישהי מצאה בה בדיוק את מה שחיפשה.",
  },
];


export const POSTS: FeedPost[] = [
  {
    id: "p1",
    space: "discussions",
    title: "מה עוזר לכן לעבור את השבוע שאחרי חתונה של חברה קרובה?",
    body: "הייתי בחתונה של החברה הטובה שלי ביום חמישי. שמחתי בשמחה אמיתית, ובו בזמן חזרתי הביתה עם משהו כבד בלב. חשבתי לעצמי שאולי אני היחידה שמרגישה ככה, ואז נזכרתי איפה אני כותבת.\n\nאשמח לשמוע מה עוזר לכן ביום־יומיים האלה — משהו קטן ומעשי, לא סיסמאות. מה שעבד לכן בפועל, גם אם הוא נשמע פשוט מדי.",
    author: "אחת בדרך",
    initials: "א",
    nickname: true,
    time: "לפני 2 שעות",
    pinned: true,
    unread: true,
    commentCount: 18,
    attachment: {
      kind: "doc",
      title: "רשימת דברים קטנים שעוזרים — אספתי מהתגובות",
      meta: "מסמך · עמוד אחד",
    },
    reactions: [
      { emoji: "❤️", label: "אהבתי", count: 24, mine: true },
      { emoji: "🙏", label: "מחזקת", count: 11 },
      { emoji: "גם אני", label: "גם אני", count: 32 },
    ],
    comments: [
      {
        author: "רבקי ל.",
        initials: "רל",
        time: "לפני שעה",
        hearts: 9,
        body: "אני מכינה לעצמי מראש את יום שישי: קניות, מוזיקה, מקלחת ארוכה 🌿 זה נשמע קטן אבל זה מחזיק אותי בדיוק ביום הקשה.",
        replies: [
          {
            author: "אחת בדרך",
            initials: "א",
            nickname: true,
            time: "לפני 40 דקות",
            body: "תודה. הרעיון של להכין מראש ולא להתמודד בזמן אמת מדבר אליי מאוד.",
          },
        ],
      },
      {
        author: "שירה מ.",
        initials: "שמ",
        time: "לפני 25 דקות",
        hearts: 6,
        body: "אצלי זה לקבוע משהו טוב ליום שאחרי, שיהיה לי מה לחכות אליו. גם אני מרגישה בדיוק את מה שתיארת, ולא תמיד יש לי למי לומר את זה.",
      },
      {
        author: "בשקט שלי",
        initials: "ב",
        nickname: true,
        time: "לפני 15 דקות",
        hearts: 12,
        body: "אני מרשה לעצמי לא לספר לאף אחת שקשה לי, ובכל זאת כותבת את זה כאן. זה עצמו מוריד חצי מהמשקל.",
      },
      {
        author: "חגית מ.",
        initials: "חמ",
        time: "לפני 6 דקות",
        fromWriter: true,
        body: "תודה לכן על השיחה הזאת. אספתי את הדברים המעשיים למסמך אחד שמצורף למעלה, כדי שיישאר לנו.",
      },
    ],
  },
  {
    id: "p2",
    space: "car",
    title: "מבטחות דרך סוכן או ישירות? חידוש ביטוח בשבוע הבא",
    body: "יש לי מאזדה 3 משנת 2017, החידוש בשבוע הבא וההצעה שקיבלתי גבוהה ב־600 ש\"ח מהשנה שעברה. מי שעשתה השוואה בשנה האחרונה — שווה לעבור לישיר, או שדווקא הסוכן מסתדר טוב יותר כשיש תביעה?",
    author: "נעמי פ.",
    initials: "נפ",
    time: "לפני 5 שעות",
    unread: true,
    commentCount: 9,
    reactions: [
      { emoji: "💡", label: "מועיל", count: 7 },
      { emoji: "גם אני", label: "גם אני", count: 5 },
    ],
    comments: [
      {
        author: "חני ג.",
        initials: "חג",
        time: "לפני 3 שעות",
        hearts: 4,
        body: "עברתי לישיר לפני שנתיים וחסכתי כ־900 ש\"ח. בתביעה הקטנה שהייתה לי הטיפול היה סבבה, אבל צריך סבלנות לטלפונים.",
      },
    ],
  },
  {
    id: "p3",
    space: "finance",
    title: "בניתי אקסל שעוזר לי לעקוב אחרי ההוצאות — מוזמנות",
    body: "אחרי שנה של ניסיונות בניתי גיליון פשוט שמחלק את ההכנסה לשלוש: קבוע, גמיש וחיסכון. יש בו גם עמודה של הוצאות חד־פעמיות, שזה מה ששבר לי כל תקציב קודם. שמרתי אותו כך שאפשר למלא בעשר דקות בחודש.",
    author: "מיכל ר.",
    initials: "מר",
    time: "אתמול",
    saved: true,
    commentCount: 14,
    attachment: {
      kind: "excel",
      title: "מעקב הוצאות חודשי — אחותי כלה.xlsx",
      meta: "גיליון אקסל · 84KB",
      curated: true,
    },
    reactions: [
      { emoji: "👏", label: "כל הכבוד", count: 41 },
      { emoji: "💡", label: "מועיל", count: 26, mine: true },
    ],
  },
  {
    id: "p4",
    space: "writing",
    title: "ערב שבת, מטבח קטן, ואני",
    body: "אני עומדת במטבח בשעה חמש ועשרים, המים רותחים והרדיו מנגן משהו מהשנים ההן. אין כאן ילדים שרצים, אין מי שקורא לי מהחדר, ובכל זאת השולחן ערוך לשניים — לי ולשבת.\n\nפעם חשבתי שהשקט הזה הוא סימן שמשהו חסר. השנה למדתי שהוא גם סימן שמשהו קיים: בית שאני בונה במו ידיי, נרות שאני מדליקה בזמן, פרחים שקניתי לעצמי בלי לחכות שמישהו יביא.\n\nאני לא כותבת את זה כדי לומר שהכול טוב. יש שבתות שאני סופרת את השעות. אני כותבת את זה כדי לומר שגם השבתות האלה נחשבות, וגם הן שלי.",
    author: "בשקט שלי",
    initials: "ב",
    nickname: true,
    time: "לפני יומיים",
    commentCount: 27,
    reactions: [
      { emoji: "❤️", label: "אהבתי", count: 88 },
      { emoji: "🙏", label: "מחזקת", count: 34 },
      { emoji: "גם אני", label: "גם אני", count: 45 },
    ],
    comments: [
      {
        author: "אסתי ק.",
        initials: "אק",
        time: "לפני יום",
        hearts: 15,
        body: "קראתי פעמיים ❤️ השורה על הפרחים שקנית לעצמך היא בדיוק מה שהייתי צריכה הבוקר.",
      },
    ],
  },
  {
    id: "p5",
    space: "shabbat",
    title: "סוכות אצל ההורים או לארגן משהו עם חברות?",
    body: "בשנים האחרונות הייתי כל החג אצל ההורים וזה היה בסדר, אבל השנה אני מרגישה שאני רוצה גם שלושה ימים משלי. מי שכבר עשתה חג משותף עם חברות — איך חילקתן את זה מול המשפחה בלי לפגוע?",
    author: "טובה ש.",
    initials: "טש",
    time: "לפני 3 ימים",
    commentCount: 21,
    reactions: [
      { emoji: "גם אני", label: "גם אני", count: 29 },
      { emoji: "❤️", label: "אהבתי", count: 12 },
    ],
  },
  {
    id: "p6",
    space: "spiritual",
    title: "תפילה אחת שאני חוזרת אליה בכל פעם שקשה",
    body: "יש לי משפט קטן שאני אומרת בדרך לעבודה: \"תן לי לראות את הטוב שכבר יש\". זה לא מבטל את הבקשה הגדולה, אבל זה משנה לי את הבוקר. אשמח לאסוף כאן משפטים כאלה מכולן, שיהיה לנו מקום לחזור אליו.",
    author: "לאה ב.",
    initials: "לב",
    time: "לפני 4 ימים",
    commentCount: 33,
    reactions: [
      { emoji: "🙏", label: "מחזקת", count: 57 },
      { emoji: "❤️", label: "אהבתי", count: 20 },
    ],
  },
  {
    id: "p7",
    space: "fertility",
    title: "סיכום השאלות ששאלתי בפגישת הייעוץ — מצורף מסמך",
    body: "לפני הפגישה הראשונה הכנתי דף שאלות, ואחרי הפגישה השלמתי אותו עם התשובות ועם מה שהיה חסר לי לשאול. מעלה אותו כאן כדי שלא תצטרכו להתחיל מאפס. חשוב לזכור שזה הניסיון האישי שלי ולא ייעוץ רפואי.",
    author: "יעל א.",
    initials: "יא",
    time: "לפני 5 ימים",
    commentCount: 16,
    attachment: {
      kind: "pdf",
      title: "שאלות לפגישת ייעוץ — שימור פוריות.pdf",
      meta: "מסמך PDF · 3 עמודים",
      curated: true,
    },
    reactions: [
      { emoji: "👏", label: "כל הכבוד", count: 38 },
      { emoji: "💡", label: "מועיל", count: 44 },
    ],
  },
];

export const UPCOMING_EVENTS = [
  { title: "מסע תניא — סוף שבוע בגליל", date: "ה׳ בתשרי · 26.9", place: "צפת" },
  { title: "בואי בשלום — קבלת שבת בשירה", date: "מוצ״ש · 4.10", place: "ירושלים" },
  { title: "מפגש רוני קפה — נשים ופיננסים", date: "יום שני · 13.10", place: "בני ברק" },
];

export const IMPORTANT_NOW = [
  {
    title: "נפתחה ההרשמה למסע תניא",
    note: "מספר המקומות מוגבל, ההרשמה נסגרת בשבוע הבא.",
  },
  {
    title: "כללי המרחב שלנו",
    note: "מה מותר לשתף, איך שומרות על פרטיות ומה קורה עם ניק.",
  },
];

export const TALKING_NOW = [
  { space: "discussions" as SpaceId, title: "השבוע שאחרי חתונה של חברה קרובה", activity: "6 תגובות בשעה האחרונה" },
  { space: "finance" as SpaceId, title: "האם שווה לקחת משכנתה לבד?", activity: "4 תגובות היום" },
  { space: "car" as SpaceId, title: "מוסך מומלץ באזור המרכז", activity: "3 תגובות היום" },
];

export const COMMUNITY_TOOLS = [
  { kind: "excel" as AttachmentKind, title: "מעקב הוצאות חודשי", from: "פיננסים", by: "מיכל ר." },
  { kind: "pdf" as AttachmentKind, title: "שאלות לפגישת ייעוץ", from: "שימור פוריות", by: "יעל א." },
  { kind: "link" as AttachmentKind, title: "השוואת ביטוחי רכב — מדריך", from: "רכב", by: "חני ג." },
  { kind: "doc" as AttachmentKind, title: "צ׳קליסט מעבר דירה", from: "קבוצת דיונים", by: "אסתי ק." },
];
