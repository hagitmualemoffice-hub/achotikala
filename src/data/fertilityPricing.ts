// מחירי תרופות שימור פוריות (מחיר מלא ב-₪)
// נתונים מהטבלאות שסופקו - ניתן לעדכן כאן בקלות

export type Medication = {
  id: string;
  name: string;
  fullPrice: number;
  unit?: string;
  note?: string;
};

export const MEDICATIONS: Medication[] = [
  // גונדוטרופינים
  { id: "menopur-multi-1200", name: "מנופור מולטידוז 1200", fullPrice: 1733, unit: "אמפולה" },
  { id: "menopur-multi-600", name: "מנופור מולטידוז 600", fullPrice: 806, unit: "אמפולה" },
  { id: "menopur-75", name: "מנופור 75", fullPrice: 93, unit: "אמפולה" },
  { id: "gonal-900", name: "גונאל / אוביליף 900", fullPrice: 1313, unit: "עט" },
  { id: "gonal-450", name: "גונאל / אוביליף 450", fullPrice: 627, unit: "עט" },
  { id: "gonal-300", name: "גונאל / אוביליף 300", fullPrice: 445, unit: "עט" },
  { id: "pergoveris-900", name: "פרגובריס 900", fullPrice: 2115, unit: "עט" },
  { id: "pergoveris-450", name: "פרגובריס 450", fullPrice: 1058, unit: "עט" },
  { id: "pergoveris-300", name: "פרגובריס 300", fullPrice: 706, unit: "עט" },
  { id: "puregon-900", name: "פיורגון 900", fullPrice: 1339, unit: "מחסנית" },
  { id: "puregon-600", name: "פיורגון 600", fullPrice: 895, unit: "מחסנית" },
  { id: "puregon-300", name: "פיורגון 300", fullPrice: 443, unit: "מחסנית" },
  { id: "elonva-100", name: "אלונבה 100", fullPrice: 2410, unit: "זריקה" },
  { id: "elonva-150", name: "אלונבה 150", fullPrice: 2397, unit: "זריקה" },
  // אנטגוניסטים / אגוניסטים
  { id: "cetrotide", name: "צטרוטייד", fullPrice: 156, unit: "זריקה" },
  { id: "orgalutran", name: "אורגלוטרן", fullPrice: 125, unit: "זריקה" },
  { id: "decapeptyl-0.1", name: "דקפפטיל 0.1", fullPrice: 21, unit: "זריקה" },
  { id: "decapeptyl-3.75", name: "דקפפטיל 3.75", fullPrice: 471, unit: "זריקה" },
  { id: "synarel", name: "סינרל", fullPrice: 479, unit: "מיכל" },
  // טריגר ותמיכה
  { id: "ovitrelle", name: "אוביטרל (טריגר)", fullPrice: 120, unit: "זריקה", note: "76 ₪ בכללית ללא מושלם" },
  { id: "estrofem", name: "אסטרופם", fullPrice: 19, unit: "חבילה" },
  { id: "duphaston", name: "דופסטון", fullPrice: 20, unit: "חבילה" },
];

export const getMedication = (id: string) => MEDICATIONS.find((m) => m.id === id)!;

// בתי חולים - מחיר מלא לסבב שאיבה ללא כיסוי ביטוחי
export type Hospital = {
  id: string;
  name: string;
  fullPrice: number;
  puahDiscountPrice?: number; // מחיר דרך מכון פועה (רק כשמשלמים מחיר מלא)
  affiliatedKupah?: string;   // קופה שבה זה ב"בית חולים בהסדר"
};

export const HOSPITALS_DATA: Hospital[] = [
  { id: "tel-hashomer", name: "תל השומר (שיבא)", fullPrice: 7200 },
  { id: "ein-kerem", name: "הדסה עין כרם", fullPrice: 9300, puahDiscountPrice: 6200 },
  { id: "har-hatzofim", name: "הדסה הר הצופים", fullPrice: 9300, puahDiscountPrice: 6200 },
  { id: "shaare-zedek", name: "שערי צדק", fullPrice: 8000 },
  { id: "kaplan", name: "קפלן", fullPrice: 6400, affiliatedKupah: "clalit" },
  { id: "assaf-harofeh", name: "אסף הרופא (שמיר)", fullPrice: 6500 },
  { id: "meir", name: "מאיר", fullPrice: 7000 },
  { id: "medical", name: "אסותא מדיקל סנטר", fullPrice: 9500 },
];

export const HOSPITALS = HOSPITALS_DATA.map((h) => h.name);

// פירוט הגבלות לכל מסלול ביטוח
export type PlanLimits = {
  ageRange?: string;       // טווח גילאים (טקסט תצוגה)
  maxCycles?: string;      // מקסימום סבבים
  maxEggs?: string;        // מקסימום ביציות
  qualifyingPeriod?: string; // תקופת אכשרה
  hospitals?: string;      // הגבלת בתי חולים
  other?: string[];        // הגבלות נוספות
};

export type AgeEligibility = { min: number; max: number };

export type InsurancePlan = {
  id: string;
  label: string;
  medicationDiscount: number; // 0..1
  useHospitalPrice: boolean;
  subsidizedFee?: number;
  allowsPuahDiscount?: boolean;
  note?: string;
  limits?: PlanLimits;
  ageEligibility?: AgeEligibility; // טווח גיל למימון בפועל בקופה
};

export type Kupah = {
  id: string;
  name: string;
  plans: InsurancePlan[];
  contact?: string;
};

// סל הבריאות הכללי לשימור פוריות חברתי - מסגרת ההגבלות הבסיסית בישראל
export const BASKET_LIMITS = {
  ageRange: "גילאי 30-41 (לפי החלטת משרד הבריאות)",
  maxCycles: "עד 4 סבבי שאיבה",
  maxEggs: "עד 20 ביציות מוקפאות",
};

export const KUPOT: Kupah[] = [
  {
    id: "clalit",
    name: "כללית",
    contact: "נציגת כללית - דבורה 050-447-8625",
    plans: [
      {
        id: "platinum",
        label: "כללית פלטינום",
        medicationDiscount: 0.85,
        useHospitalPrice: false,
        subsidizedFee: 3500,
        ageEligibility: { min: 30, max: 37 },
        note: "שערי צדק והדסה בהסכם · קפלן בית חולים בהסדר כללית",
        limits: {
          ageRange: "30-37 (כללית לא ממנת מגיל 38 ומעלה)",
          maxCycles: "עד 4 סבבי שאיבה (סל) *",
          maxEggs: "עד 20 ביציות מוקפאות *",
          qualifyingPeriod: "שנה ברמת ביטוח גבוהה (כל קופה) · במעבר ניתן לקבל מימון מיידית",
          hospitals: "שערי צדק והדסה בהסכם · קפלן בית חולים בהסדר כללית · שאר בתי החולים בהתאם לאישור",
          other: [
            "85% הנחה על תרופות בבית מרקחת מושלם פלטינום",
            "* ההגבלות על מספר סבבים וביציות מוגדרות בסל הבריאות",
          ],
        },
      },
      {
        id: "other",
        label: "כללית אחר",
        medicationDiscount: 0,
        useHospitalPrice: true,
        allowsPuahDiscount: true,
        ageEligibility: { min: 30, max: 41 },
        note: "מחיר מלא לתרופות + עלות תהליך בבית חולים",
        limits: {
          ageRange: "30-41 לפי סל הבריאות",
          maxCycles: "עד 4 סבבי שאיבה *",
          maxEggs: "עד 20 ביציות מוקפאות *",
          other: [
            "ללא הנחת מושלם - תשלום מחיר מלא לתרופות",
            "* ההגבלות על מספר סבבים וביציות מוגדרות בסל הבריאות",
          ],
        },
      },
    ],
  },
  {
    id: "maccabi",
    name: "מכבי",
    plans: [
      {
        id: "sheli",
        label: "מכבי שלי",
        medicationDiscount: 0.5,
        useHospitalPrice: false,
        subsidizedFee: 3500,
        ageEligibility: { min: 31, max: 38 },
        note: "אלישע ותל השומר בלבד",
        limits: {
          ageRange: "31-38",
          maxCycles: "עד 4 סבבי שאיבה (סל) *",
          maxEggs: "עד 20 ביציות מוקפאות *",
          qualifyingPeriod: "שנה ברמת ביטוח גבוהה (כל קופה) · במעבר ניתן לקבל מימון מיידית",
          hospitals: "אלישע ותל השומר בלבד",
          other: [
            "50% הנחה על תרופות",
            "* ההגבלות על מספר סבבים וביציות מוגדרות בסל הבריאות",
          ],
        },
      },
      {
        id: "other",
        label: "מכבי אחר",
        medicationDiscount: 0,
        useHospitalPrice: true,
        allowsPuahDiscount: true,
        ageEligibility: { min: 30, max: 41 },
        note: "מחיר מלא לתרופות + עלות תהליך בבית חולים",
        limits: {
          ageRange: "30-41 לפי סל הבריאות",
          maxCycles: "עד 4 סבבי שאיבה *",
          maxEggs: "עד 20 ביציות מוקפאות *",
          other: ["* ההגבלות על מספר סבבים וביציות מוגדרות בסל הבריאות"],
        },
      },
    ],
  },
  {
    id: "meuhedet",
    name: "מאוחדת",
    contact: "נציגת מאוחדת - רבקה 055-5590460 (09:00-14:30)",
    plans: [
      {
        id: "si",
        label: "מאוחדת שיא",
        medicationDiscount: 0.5,
        useHospitalPrice: false,
        subsidizedFee: 3500,
        ageEligibility: { min: 30, max: 41 },
        note: "עד 6 סבבים / 30 ביציות - הזכאות הרחבה ביותר בין הקופות",
        limits: {
          ageRange: "30-41",
          maxCycles: "עד 6 סבבי שאיבה (מורחב מעבר לסל) *",
          maxEggs: "עד 30 ביציות מוקפאות *",
          qualifyingPeriod: "שנה ברמת ביטוח גבוהה (כל קופה) · במעבר ניתן לקבל מימון מיידית",
          other: [
            "50% הנחה על תרופות",
            "השתתפות עצמית קבועה - לא תלויה במחיר בית החולים",
            "* ההרחבה ל-6 סבבים / 30 ביציות ייחודית למאוחדת שיא (מעבר לסל)",
          ],
        },
      },
      {
        id: "other",
        label: "מאוחדת אחר",
        medicationDiscount: 0,
        useHospitalPrice: true,
        allowsPuahDiscount: true,
        ageEligibility: { min: 30, max: 41 },
        note: "מחיר מלא לתרופות + עלות תהליך בבית חולים",
        limits: {
          ageRange: "30-41 לפי סל הבריאות",
          maxCycles: "עד 4 סבבי שאיבה *",
          maxEggs: "עד 20 ביציות מוקפאות *",
          other: ["* ההגבלות על מספר סבבים וביציות מוגדרות בסל הבריאות"],
        },
      },
    ],
  },
  {
    id: "leumit",
    name: "לאומית",
    plans: [
      {
        id: "zahav",
        label: "לאומית זהב",
        medicationDiscount: 0.85,
        useHospitalPrice: false,
        subsidizedFee: 3500,
        ageEligibility: { min: 30, max: 37 },
        note: "חדש! השתתפות עצמית 3,500 ₪ למחזור · גילאי 30-37 · עד 4 מחזורים · תל השומר ואלישע בלבד",
        limits: {
          ageRange: "30-37 (כולל)",
          maxCycles: "עד 4 מחזורי שאיבה מסיבות שאינן רפואיות",
          maxEggs: "עד 20 ביציות מוקפאות *",
          qualifyingPeriod: "תקופת המתנה: 12 חודשים בלאומית זהב",
          hospitals: "תל השומר ואלישע בלבד",
          other: [
            "שירות חדש בלאומית זהב לשימור פוריות מסיבות שאינן רפואיות",
            "השתתפות עצמית 3,500 ₪ למחזור טיפול",
            "85% הנחה על תרופות",
            "* ההגבלות על מספר ביציות מוגדרות בסל הבריאות",
          ],
        },
      },
      {
        id: "other",
        label: "לאומית אחר",
        medicationDiscount: 0,
        useHospitalPrice: true,
        allowsPuahDiscount: true,
        ageEligibility: { min: 30, max: 41 },
        note: "מחיר מלא לתרופות + עלות תהליך בבית חולים",
        limits: {
          ageRange: "30-41 לפי סל הבריאות",
          maxCycles: "עד 4 סבבי שאיבה *",
          maxEggs: "עד 20 ביציות מוקפאות *",
          other: ["* ההגבלות על מספר סבבים וביציות מוגדרות בסל הבריאות"],
        },
      },
    ],
  },
];

// מימון רפואי - מסלול נפרד, לא חלק מהשוואת קופות החולים
// זמין רק לזכאיות (למשל מצבים רפואיים מסוימים, אישור ועדה)
export const MEDICAL_FUNDING = {
  id: "medical-funding",
  name: "מימון רפואי",
  description:
    "מסלול נפרד למי שזכאית למימון רפואי - התהליך חינם ו-85% הנחה על תרופות, ללא תלות בקופת חולים. מותנה באישור הזכאות.",
  medicationDiscount: 0.85,
  procedureFee: 0,
  eligibilityNote:
    "בדרך כלל מצריך אישור רפואי / ועדה. כדאי לברר מראש מי זכאית ואיך מגישים בקשה.",
};

// פרוטוקולים טיפוסיים
export type ProtocolItem = { medId: string; quantity: number };
export type Protocol = { id: string; name: string; description: string; items: ProtocolItem[] };

export const PROTOCOLS: Protocol[] = [
  {
    id: "pergoveris-38",
    name: "פרגובריס טיפוסי",
    description: "פרוטוקול לרזרבה שחלתית נמוכה",
    items: [
      { medId: "pergoveris-900", quantity: 2 },
      { medId: "cetrotide", quantity: 7 },
      { medId: "ovitrelle", quantity: 1 },
      { medId: "decapeptyl-0.1", quantity: 2 },
    ],
  },
  {
    id: "gonal-30",
    name: "גונאל טיפוסי",
    description: "פרוטוקול טיפוסי לרזרבה תקינה",
    items: [
      { medId: "gonal-900", quantity: 2 },
      { medId: "decapeptyl-0.1", quantity: 2 },
      { medId: "cetrotide", quantity: 7 },
      { medId: "ovitrelle", quantity: 1 },
    ],
  },
  {
    id: "menopur-38",
    name: "מנופור טיפוסי",
    description: "פרוטוקול חלופי על בסיס מנופור",
    items: [
      { medId: "menopur-multi-1200", quantity: 3 },
      { medId: "orgalutran", quantity: 7 },
      { medId: "decapeptyl-0.1", quantity: 2 },
      { medId: "ovitrelle", quantity: 1 },
    ],
  },
];

// תאימות לאחור
export const HOSPITAL_BASE_COST = 6500;

// פונקציית עזר - חישוב עלות הפרוצדורה בבית חולים לפי תוכנית ביטוח
export const computeProcedureFee = (plan: InsurancePlan, hospital: Hospital): number => {
  if (!plan.useHospitalPrice) return plan.subsidizedFee ?? 0;
  if (plan.allowsPuahDiscount && hospital.puahDiscountPrice) {
    return hospital.puahDiscountPrice;
  }
  return hospital.fullPrice;
};

// בדיקת זכאות לפי גיל
export const isAgeEligible = (plan: InsurancePlan, age?: number): boolean => {
  if (!age || !plan.ageEligibility) return true;
  return age >= plan.ageEligibility.min && age <= plan.ageEligibility.max;
};
