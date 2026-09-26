import boiBeshalomImg from "@/assets/events/boi-beshalom-new.jpg.asset.json";
import tanyaBgImg from "@/assets/events/tanya-bg.png.asset.json";
import roniCafeImg from "@/assets/roni-cafe.jpg.asset.json";
import mecholelotLogo from "@/assets/events/mecholelot-kehila.png.asset.json";
import levHairLogo from "@/assets/lev-hair-logo.png.asset.json";

export type RegistrationType = "tickchak" | "email" | "whatsapp" | "external";
export type RegistrationStatus = "not_open" | "open" | "closed_full" | "closed";
export type EventType = "meeting" | "event" | "workshop" | "save_the_date";

export interface EventItem {
  registrationStatus?: RegistrationStatus;
  eventType?: EventType;
  id: string;
  title: string;
  description: string;
  /** ISO date, e.g. "2026-07-09" */
  date: string;
  /** Optional end date for multi-day events (ISO) */
  endDate?: string;
  /** e.g. "19:30" */
  time: string;
  /** e.g. "20:00" */
  endTime?: string;
  /** Hebrew date string, e.g. "כ\"ט בתמוז" */
  hebrewDate?: string;
  location: string;
  city?: string;
  image?: string;
  capacity?: number;
  earlyPrice?: number;
  regularPrice?: number;
  earlyPriceDeadline?: string;
  /** Refreshments / menu note to display in the event card */
  menu?: string;
  registration: {
    type: RegistrationType;
    url?: string;
    email?: string;
    whatsapp?: string;
    label?: string;
  };
  tag?: string;
  partnerLogo?: { url: string; alt: string };
  featured?: boolean;
  /** Poster (Save the Date) image display controls */
  posterStyle?: {
    objectFit?: "cover" | "contain";
    /** 0-100, horizontal focal point */
    positionX?: number;
    /** 0-100, vertical focal point */
    positionY?: number;
    /** zoom, 100 = default, e.g. 120 = 1.2x */
    scale?: number;
  };
}

export const events: EventItem[] = [
  {
    id: "roni-cafe-netivot-shalom",
    title: "רוני - מפגשי בית קפה\nשל אחותי כלה",
    description:
      "מקום קסום, קפה ונשנוש וסדנאות תוכן באווירה אינטימית. השבוע: מפגש לימוד על ימי בין המצרים מהספר \"נתיבות שלום\". חשבתי הרבה מה התוכן שהכי יחבר אותנו לימים האלו, ובעיני מפגשי הלימוד הם מהדברים שהכי מאפשרים חיבור לאיפה שאת נמצאת כרגע. מתרגשת שנלמד יחד באווירה קסומה של בית הקפה.",
    date: "2026-07-19",
    hebrewDate: "ה׳ באב",
    time: "19:30",
    endTime: "22:00",
    location: "מנהל קהילתי לב העיר, אוהל משה 24, נחלאות (קומה -1, בית קפה)",
    city: "ירושלים",
    image: roniCafeImg.url,
    capacity: 25,
    earlyPrice: 35,
    regularPrice: 45,
    menu: "קפה ונשנוש",
    partnerLogo: { url: levHairLogo.url, alt: "מינהל קהילתי לב העיר" },
    registration: {
      type: "tickchak",
      url: "https://tickchak.co.il/109857",
      label: "להרשמה בטיקצ׳אק",
    },
    eventType: "meeting",
    featured: true,
  },
  {
    id: "masa-el-hanefesh-tanya",
    title: "המסע אל הנפש דרך ספר התניא",
    description:
      "שרה יהודית מזמינה אותך באהבה למסע פנימי משותף - להכיר, להבין ולהתחבר לעצמך באמת דרך ספר התניא. נתבונן יחד כיצד ניתן להגיע לשמחה פנימית ולדייק את משמעות החיים.",
    date: "2026-07-15",
    hebrewDate: "א׳ באב",
    time: "20:00",
    location: "רחוב נועם אלימלך 10",
    city: "ביתר עילית",
    image: tanyaBgImg.url,
    regularPrice: 10,
    menu: "תביאי איתך משהו ליד הקפה",
    registration: {
      type: "email",
      email: "sarayc85@gmail.com",
      label: "לאישור הגעה sarayc85@gmail.com",
    },
    eventType: "workshop",
    partnerLogo: { url: mecholelotLogo.url, alt: "מחוללות קהילה" },
  },
  {
    id: "boi-beshalom-shabbat",
    title: "בואי בשלום - מפגש חיבור לשבת",
    description:
      "נפגשות לערב חם ומאיר לקראת שבת: לימוד קצר מהספר \"נתיבות שלום\", סדנת קליעת חלות עם חגית מועלם. ערב של חיבור, ריח של שבת ונשמה.",
    date: "2026-07-16",
    hebrewDate: "ב׳ באב",
    time: "20:00",
    location: "רחוב גבעת שאול 11, כניסה ב׳",
    city: "ירושלים",
    image: boiBeshalomImg.url,
    earlyPrice: 35,
    regularPrice: 45,
    menu: "טשולנט של אמא של חגית",
    registration: {
      type: "tickchak",
      url: "https://tickchak.co.il/109604",
      label: "להרשמה בטיקצ׳אק",
    },
    eventType: "event",
    partnerLogo: { url: mecholelotLogo.url, alt: "מחוללות קהילה" },
    featured: true,
  },
];
