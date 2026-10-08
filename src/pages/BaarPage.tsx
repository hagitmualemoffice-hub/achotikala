import { DirectoryHeading, DirectoryAdd, DirectoryFilter, DirectoryView } from "@/community/v1/DirectoryToolbar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid2X2,
  Heart,
  List,
  Loader2,
  MessageCircle,
  MessageSquareQuote,
  MoreHorizontal,
  Pencil,
  Plus,
  Image as ImageIcon,
  ImageOff,
  Search,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-achoti-kala.png";
import AccessGate from "@/apartments/AccessGate";
import { cachedGrant, rememberGrant } from "@/community/v1/accessMemo";
import { useCommunitySession } from "@/community/useCommunitySession";
import AuthDialog from "@/apartments/AuthDialog";
import { signInWithGoogle } from "@/apartments/googleSignIn";
import LibaHeaderActions from "@/community/v1/LibaHeaderActions";
import LibaTopBar from "@/community/v1/LibaTopBar";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import LibaEmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { MemberAvatar } from "@/community/v1/Avatar";
import { MemberProfileHost, openMemberProfile } from "@/community/v1/MemberProfile";
import {
  type BaarAccessState,
  type BaarBoy,
  type BaarBoyProfile,
  type BaarFilters,
  baarBootstrap,
  fetchBaarList,
  fetchBaarProfile,
  createBaarBoy,
  toggleBaarSave,
  updateBaarBoy,
  setBaarProposalContact,
  archiveBaarBoy,
  recommendBaarBoy,
  removeBaarRecommendation,
  reportBaarBoy,
  requestBaarDeletion,
  DELETION_REASONS,
  findSimilarBoys,
  STATUS_OPTIONS,
  ORIENTATION_OPTIONS,
  ETHNICITY_OPTIONS,
  DRESS_STYLE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  REPORT_REASONS,
  fetchBaarInquiryThreads,
} from "@/community/v1/baar";
import { BaarInquiriesDrawer, BaarInquiryComposer } from "@/community/v1/BaarInquiries";
import { useLibaChat } from "@/community/v1/LibaMessages";
import type { CommunityProfile } from "@/community/v1/api";

type AccessGateState = "loading" | "anon" | "denied" | "offline" | "granted";

const VIEW_KEY = "achotikala.baar.view";
const PAGE = 20;

/* ---- Semantic tag colors: same value = same color everywhere ---- */
const TAG_TONES: Record<string, string> = {
  neutral: "bg-[hsl(var(--tag-neutral-bg))] text-[hsl(var(--tag-neutral))]",
  sky: "bg-[hsl(var(--tag-sky-bg))] text-[hsl(var(--tag-sky))]",
  violet: "bg-[hsl(var(--tag-violet-bg))] text-[hsl(var(--tag-violet))]",
  teal: "bg-[hsl(var(--tag-teal-bg))] text-[hsl(var(--tag-teal))]",
  amber: "bg-[hsl(var(--tag-amber-bg))] text-[hsl(var(--tag-amber))]",
  rose: "bg-[hsl(var(--tag-rose-bg))] text-[hsl(var(--tag-rose))]",
  indigo: "bg-[hsl(var(--tag-indigo-bg))] text-[hsl(var(--tag-indigo))]",
  olive: "bg-[hsl(var(--tag-olive-bg))] text-[hsl(var(--tag-olive))]",
  plum: "bg-[hsl(var(--tag-plum-bg))] text-[hsl(var(--tag-plum))]",
  lime: "bg-[hsl(var(--tag-lime-bg))] text-[hsl(var(--tag-lime))]",
  cyan: "bg-[hsl(var(--tag-cyan-bg))] text-[hsl(var(--tag-cyan))]",
  steel: "bg-[hsl(var(--tag-steel-bg))] text-[hsl(var(--tag-steel))]",
  coral: "bg-[hsl(var(--tag-coral-bg))] text-[hsl(var(--tag-coral))]",
  mint: "bg-[hsl(var(--tag-mint-bg))] text-[hsl(var(--tag-mint))]",
  clay: "bg-[hsl(var(--tag-clay-bg))] text-[hsl(var(--tag-clay))]",
  lilac: "bg-[hsl(var(--tag-lilac-bg))] text-[hsl(var(--tag-lilac))]",
  sand: "bg-[hsl(var(--tag-sand-bg))] text-[hsl(var(--tag-sand))]",
  brick: "bg-[hsl(var(--tag-brick-bg))] text-[hsl(var(--tag-brick))]",
  aqua: "bg-[hsl(var(--tag-aqua-bg))] text-[hsl(var(--tag-aqua))]",
};

/* כל ערך מקבל גוון ייחודי — אין חזרה על אותו צבע בין תגיות שונות */
const TAG_TONE_BY_VALUE: Record<string, keyof typeof TAG_TONES> = {
  // עדה
  "אשכנזי": "indigo",
  "ספרדי": "amber",
  "תימני": "olive",
  "חוצניק": "teal",
  "חצי חצי": "violet",
  // סגנון לבוש
  "שחור לבן": "neutral",
  "צבעוני": "sky",
  "כיפה סרוגה": "lime",
  "חולצה": "cyan",
  "לבוש מערבי": "steel",
  // אוריינטציה
  "חרדי": "plum",
  "חרדי לאומי": "coral",
  "חרדי פתוח": "mint",
  "חרדי מתחזק": "clay",
  "חוזר בתשובה": "rose",
  // סטטוס
  "רווק": "lilac",
  "גרוש": "sand",
  "גרוש +": "brick",
  "אלמן": "aqua",
};

const tagTone = (value: string) => TAG_TONES[TAG_TONE_BY_VALUE[value.trim()] ?? "neutral"];

const TagChip = ({ children }: { children: string }) => (
  <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${tagTone(children)}`}>
    {children}
  </span>
);

const PhotoChip = ({ hasPhoto }: { hasPhoto: boolean }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
      hasPhoto
        ? "bg-[hsl(var(--tag-mint-bg))] text-[hsl(var(--tag-mint))]"
        : "bg-[hsl(var(--tag-neutral-bg))] text-[hsl(var(--tag-neutral))]"
    }`}
  >
    {hasPhoto ? <ImageIcon className="h-3 w-3" /> : <ImageOff className="h-3 w-3" />}
    {hasPhoto ? "יש תמונה" : "אין תמונה"}
  </span>
);

/* על הכרטיסיה — אייקון בלבד: ירוק כשיש תמונה, אפור כשאין */
const PhotoDot = ({ hasPhoto }: { hasPhoto: boolean }) => (
  <span
    title={hasPhoto ? "יש תמונה" : "אין תמונה"}
    aria-label={hasPhoto ? "יש תמונה" : "אין תמונה"}
    className={`inline-grid h-6 w-6 place-items-center rounded-full ${
      hasPhoto
        ? "bg-[hsl(var(--tag-mint-bg))] text-[hsl(var(--tag-mint))]"
        : "bg-[hsl(var(--tag-neutral-bg))] text-[hsl(var(--tag-neutral))]"
    }`}
  >
    {hasPhoto ? <ImageIcon className="h-3.5 w-3.5" /> : <ImageOff className="h-3.5 w-3.5" />}
  </span>
);

const Choice = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={onClick}
    aria-pressed={selected}
    className={`rounded-full px-3.5 text-[12.5px] font-light transition-all ${
      selected
        ? "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
        : "text-muted-foreground"
    }`}
  >
    {children}
  </Button>
);

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <span className="mb-1.5 block text-[13px] text-foreground">
    {text}
    {required && <span className="text-primary"> *</span>}
  </span>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[18px] font-light text-foreground md:text-[22px]">{children}</h2>
);

const EmptyState = ({
  message,
  description,
  action,
  secondary,
}: {
  message: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) => (
  <LibaEmptyState
    icon={Heart}
    title={message}
    description={description}
    action={action}
    secondary={secondary}
  />
);

/* ------------------------------- Add / Edit dialog ------------------------------- */

/* הסעיפים לקריאה ואישור לפני מילוי הטופס — לפי טופס הגוגל המקורי */
const APPROVALS = [
  {
    title: "1. שומרים על פרטיות בבית הזה 😍",
    body: "ולכן הבאר מיועד לבנות אחותי כלה בלבד. לא לחברות, לא לשדכניות ולא לבחורים 😳 ולכן, כשאת מצטרפת את מתחייבת לשמור את זכות הצפייה לעצמך בלבד.",
    chip: "הבנתי ואני מאשרת",
  },
  {
    title: "2. ככה את נעשית שותפה שלנו ❤️",
    body: "הבאר הוא שיתופי בהחלט ולכן כדי להיות חלק ולקבל גישה אליו את צריכה למלא לפחות שני בחורים חדשים בטופס (זאת אומרת, למלא את הטופס פעמיים).",
    chip: "הבנתי",
  },
  {
    title: "3. שדות חובה — הם חובה בהחלט 🙃",
    body: "לא נוכל להתייחס לטפסים שלא מולאו בהם שדות חובה או שלא פורט מספיק מידע על הבחור (כי זה ממש מה שחשוב לנו פה — מידע איכותי, אמין ורלוונטי).",
    chip: "וואו, ברור",
  },
  {
    title: "4. לפעמים הגיל כן קובע 😆",
    body: "שימי לב! טווח הגילאים של הבחורים שאפשר להכניס לבאר הוא 30-49. לפני שאת מכניסה בחור לבאר חשוב שתוודאי שהוא בטווח המבוקש.",
    chip: "סגור",
  },
  {
    title: "5. מה מצופה ממך כשותפה בבאר 😊",
    body: "הבאר הוא מאגר הצעות שיתופי. האווירה בבאר כמו תמיד במיזם אחותי כלה: אווירה מכבדת, מכילה, שיתופית ועם אנרגיות חיוביות. השותפות שלך בבאר היא הדדית — כולן שם בשבילך ואת בשביל כולן. סומכות עליך שתתני להן הרגשה נהדרת.",
    chip: "בטח, אני על זה",
  },
];

const FormCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-1 py-5 md:px-0 md:py-6 ${className}`}>{children}</div>
);

const inputCls =
  "w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary";
const textareaCls =
  "w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-primary";

const DETAILS_MIN = 120;

const EMPTY_DRAFT = {
  full_name: "",
  age: "",
  birth_year: "",
  city: "",
  status: "",
  orientation: "",
  ethnicity: "",
  dress_style: "",
  details: "",
  looking_for: "",
  positives: "",
  has_photo: "" as "" | "yes" | "no",
  relationship_type: "",
  recommendation_note: "",
  contact_mode: "liba" as "liba" | "profile" | "both",
  contact_phone: "",
  contact_email: "",
  proposal_contact_name: "",
  proposal_contact_phone: "",
  proposal_contact_email: "",
};

const DRAFT_KEY = "achotikala.baar.boy-draft";
const RULES_KEY = "achotikala.baar.rules-approved";

const readSavedDraft = (): typeof EMPTY_DRAFT | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const merged = { ...EMPTY_DRAFT, ...parsed };
    const hasContent = (Object.keys(EMPTY_DRAFT) as (keyof typeof EMPTY_DRAFT)[]).some(
      (k) => !["contact_mode", "contact_phone", "contact_email"].includes(k as string) && String(merged[k] ?? "").trim()
    );
    return hasContent ? merged : null;
  } catch {
    return null;
  }
};

const BoyDialog = ({
  open,
  onOpenChange,
  editing,
  profile,
  skipRules,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: BaarBoy | null;
  profile: CommunityProfile | null;
  skipRules: boolean;
  onSaved: () => void;
}) => {
  const [confirmed, setConfirmed] = useState<number[]>([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [similar, setSimilar] = useState<BaarBoy[]>([]);
  const [saving, setSaving] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [done, setDone] = useState(false);
  const [rulesDone, setRulesDone] = useState(false);
  const [restored, setRestored] = useState(false);

  const rulesNeeded = !editing && !skipRules && localStorage.getItem(RULES_KEY) !== "1";

  useEffect(() => {
    if (!open) return;
    setConfirmed([]);
    setNameTouched(false);
    setDone(false);
    setRulesDone(!rulesNeeded);
    setRestored(false);
    if (editing) {
      setDraft({
        ...EMPTY_DRAFT,
        full_name: editing.full_name,
        age: editing.age?.toString() ?? "",
        city: editing.city ?? "",
        status: editing.status ?? "",
        orientation: editing.orientation ?? "",
        ethnicity: editing.ethnicity ?? "",
        dress_style: editing.dress_style ?? "",
        details: editing.details ?? "",
        looking_for: editing.looking_for ?? "",
        positives: editing.positives ?? "",
        has_photo:
          editing.my_recommendation?.has_photo == null
            ? ""
            : editing.my_recommendation.has_photo
              ? "yes"
              : "no",
        relationship_type: editing.my_recommendation?.relationship_type ?? "",
        recommendation_note: editing.my_recommendation?.note ?? "",
        contact_mode: (editing.my_recommendation?.contact_mode as any) || "liba",
        contact_phone: editing.my_recommendation?.contact_phone ?? profile?.contact_whatsapp ?? "",
        contact_email: editing.my_recommendation?.contact_email ?? profile?.contact_email ?? "",
        proposal_contact_name: editing.proposal_contact_name ?? "",
        proposal_contact_phone: editing.proposal_contact_phone ?? "",
        proposal_contact_email: editing.proposal_contact_email ?? "",
      });
      setSimilar([]);
    } else {
      const saved = readSavedDraft();
      setDraft(
        saved ?? {
          ...EMPTY_DRAFT,
          contact_phone: profile?.contact_whatsapp ?? "",
          contact_email: profile?.contact_email ?? "",
        }
      );
      setRestored(!!saved);
      setSimilar([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, profile]);

  /* שמירה אוטומטית של הטופס כדי שהעבודה לא תלך לאיבוד */
  useEffect(() => {
    if (!open || editing || done) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [draft, open, editing, done]);

  const clearSavedDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  const startFresh = () => {
    clearSavedDraft();
    setDraft({
      ...EMPTY_DRAFT,
      contact_phone: profile?.contact_whatsapp ?? "",
      contact_email: profile?.contact_email ?? "",
    });
    setRestored(false);
  };


  useEffect(() => {
    if (editing || draft.full_name.trim().length < 2 || !nameTouched) {
      setSimilar([]);
      return;
    }
    const t = window.setTimeout(() => {
      findSimilarBoys(draft.full_name.trim(), editing?.id)
        .then((list) => setSimilar(list))
        .catch(() => setSimilar([]));
    }, 400);
    return () => window.clearTimeout(t);
  }, [draft.full_name, editing, nameTouched]);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setBirthYear = (value: string) => {
    setDraft((d) => {
      const year = Number(value);
      const age =
        value.length === 4 && year > 1920 && year <= new Date().getFullYear()
          ? String(new Date().getFullYear() - year)
          : d.age;
      return { ...d, birth_year: value, age };
    });
  };

  const allConfirmed = editing || !rulesNeeded ? true : confirmed.length === APPROVALS.length;
  const showRulesStep = rulesNeeded && !rulesDone;

  const goToForm = () => {
    if (!allConfirmed) return;
    try {
      localStorage.setItem(RULES_KEY, "1");
    } catch {
      /* ignore */
    }
    setRulesDone(true);
  };
  const ageNum = draft.age ? Number(draft.age) : null;
  const ageOutOfRange = ageNum !== null && (ageNum < 30 || ageNum > 49);

  const detailsLen = draft.details.trim().length;
  const detailsShort = detailsLen < DETAILS_MIN;
  const phone = draft.contact_phone.trim();
  const email = draft.contact_email.trim();
  const contactValid = phone.replace(/[^\d]/g, "").length >= 9 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const proposalContactValid =
    draft.proposal_contact_name.trim().length >= 2 &&
    draft.proposal_contact_phone.replace(/[^\d]/g, "").length >= 9 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.proposal_contact_email.trim());

  /** editing someone else's boy: her own recommendation is optional */
  const editOnly = !!editing && !editing.my_recommendation;

  /** exactly what is still missing, in her words */
  const missing: string[] = [
    draft.full_name.trim().length >= 2 ? "" : "שם הבחור",
    draft.status ? "" : "מצב אישי",
    draft.orientation ? "" : "אוריינטציה קהילתית",
    draft.ethnicity ? "" : "עדה",
    draft.relationship_type || editOnly ? "" : "סוג ההיכרות שלך איתו",
    detailsShort ? `פרטים על הבחור (עוד ${DETAILS_MIN - detailsLen} תווים לפחות)` : "",
    draft.has_photo || editOnly ? "" : "אם יש תמונה שלו",
    contactValid || editOnly ? "" : "טלפון או מייל שאפשר לפנות אלייך",
    proposalContactValid ? "" : "שם מלא, טלפון ומייל של איש הקשר להצעה",
  ].filter(Boolean);


  const submit = async () => {
    if (!allConfirmed) {
      toast.error("צריך לאשר את כללי הבאר לפני השמירה");
      return;
    }
    if (missing.length) {
      toast.error(`חסר למלא: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: draft.full_name.trim(),
        age: draft.age ? Number(draft.age) : null,
        city: draft.city.trim() || null,
        status: draft.status || null,
        orientation: draft.orientation || null,
        ethnicity: draft.ethnicity || null,
        dress_style: draft.dress_style || null,
        details: draft.details.trim() || null,
        looking_for: draft.looking_for.trim() || null,
        positives: draft.positives.trim() || null,
        photo_url: editing?.photo_url ?? null,
        relationship_type: draft.relationship_type,
        recommendation_note: draft.recommendation_note.trim() || null,
        contact_mode: draft.contact_mode,
        has_photo: draft.has_photo === "yes",
        contact_phone: phone || null,
        contact_email: email || null,
      };
      if (editing) {
        await updateBaarBoy(editing.id, payload);
        await setBaarProposalContact(editing.id, {
          name: draft.proposal_contact_name,
          phone: draft.proposal_contact_phone,
          email: draft.proposal_contact_email,
        });
        if (!editOnly || (payload.relationship_type && contactValid)) await recommendBaarBoy(
          editing.id,
          payload.relationship_type,
          payload.recommendation_note,
          payload.contact_mode,
          { has_photo: payload.has_photo, contact_phone: payload.contact_phone, contact_email: payload.contact_email }
        );
        toast.success("הפרופיל עודכן");
        onOpenChange(false);
      } else {
        const boyId = await createBaarBoy(payload);
        await setBaarProposalContact(boyId, {
          name: draft.proposal_contact_name,
          phone: draft.proposal_contact_phone,
          email: draft.proposal_contact_email,
        });
        clearSavedDraft();
        setDone(true);
      }
      onSaved();
    } catch (e: unknown) {
      const raw = (e as { message?: string })?.message || "";
      const nice =
        raw.includes("not_a_member") || raw.includes("no_access")
          ? "אין לך כרגע הרשאה להוסיף בחורים לבאר"
          : raw.includes("duplicate")
            ? "נראה שהבחור הזה כבר קיים בבאר"
            : /Unexpected token|not valid JSON|Failed to fetch|NetworkError|Load failed/i.test(raw)
              ? "נראה שהחיבור נחסם או נקטע באמצע. נסי שוב — ואם זה חוזר, נסי מחיבור אחר או דרי את הדף"
              : raw;
      toast.error(
        (editing ? "לא הצלחנו לעדכן" : "לא הצלחנו להוסיף את הבחור") + (nice ? ` — ${nice}` : ""),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      desktopContentClassName="max-w-xl"
      mobileContentClassName="h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)]"
      closeOnBackdrop={false}
    >
      <div dir="rtl" className="popup-scroll space-y-3 px-5 pb-24 pt-4 md:px-12 md:pb-10 md:pt-8">
        <div className="pe-10 pt-1 md:pe-0 md:pt-2">
          <p className="text-[11px] text-primary">{editing ? "עריכת פרופיל" : "הוספת בחור לבאר"}</p>
          <SectionTitle>טופס פרטי בחור מומלץ 🥇💙</SectionTitle>
          <p className="mt-2 text-[13px] font-light leading-relaxed text-muted-foreground">
            {editing ? `עורכים את ${draft.full_name || "הפרופיל"}` : showRulesStep ? "חשוב לנו שתקראי את כללי הבאר לפני שנמשיך" : "כמה טוב שאת מכניסה לנו מים לבאר."}
          </p>
        </div>

        {done ? (
          <FormCard className="py-10 text-center">
            <p className="text-[17px] font-light leading-relaxed text-foreground">
              המון המון תודה על ההשקעה, השותפות והאכפתיות — אין כמוך אחות אהובה ❤️
            </p>
            <p className="mt-3 text-[13.5px] font-light leading-relaxed text-muted-foreground">
              הפרטים נשמרו בבאר וזמינים לשותפות. אוהבות אותך,
              <br />
              חגית מועלם ושושי שמאי
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-6 rounded-full px-8">
              סיום
            </Button>
          </FormCard>
        ) : showRulesStep ? (
          <>
            {/* כללי הבאר — מוצג רק בפעם הראשונה */}
            <div className="space-y-3">
              {APPROVALS.map((a, i) => {
                  const ok = confirmed.includes(i);
                  return (
                    <FormCard key={i}>
                      <p className="text-[14.5px] font-normal text-foreground">{a.title}</p>
                      <p className="mt-1.5 whitespace-pre-wrap text-[13px] font-light leading-relaxed text-foreground/75">
                        {a.body}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmed((c) => (ok ? c.filter((x) => x !== i) : [...c, i]))
                        }
                        aria-pressed={ok}
                        className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-all ${
                          ok
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {ok && <span aria-hidden>✓</span>}
                        {a.chip}
                      </button>
                    </FormCard>
                  );
              })}
            </div>

            <FormCard className="popup-footer fixed inset-x-0 bottom-0 z-[60] flex justify-end rounded-none border-x-0 border-b-0 bg-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_hsl(var(--foreground)/0.06)] md:static md:mx-0 md:rounded-2xl md:border md:shadow-sm">
              <Button onClick={goToForm} disabled={!allConfirmed} className="h-12 w-full rounded-full bg-primary px-6 text-primary-foreground shadow-md shadow-primary/20 hover:bg-[hsl(var(--primary-glow))] md:w-auto">
                לשלב הבא
              </Button>
            </FormCard>
            {!allConfirmed && (
              <p className="pb-2 text-center text-[12px] font-light text-muted-foreground">
                כדי להמשיך צריך לאשר את כל הסעיפים למעלה 🌷
              </p>
            )}
          </>
        ) : (
          <>
            {restored && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-primary/[0.06] p-3.5">
                <p className="text-[12.5px] font-light text-foreground">
                  שמרנו לך את מה שהתחלת למלא — אפשר להמשיך מכאן 🌷
                </p>
                <button
                  type="button"
                  onClick={startFresh}
                  className="text-[12px] text-primary hover:opacity-70"
                >
                  התחלה מטופס ריק
                </button>
              </div>
            )}

            {/* שדות הטופס */}
            <fieldset className="contents">
              <FormCard>
                <Label text="שם מלא של הבחור" required />
                <input
                  autoFocus
                  value={draft.full_name}
                  onChange={(e) => {
                    set("full_name", e.target.value);
                    setNameTouched(true);
                  }}
                  placeholder="למשל: יהודה גולד"
                  className={inputCls}
                />
                {similar.length > 0 && !editing && (
                  <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
                    <p className="text-[13px] text-foreground">יכול להיות שהוא כבר בבאר</p>
                    <ul className="mt-2 space-y-2">
                      {similar.map((b) => (
                        <li key={b.id} className="flex items-center justify-between text-[13px]">
                          <span className="text-muted-foreground">
                            {b.full_name} · {b.age ? `${b.age} · ` : ""}
                            {b.city || b.orientation || ""}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onOpenChange(false);
                                window.dispatchEvent(
                                  new CustomEvent("baar:open-profile", { detail: { id: b.id, recommend: true } })
                                );
                              }}
                              className="rounded-full border border-primary/30 px-2.5 py-0.5 text-[11.5px] text-primary hover:bg-primary/[0.08]"
                            >
                              זה הוא — אני מצטרפת כממליצה
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onOpenChange(false);
                                window.dispatchEvent(new CustomEvent("baar:open-profile", { detail: { id: b.id } }));
                              }}
                              className="text-[12px] text-primary hover:opacity-70"
                            >
                              פתיחת הפרופיל
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </FormCard>

              <FormCard>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <Label text="גיל" />
                    <input
                      type="number"
                      value={draft.age}
                      onChange={(e) => set("age", e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label>
                    <Label text="שנת לידה" />
                    <input
                      type="number"
                      value={draft.birth_year}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="1985"
                      className={inputCls}
                    />
                  </label>
                </div>
                {ageOutOfRange && (
                  <p className="mt-2 text-[12px] text-destructive">
                    שימי לב — טווח הגילאים בבאר הוא 30-49
                  </p>
                )}
                <label className="mt-3 block">
                  <Label text="עיר" />
                  <input
                    value={draft.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="ירושלים"
                    className={inputCls}
                  />
                </label>
              </FormCard>

              <FormCard>
                <Label text="סטטוס מועמד" required />
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((o) => (
                    <Choice key={o.value} selected={draft.status === o.value} onClick={() => set("status", o.value)}>
                      {o.label}
                    </Choice>
                  ))}
                </div>
              </FormCard>

              <FormCard>
                <Label text="סוג ההיכרות שלך איתו" required />
                <div className="flex flex-wrap gap-2">
                  {RELATIONSHIP_OPTIONS.map((o) => (
                    <Choice
                      key={o.value}
                      selected={draft.relationship_type === o.value}
                      onClick={() => set("relationship_type", o.value)}
                    >
                      {o.label}
                    </Choice>
                  ))}
                </div>
              </FormCard>

              <FormCard>
                <Label text="אוריינטציה קהילתית" required />
                <div className="flex flex-wrap gap-2">
                  {ORIENTATION_OPTIONS.map((o) => (
                    <Choice
                      key={o.value}
                      selected={draft.orientation === o.value}
                      onClick={() => set("orientation", o.value)}
                    >
                      {o.label}
                    </Choice>
                  ))}
                </div>
              </FormCard>

              <FormCard>
                <Label text="סגנון לבוש" />
                <div className="flex flex-wrap gap-2">
                  {DRESS_STYLE_OPTIONS.map((o) => (
                    <Choice
                      key={o.value}
                      selected={draft.dress_style === o.value}
                      onClick={() => set("dress_style", o.value)}
                    >
                      {o.label}
                    </Choice>
                  ))}
                </div>
              </FormCard>

              <FormCard>
                <Label text="מוצא ועדה" required />
                <div className="flex flex-wrap gap-2">
                  {ETHNICITY_OPTIONS.map((o) => (
                    <Choice
                      key={o.value}
                      selected={draft.ethnicity === o.value}
                      onClick={() => set("ethnicity", o.value)}
                    >
                      {o.label}
                    </Choice>
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] text-muted-foreground">
                  אם ספרדי / חצי חצי — נא לציין איזו עדה בשדה הפרטים
                </p>
              </FormCard>

              <FormCard>
                <Label text="פרטים על הבחור" required />
                <p className="mb-1.5 text-[12px] font-light text-muted-foreground">
                  מקום לימוד, עיסוק, עבר ישיבתי, מה עושה היום, מראה כללי, עדה — בבקשה לפרט בהרחבה כמה שיותר
                </p>
                <textarea
                  rows={6}
                  value={draft.details}
                  onChange={(e) => set("details", e.target.value)}
                  className={textareaCls}
                />
                <p className={`mt-1.5 text-[11.5px] ${detailsShort ? "text-primary" : "text-muted-foreground"}`}>
                  {detailsShort
                    ? `עוד ${DETAILS_MIN - detailsLen} תווים לפחות — כמה מילים על כל אחד מהדברים למעלה`
                    : `${detailsLen} תווים — תודה על הפירוט 🌷`}
                </p>
              </FormCard>

              <FormCard>
                <Label text="מה הוא מחפש" />
                <p className="mb-1.5 text-[12px] font-light text-muted-foreground">
                  אם כתוב בקורות החיים שלו או איך שהתרשמת
                </p>
                <textarea
                  rows={3}
                  value={draft.looking_for}
                  onChange={(e) => set("looking_for", e.target.value)}
                  className={textareaCls}
                />
              </FormCard>

              <FormCard>
                <Label text="התרשמתי ש..." />
                <p className="mb-1.5 text-[12px] font-light text-muted-foreground">
                  כאן המקום לכתוב משהו חיובי שראית בו, תכונות שהתרשמת
                </p>
                <textarea
                  rows={3}
                  value={draft.positives}
                  onChange={(e) => set("positives", e.target.value)}
                  className={textareaCls}
                />
              </FormCard>

              <FormCard>
                <Label text="יש לך תמונה שלו?" required />
                <p className="mb-1.5 text-[12px] font-light text-muted-foreground">
                  תמונות לא עולות לאתר — רק כדי שמי שתתעניין תדע שאפשר לבקש ממך
                </p>
                <div className="flex flex-wrap gap-2">
                  <Choice selected={draft.has_photo === "yes"} onClick={() => set("has_photo", "yes")}>
                    יש לי תמונה
                  </Choice>
                  <Choice selected={draft.has_photo === "no"} onClick={() => set("has_photo", "no")}>
                    אין לי תמונה
                  </Choice>
                </div>
              </FormCard>

              <FormCard>
                <Label text="מה חשוב לך לומר עליו?" />
                <textarea
                  rows={3}
                  value={draft.recommendation_note}
                  onChange={(e) => set("recommendation_note", e.target.value)}
                  placeholder="אופציונלי — משהו שיעזור למי שתפנה אלייך"
                  className={textareaCls}
                />
              </FormCard>

              <FormCard>
                <Label text="איש קשר להצעת ההצעה" required />
                <p className="mb-3 text-[12px] font-light leading-relaxed text-muted-foreground">
                  מי יכולה לקבל פנייה ולהעביר לבחור את ההצעה? הפרטים יוצגו בכרטיס כדי שיהיה ברור למי לפנות.
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={draft.proposal_contact_name}
                    onChange={(e) => set("proposal_contact_name", e.target.value)}
                    placeholder="שם מלא"
                    className="md:col-span-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
                  />
                  <input
                    value={draft.proposal_contact_phone}
                    onChange={(e) => set("proposal_contact_phone", e.target.value)}
                    placeholder="טלפון"
                    inputMode="tel"
                    className={inputCls}
                  />
                  <input
                    value={draft.proposal_contact_email}
                    onChange={(e) => set("proposal_contact_email", e.target.value)}
                    placeholder="כתובת מייל"
                    inputMode="email"
                    className={inputCls}
                  />
                </div>
              </FormCard>

              <FormCard>
                <Label text="איך אפשר לפנות אלייך לבירור?" />
                <div className="flex flex-wrap gap-2">
                  <Choice selected={draft.contact_mode === "liba"} onClick={() => set("contact_mode", "liba")}>
                    דרך ליבה
                  </Choice>
                  <Choice selected={draft.contact_mode === "profile"} onClick={() => set("contact_mode", "profile")}>
                    דרך הפרטים שלי
                  </Choice>
                  <Choice selected={draft.contact_mode === "both"} onClick={() => set("contact_mode", "both")}>
                    גם דרך ליבה וגם ישירות
                  </Choice>
                </div>
                <p className="mt-2 text-[11.5px] text-muted-foreground">
                  {draft.contact_mode === "liba" && "מי שתפנה תוכל לכתוב לך דרך ליבה — הפרטים שלך נשמרים אצלנו ולא מוצגים."}
                  {draft.contact_mode === "profile" && "מי שתפנה תראה את הטלפון והמייל שכתבת כאן."}
                  {draft.contact_mode === "both" && "מי שתפנה תוכל לבחור: ליבה או הטלפון והמייל שכתבת כאן."}
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    value={draft.contact_phone}
                    onChange={(e) => set("contact_phone", e.target.value)}
                    placeholder="טלפון / וואטסאפ"
                    inputMode="tel"
                    className={inputCls}
                  />
                  <input
                    value={draft.contact_email}
                    onChange={(e) => set("contact_email", e.target.value)}
                    placeholder="כתובת מייל"
                    inputMode="email"
                    className={inputCls}
                  />
                </div>
                <p className={`mt-1.5 text-[11.5px] ${contactValid ? "text-muted-foreground" : "text-primary"}`}>
                  {contactValid
                    ? "הפרטים שמורים אצלנו כדי שנוכל להגיע אלייך במקרה הצורך."
                    : "חובה למלא טלפון או מייל — גם אם בחרת פנייה דרך ליבה."}
                </p>
              </FormCard>
            </fieldset>

            <FormCard className="popup-footer fixed inset-x-0 bottom-0 z-[60] space-y-3 rounded-none border-x-0 border-b-0 bg-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_hsl(var(--foreground)/0.06)] md:static md:mx-0 md:rounded-2xl md:border md:p-6 md:shadow-sm">
              {missing.length > 0 && (
                <div className="rounded-2xl bg-primary/[0.07] p-3">
                  <p className="text-[12.5px] font-medium text-primary">כמה דברים עוד חסרים:</p>
                  <ul className="mt-1 space-y-0.5">
                    {missing.map((m) => (
                      <li key={m} className="text-[12px] font-light text-foreground/80">
                        • {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={submit} disabled={saving} className="h-12 w-full rounded-full bg-primary px-6 text-primary-foreground shadow-md shadow-primary/20 hover:bg-[hsl(var(--primary-glow))] md:w-auto">
                  {saving && <Loader2 className="animate-spin" />}
                  {editing ? "שמירה" : "הוספה לבאר"}
                </Button>
              </div>
            </FormCard>
            {!editing && (
              <p className="pb-2 text-center text-[11.5px] font-light text-muted-foreground">
                מה שאת ממלאת נשמר אוטומטית — גם אם החלון ייסגר בטעות
              </p>
            )}
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
};

/* ------------------------------- Profile dialog ------------------------------- */

const ProfileDialog = ({
  boyId,
  onClose,
  onEdit,
  onArchive,
  profile,
  userId,
  autoRecommend = false,
}: {
  boyId: string | null;
  onClose: () => void;
  onEdit: (boy: BaarBoy) => void;
  onArchive: (id: string) => void;
  profile: CommunityProfile | null;
  userId: string;
  autoRecommend?: boolean;
}) => {
  const [boy, setBoy] = useState<BaarBoyProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [recForm, setRecForm] = useState({ relationship_type: "", note: "", contact_mode: "liba" as const });
  const [reportOpen, setReportOpen] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [deletion, setDeletion] = useState({ reason: "", details: "" });
  const [deletionSending, setDeletionSending] = useState(false);
  const [report, setReport] = useState({ reason: "", details: "" });
  const [recSaving, setRecSaving] = useState(false);
  const [contactTo, setContactTo] = useState<{ user: string; name: string } | null>(null);
  const { openChat } = useLibaChat();

  useEffect(() => {
    if (!boyId) {
      setBoy(null);
      return;
    }
    setLoading(true);
    fetchBaarProfile(boyId)
      .then((b) => {
        setBoy(b);
        const mine = b.recommendations.find((r) => r.user_id === userId);
        if (mine) {
          setRecForm({
            relationship_type: mine.relationship_type,
            note: mine.note || "",
            contact_mode: (mine.contact_mode as any) || "liba",
          });
        } else {
          setRecForm({ relationship_type: "", note: "", contact_mode: "liba" });
          if (autoRecommend) setRecOpen(true);
        }
      })
      .catch(() => toast.error("לא הצלחנו לטעון את הפרופיל"))
      .finally(() => setLoading(false));
  }, [boyId, userId, autoRecommend]);

  const saveRec = async () => {
    if (!boy || !recForm.relationship_type) return;
    setRecSaving(true);
    try {
      await recommendBaarBoy(boy.id, recForm.relationship_type, recForm.note, recForm.contact_mode);
      setRecOpen(false);
      const updated = await fetchBaarProfile(boy.id);
      setBoy(updated);
      toast.success("ההמלצה נשמרה");
    } catch {
      toast.error("לא הצלחנו לשמור את ההמלצה");
    } finally {
      setRecSaving(false);
    }
  };

  const removeRec = async () => {
    if (!boy) return;
    if (!window.confirm("לבטל את ההמלצה שלך?")) return;
    try {
      await removeBaarRecommendation(boy.id);
      const updated = await fetchBaarProfile(boy.id);
      setBoy(updated);
      toast.success("ההמלצה הוסרה");
    } catch {
      toast.error("לא הצלחנו להסיר");
    }
  };

  const submitReport = async () => {
    if (!boy || !report.reason) return;
    try {
      await reportBaarBoy(boy.id, report.reason, report.details);
      setReportOpen(false);
      toast.success("הדיווח נשלח לסקירה");
    } catch {
      toast.error("לא הצלחנו לשלוח את הדיווח");
    }
  };

  const submitDeletion = async () => {
    if (!boy || !deletion.reason) return;
    if (deletion.reason === "אחר" && deletion.details.trim().length < 2) {
      toast.error("כתבי בכמה מילים למה למחוק");
      return;
    }
    setDeletionSending(true);
    try {
      await requestBaarDeletion(boy.id, deletion.reason, deletion.details);
      setDeletionOpen(false);
      toast.success("הבקשה נשלחה למנהלת לאישור");
    } catch {
      toast.error("לא הצלחנו לשלוח את הבקשה");
    } finally {
      setDeletionSending(false);
    }
  };

  return (
    <ResponsiveDialog open={!!boyId} onOpenChange={(v) => !v && onClose()} desktopContentClassName="max-w-2xl">
      <div dir="rtl" className="popup-scroll px-5 pb-12 pt-2 md:px-14 md:pt-12">
        {loading || !boy ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* on phones the icons sit in their own top row so the name gets a full line */}
            <div className="flex flex-col-reverse items-stretch gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
              <div className="flex items-center gap-3">
                {boy.photo_url ? (
                  <img src={boy.photo_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <UserCircle className="h-8 w-8" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-[20px] font-semibold text-foreground md:text-[22px]">{boy.full_name}</h2>
                  <p className="mt-0.5 text-[13px] font-light text-muted-foreground">
                    {[
                      boy.age ? `${boy.age}` : null,
                      boy.city,
                      boy.status ? STATUS_OPTIONS.find((o) => o.value === boy.status)?.label || boy.status : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(boy)} aria-label="עריכה">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="עוד אפשרויות">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="text-right">
                    <DropdownMenuItem onSelect={() => setReportOpen(true)}>דיווח</DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        setDeletion({ reason: "", details: "" });
                        setDeletionOpen(true);
                      }}
                    >
                      בקשה למחיקת הבחור
                    </DropdownMenuItem>
                    {(boy.mine || boy.can_edit) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => {
                            if (window.confirm("לאפס את הפרופיל לארכיון?")) {
                              onArchive(boy.id);
                              onClose();
                            }
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          ארכוב
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="סגירה">
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                boy.status && STATUS_OPTIONS.find((o) => o.value === boy.status)?.label,
                boy.orientation,
                boy.ethnicity,
              ]
                .filter(Boolean)
                .map((tag) => (
                  <TagChip key={tag as string}>{tag as string}</TagChip>
                ))}
              <PhotoChip hasPhoto={boy.has_photo} />
            </div>

            {boy.dress_style && (
              <p className="text-[13.5px] font-light text-foreground/85">
                <span className="text-muted-foreground">סגנון לבוש: </span>
                {boy.dress_style}
              </p>
            )}

            {boy.details && (
              <div>
                <p className="text-[11.5px] tracking-[0.08em] text-muted-foreground">עוד עליו</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[14px] font-light leading-relaxed text-foreground/90">
                  {boy.details}
                </p>
              </div>
            )}

            {boy.looking_for && (
              <div>
                <p className="text-[11.5px] tracking-[0.08em] text-muted-foreground">מה הוא מחפש</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[14px] font-light leading-relaxed text-foreground/90">
                  {boy.looking_for}
                </p>
              </div>
            )}

            {boy.positives && (
              <div>
                <p className="text-[11.5px] tracking-[0.08em] text-muted-foreground">התרשמתי ש...</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[14px] font-light leading-relaxed text-foreground/90">
                  {boy.positives}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
              <p className="text-[14px] font-medium text-foreground">איש קשר להצעת ההצעה</p>
              {boy.proposal_contact_name && boy.proposal_contact_phone && boy.proposal_contact_email ? (
                <div className="mt-2 space-y-1 text-[13px] font-light text-foreground/80">
                  <p>{boy.proposal_contact_name}</p>
                  <p className="flex flex-wrap gap-x-3 gap-y-1">
                    <a href={`tel:${boy.proposal_contact_phone.replace(/[^\d+]/g, "")}`} className="text-primary hover:opacity-70">{boy.proposal_contact_phone}</a>
                    <a href={`mailto:${boy.proposal_contact_email}`} className="text-primary hover:opacity-70">{boy.proposal_contact_email}</a>
                  </p>
                </div>
              ) : (
                <Button type="button" variant="link" onClick={() => onEdit(boy)} className="mt-2 h-auto p-0 text-[12.5px] text-primary">
                  עדיין חסרים פרטים — להוספת איש קשר
                </Button>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <div className="mb-3">
                <p className="text-[15px] font-light text-foreground">
                  💗 {boy.recommendation_count} נשים בליבה ממליצות עליו
                </p>
              </div>
              {boy.recommendations.length === 0 ? (
                <p className="text-[13px] font-light text-muted-foreground">עוד אף אחת לא הוסיפה המלצה.</p>
              ) : (
                <ul className="space-y-3">
                  {boy.recommendations.map((rec) => (
                    <li key={rec.id} className="flex items-start gap-3 border-t border-border/50 pt-3 first:border-0 first:pt-0">
                      <MemberAvatar
                        name={rec.author.name}
                        seed={rec.author.seed ?? rec.user_id}
                        imageUrl={rec.author.avatar_url ?? null}
                        size="sm"
                        online={rec.author.online}
                        userId={rec.user_id}
                        context={{ sourceType: "baar", sourceId: boy.id, title: `הבאר · ${boy.full_name}`, subtitle: "המלצה בבאר", link: `/liba/baar?boy=${boy.id}` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {rec.user_id ? (
                            <button
                              onClick={() =>
                                openMemberProfile(rec.user_id!, {
                                  sourceType: "baar",
                                  sourceId: boy.id,
                                  title: `הבאר · ${boy.full_name}`,
                                  subtitle: "המלצה בבאר",
                                  link: `/liba/baar?boy=${boy.id}`,
                                })
                              }
                              className="text-[13px] font-medium text-foreground hover:text-primary"
                            >
                              {rec.author.name}
                            </button>
                          ) : (
                            <span className="text-[13px] font-medium text-foreground">{rec.author.name}</span>
                          )}
                          <span className="text-[11.5px] text-muted-foreground">
                            {RELATIONSHIP_OPTIONS.find((o) => o.value === rec.relationship_type)?.label || rec.relationship_type}
                          </span>
                          {rec.user_id && rec.user_id === userId && (
                            <button
                              onClick={() => {
                                setRecForm({
                                  relationship_type: rec.relationship_type,
                                  note: rec.note || "",
                                  contact_mode: (rec.contact_mode as any) || "liba",
                                });
                                setRecOpen(true);
                              }}
                              className="text-[11px] text-primary hover:opacity-70"
                            >
                              עריכה
                            </button>
                          )}
                          {rec.user_id && rec.user_id !== userId &&
                            ["liba", "both"].includes((rec.contact_mode as string) || "liba") && (
                              <button
                                onClick={() =>
                                  void openChat({
                                    userId: rec.user_id!,
                                    sourceType: "baar",
                                    sourceId: boy.id,
                                    contextTitle: boy.full_name,
                                    contextSubtitle: `${rec.author.name} ממליצה עליו · ${
                                      RELATIONSHIP_OPTIONS.find((o) => o.value === rec.relationship_type)?.label ||
                                      rec.relationship_type
                                    }`,
                                    contextLink: `/liba/baar?boy=${boy.id}`,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-2.5 py-0.5 text-[11px] text-primary transition-colors hover:bg-primary/[0.08]"
                              >
                                <MessageCircle className="h-3 w-3" />
                                פנייה דרך ליבה
                              </button>
                            )}
                          {rec.has_photo && (
                            <span className="rounded-full bg-primary/[0.08] px-2 py-0.5 text-[11px] text-primary">
                              יש תמונה — אפשר לבקש ממנה
                            </span>
                          )}
                          {(() => {
                            const p = rec.contact_phone ?? (!rec.user_id ? rec.legacy_phone : null);
                            const m = rec.contact_email ?? (!rec.user_id ? rec.legacy_email : null);
                            if (!p && !m) return null;
                            return (
                              <span className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                                {p && (
                                  <a href={`tel:${p.replace(/[^\d+]/g, "")}`} className="text-primary hover:opacity-70">
                                    {p}
                                  </a>
                                )}
                                {m && (
                                  <a href={`mailto:${m}`} className="text-primary hover:opacity-70">
                                    {m}
                                  </a>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                        {rec.note && (
                          <p className="mt-1 text-[13px] font-light leading-relaxed text-foreground/80">{rec.note}</p>
                        )}
                      </div>

                    </li>
                  ))}
                </ul>
              )}
              {!boy.my_recommendation && (
                <Button
                  variant="outline"
                  onClick={() => setRecOpen(true)}
                  className="mt-4 h-11 w-full rounded-full border-primary text-[14.5px] font-light text-primary hover:bg-primary/5 hover:text-primary"
                >
                  רוצה להמליץ עליו גם
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {recOpen && (
        <div
          dir="rtl"
          className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl border-t border-border bg-card p-5 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.12)] md:relative md:inset-auto md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
        >
          <div className="mb-4">
            <p className="text-[11px] text-primary">המלצה</p>
            <p className="text-[18px] font-light text-foreground">איך את מכירה אותו?</p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIP_OPTIONS.map((o) => (
                <Choice
                  key={o.value}
                  selected={recForm.relationship_type === o.value}
                  onClick={() => setRecForm((f) => ({ ...f, relationship_type: o.value }))}
                >
                  {o.label}
                </Choice>
              ))}
            </div>
            <textarea
              rows={3}
              value={recForm.note}
              onChange={(e) => setRecForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="מה חשוב לך לומר עליו?"
              className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[14px] outline-none focus:border-primary"
            />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setRecOpen(false)}>
                ביטול
              </Button>
              <div className="flex gap-2">
                {boy?.my_recommendation && (
                  <Button variant="outline" onClick={removeRec} className="rounded-full">
                    הסרת ההמלצה
                  </Button>
                )}
                <Button onClick={saveRec} disabled={!recForm.relationship_type || recSaving} className="rounded-full px-5">
                  {recSaving && <Loader2 className="animate-spin" />}
                  שמירה
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div
          dir="rtl"
          className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl border-t border-border bg-card p-5 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.12)] md:relative md:inset-auto md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
        >
          <div className="mb-4">
            <p className="text-[11px] text-primary">דיווח</p>
            <p className="text-[18px] font-light text-foreground">מה תרצי לדווח?</p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((o) => (
                <Choice
                  key={o.value}
                  selected={report.reason === o.value}
                  onClick={() => setReport((r) => ({ ...r, reason: o.value }))}
                >
                  {o.label}
                </Choice>
              ))}
            </div>
            <textarea
              rows={3}
              value={report.details}
              onChange={(e) => setReport((r) => ({ ...r, details: e.target.value }))}
              placeholder="פרטים נוספים (אופציונלי)"
              className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[14px] outline-none focus:border-primary"
            />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setReportOpen(false)}>
                ביטול
              </Button>
              <Button onClick={submitReport} disabled={!report.reason} className="rounded-full px-5">
                שליחת דיווח
              </Button>
            </div>
          </div>
        </div>
      )}

      {deletionOpen && (
        <div
          dir="rtl"
          className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl border-t border-border bg-card p-5 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.12)] md:relative md:inset-auto md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none"
        >
          <div className="mb-4">
            <p className="text-[11px] text-primary">בקשה למחיקה</p>
            <p className="text-[18px] font-light text-foreground">למה למחוק את {boy?.full_name}?</p>
            <p className="mt-1 text-[12px] font-light text-muted-foreground">הבקשה תגיע למנהלת, והבחור יימחק רק אחרי אישור.</p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {DELETION_REASONS.map((o) => (
                <Choice key={o} selected={deletion.reason === o} onClick={() => setDeletion((d) => ({ ...d, reason: o }))}>
                  {o}
                </Choice>
              ))}
            </div>
            <textarea
              rows={3}
              value={deletion.details}
              onChange={(e) => setDeletion((d) => ({ ...d, details: e.target.value }))}
              placeholder={deletion.reason === "אחר" ? "כתבי למה (חובה)" : "הסבר נוסף (אופציונלי)"}
              className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[14px] outline-none focus:border-primary"
            />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setDeletionOpen(false)}>ביטול</Button>
              <Button onClick={submitDeletion} disabled={!deletion.reason || deletionSending} className="rounded-full px-5">
                {deletionSending && <Loader2 className="h-4 w-4 animate-spin" />}
                שליחה לאישור
              </Button>
            </div>
          </div>
        </div>
      )}

      {contactTo && boy && (
        <BaarInquiryComposer
          open={!!contactTo}
          onOpenChange={(v) => !v && setContactTo(null)}
          boyId={boy.id}
          boyName={boy.full_name}
          toUser={contactTo.user}
          toName={contactTo.name}
        />
      )}
    </ResponsiveDialog>
  );
};

/* ------------------------------- Card / Row ------------------------------- */

const SaveButton = ({
  saved,
  onToggle,
  className = "",
}: {
  saved: boolean;
  onToggle: (e: React.MouseEvent) => void;
  className?: string;
}) => (
  <button
    onClick={onToggle}
    aria-label={saved ? "הסרה מהשמורים" : "שמירת הבחור"}
    title={saved ? "שמור אצלך — לחיצה תסיר" : "שמירה לאזור האישי"}
    className={`rounded-full p-1.5 transition-colors ${
      saved ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-primary"
    } ${className}`}
  >
    {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
  </button>
);

const BoyCard = ({
  boy,
  onOpen,
  onEdit,
  onToggleSave,
}: {
  boy: BaarBoy;
  onOpen: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onToggleSave: (e: React.MouseEvent) => void;
}) => (
  <article
    onClick={onOpen}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen();
      }
    }}
    className="group relative flex min-h-[220px] cursor-pointer flex-col rounded-3xl border border-border/70 bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:border-primary/30 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    dir="rtl"
  >
    <div className="absolute left-3 top-3 flex items-center gap-0.5">
      <SaveButton saved={!!boy.saved} onToggle={onToggleSave} />
      {true && (
        <button
          onClick={onEdit}
          className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
          aria-label="עריכה"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
    <div className="flex items-start gap-3">
      {boy.photo_url ? (
        <img src={boy.photo_url} alt="" className="h-12 w-12 rounded-2xl object-cover" />
      ) : (
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <UserCircle className="h-6 w-6" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[22px] font-semibold leading-tight text-foreground">{boy.full_name}</h3>
        <p className="mt-0.5 text-[12.5px] font-light text-muted-foreground">
          {[
            boy.age ? `${boy.age}` : null,
            boy.status ? STATUS_OPTIONS.find((o) => o.value === boy.status)?.label || boy.status : null,
            boy.city,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>

    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      {[boy.orientation, boy.ethnicity]
        .filter(Boolean)
        .map((tag) => (
          <TagChip key={tag as string}>{tag as string}</TagChip>
        ))}
      <PhotoDot hasPhoto={boy.has_photo} />
    </div>

    {boy.details && (
      <p className="mt-3 line-clamp-3 flex-1 text-[13px] font-light leading-relaxed text-foreground/75">
        {boy.details}
      </p>
    )}

    <div className="mt-auto flex items-center justify-between pt-3">
      {boy.recommendation_count > 0 ? (
        <span className="text-[12.5px] font-light text-primary">
          💗 {boy.recommendation_count} ממליצות
        </span>
      ) : (
        <span className="text-[12px] font-light text-muted-foreground">עוד אין המלצות</span>
      )}
      <span className="text-[12px] font-light text-primary">לפרטים</span>
    </div>
  </article>
);

const BoyRow = ({
  boy,
  onOpen,
  onToggleSave,
}: {
  boy: BaarBoy;
  onOpen: () => void;
  onToggleSave: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onOpen}
    className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border-b border-border/40 px-2 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[1.2fr_0.5fr_0.8fr_0.8fr_0.8fr_0.75fr_0.9fr_auto]"
    dir="rtl"
  >
    <div className="flex items-center gap-3">
      {boy.photo_url ? (
        <img src={boy.photo_url} alt="" className="hidden h-9 w-9 rounded-xl object-cover md:block" />
      ) : (
        <div className="hidden h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary md:grid">
          <UserCircle className="h-5 w-5" />
        </div>
      )}
      <span className="text-[17px] font-semibold text-foreground">{boy.full_name}</span>
    </div>
    <span className="hidden text-[13px] font-light text-muted-foreground md:block">
      {boy.age ?? "—"}
    </span>
    <span className="hidden text-[13px] font-light text-muted-foreground md:block">
      {STATUS_OPTIONS.find((o) => o.value === boy.status)?.label || boy.status || "—"}
    </span>
    <span className="hidden text-[13px] font-light text-muted-foreground md:block">
      {boy.orientation || "—"}
    </span>
    <span className="hidden text-[13px] font-light text-muted-foreground md:block">
      {boy.ethnicity || "—"}
    </span>
    <span className="hidden md:block"><PhotoDot hasPhoto={boy.has_photo} /></span>
    <span className="text-[12.5px] font-light text-primary">
      {boy.recommendation_count > 0 ? `💗 ${boy.recommendation_count} ממליצות` : "—"}
    </span>
    <span className="flex items-center gap-1">
      <SaveButton saved={!!boy.saved} onToggle={onToggleSave} />
      <span className="text-[12px] font-light text-muted-foreground">לפרטים</span>
    </span>
  </div>
);

/* ------------------------------- Filters ------------------------------- */

const FilterDrawer = ({
  filters,
  onChange,
}: {
  filters: BaarFilters;
  onChange: (f: BaarFilters) => void;
}) => {
  const [open, setOpen] = useState(false);
  const hasActive =
    filters.status ||
    filters.orientation ||
    filters.ethnicity ||
    filters.dress_style ||
    filters.minAge ||
    filters.maxAge ||
    filters.hasRecommendations;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="סינון"
        className={`h-9 w-9 shrink-0 rounded-full p-0 text-[12.5px] font-light md:w-auto md:px-3.5 ${
          hasActive ? "border-primary text-primary" : "text-muted-foreground"
        }`}
      >
        <Filter className="h-4 w-4 md:ml-1.5" />
        <span className="hidden md:inline">סינון</span>
      </Button>

      <ResponsiveDialog open={open} onOpenChange={setOpen} desktopContentClassName="max-w-lg">
        <div dir="rtl" className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-10 py-8 md:px-14 md:py-8">
            <SectionTitle>סינון</SectionTitle>
            <Button variant="ghost" size="sm" onClick={() => onChange({ query: filters.query, sort: filters.sort })}>ניקוי</Button>
          </div>
          <div className="popup-scroll space-y-0 px-5 md:space-y-6 md:px-14 md:py-8">
            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="סטטוס" />
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((o) => (
                  <Choice
                    key={o.value}
                    selected={filters.status === o.value}
                    onClick={() =>
                      onChange({ ...filters, status: filters.status === o.value ? undefined : o.value })
                    }
                  >
                    {o.label}
                  </Choice>
                ))}
              </div>
            </div>
            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="אוריינטציה קהילתית" />
              <div className="flex flex-wrap gap-2">
                {ORIENTATION_OPTIONS.map((o) => (
                  <Choice
                    key={o.value}
                    selected={filters.orientation === o.value}
                    onClick={() =>
                      onChange({ ...filters, orientation: filters.orientation === o.value ? undefined : o.value })
                    }
                  >
                    {o.label}
                  </Choice>
                ))}
              </div>
            </div>
            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="עדה" />
              <div className="flex flex-wrap gap-2">
                {ETHNICITY_OPTIONS.map((o) => (
                  <Choice
                    key={o.value}
                    selected={filters.ethnicity === o.value}
                    onClick={() =>
                      onChange({ ...filters, ethnicity: filters.ethnicity === o.value ? undefined : o.value })
                    }
                  >
                    {o.label}
                  </Choice>
                ))}
              </div>
            </div>
            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="סגנון לבוש" />
              <div className="flex flex-wrap gap-2">
                {DRESS_STYLE_OPTIONS.map((o) => (
                  <Choice
                    key={o.value}
                    selected={filters.dress_style === o.value}
                    onClick={() =>
                      onChange({ ...filters, dress_style: filters.dress_style === o.value ? undefined : o.value })
                    }
                  >
                    {o.label}
                  </Choice>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-b border-border/70 py-5 md:border-0 md:py-0">
              <label>
                <Label text="גיל מינימום" />
                <input
                  type="number"
                  value={filters.minAge ?? ""}
                  onChange={(e) =>
                    onChange({ ...filters, minAge: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[14px] outline-none focus:border-primary"
                />
              </label>
              <label>
                <Label text="גיל מקסימום" />
                <input
                  type="number"
                  value={filters.maxAge ?? ""}
                  onChange={(e) =>
                    onChange({ ...filters, maxAge: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[14px] outline-none focus:border-primary"
                />
              </label>
            </div>
            <div className="flex items-center gap-2 border-b border-border/70 py-5 md:border-0 md:py-0">
              <button
                onClick={() => onChange({ ...filters, hasRecommendations: !filters.hasRecommendations })}
                className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                  filters.hasRecommendations ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {filters.hasRecommendations && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className="text-[13px] font-light text-foreground">רק עם המלצות</span>
            </div>
            <div className="flex items-center gap-2 border-b border-border/70 py-5 md:border-0 md:py-0">
              <button onClick={() => onChange({ ...filters, sort: filters.sort === "saved" ? "new" : "saved" })} className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${filters.sort === "saved" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                {filters.sort === "saved" && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className="text-[13px] font-light text-foreground">השמורים שלי</span>
            </div>
          </div>
          <div className="popup-footer p-4 pt-4 md:bg-background">
            <Button onClick={() => setOpen(false)} className="h-12 w-full rounded-md text-[15px] md:ms-auto md:h-10 md:w-auto md:rounded-full md:px-6">
              הצגת {" "}תוצאות
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
};

/* ---------------------------- Quick filters ------------------------------ */

const AGE_SLIDER_MIN = 28;
const AGE_SLIDER_MAX = 46; // 46 displayed as "45+" (no upper limit)

const formatAge = (v: number) => (v >= AGE_SLIDER_MAX ? "45+" : String(v));

const AgeRangeSlider = ({
  filters,
  onChange,
}: {
  filters: BaarFilters;
  onChange: (f: BaarFilters) => void;
}) => {
  const [val, setVal] = useState<[number, number]>([
    filters.minAge ?? AGE_SLIDER_MIN,
    filters.maxAge ?? AGE_SLIDER_MAX,
  ]);

  useEffect(() => {
    setVal([filters.minAge ?? AGE_SLIDER_MIN, filters.maxAge ?? AGE_SLIDER_MAX]);
  }, [filters.minAge, filters.maxAge]);

  const active = filters.minAge != null || filters.maxAge != null;

  return (
    <div className="flex w-40 shrink-0 flex-col justify-center gap-1 px-1" dir="rtl">
      <span className={`text-[11.5px] font-light ${active ? "text-primary" : "text-muted-foreground"}`}>
        גיל: {formatAge(val[0])}–{formatAge(val[1])}
      </span>
      <SliderPrimitive.Root
        dir="rtl"
        className="relative flex h-4 w-full touch-none select-none items-center"
        min={AGE_SLIDER_MIN}
        max={AGE_SLIDER_MAX}
        step={1}
        minStepsBetweenThumbs={1}
        value={val}
        onValueChange={(v) => setVal([v[0], v[1]] as [number, number])}
        onValueCommit={(v) =>
          onChange({
            ...filters,
            minAge: v[0] <= AGE_SLIDER_MIN ? undefined : v[0],
            maxAge: v[1] >= AGE_SLIDER_MAX ? undefined : v[1],
          })
        }
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label="גיל מינימלי"
          className="block h-4 w-4 cursor-grab rounded-full border-2 border-primary bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <SliderPrimitive.Thumb
          aria-label="גיל מקסימלי"
          className="block h-4 w-4 cursor-grab rounded-full border-2 border-primary bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </SliderPrimitive.Root>
    </div>
  );
};

const quickFilterTrigger = (active: boolean) =>
  `h-9 w-auto min-w-[7.5rem] shrink-0 justify-between gap-1.5 rounded-full border px-3 text-[12.5px] font-light outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
  }`;

const QuickFilters = ({
  filters,
  onChange,
}: {
  filters: BaarFilters;
  onChange: (f: BaarFilters) => void;
}) => {
  return <DirectoryFilter label="עדה" value={filters.ethnicity ?? "__all__"} onChange={(value) => onChange({ ...filters, ethnicity: value === "__all__" ? undefined : value })} options={[{ value: "__all__", label: "הכול" }, ...ETHNICITY_OPTIONS]} />;
};


/* ------------------------------- Main page ------------------------------- */

const BaarPage = () => {
  const { session, loading: sessionLoading } = useCommunitySession();
  /* if she was already allowed in during this visit, open straight away */
  const remembered = cachedGrant<BaarAccessState>("baar");
  const [access, setAccess] = useState<AccessGateState>(remembered ? "granted" : "loading");
  const [boot, setBoot] = useState<BaarAccessState | null>(remembered);
  const [authOpen, setAuthOpen] = useState(false);
  const [boys, setBoys] = useState<BaarBoy[]>([]);
  const [totalBoys, setTotalBoys] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BaarFilters>({ sort: "new" });
  const [view, setView] = useState<"cards" | "rows">(() => {
    if (typeof window === "undefined") return "cards";
    try {
      return localStorage.getItem(VIEW_KEY) === "rows" ? "rows" : "cards";
    } catch {
      return "cards";
    }
  });
  const [openBoyId, setOpenBoyId] = useState<string | null>(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("boy") : null),
  );
  const [autoRecommend, setAutoRecommend] = useState(false);
  const [inquiriesOpen, setInquiriesOpen] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pniot") === "1",
  );
  const [inquiryUnread, setInquiryUnread] = useState(0);
  const [editingBoy, setEditingBoy] = useState<BaarBoy | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  /* deep link from the daily card email — land straight on the add flow */
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("add") === "1") {
      setCreateOpen(true);
    }
  }, []);

  const checkAccess = useCallback(async () => {
    if (sessionLoading) return;
    if (!session) {
      rememberGrant("baar", null);
      setAccess("anon");
      return;
    }
    /* only make her wait when we have nothing to show yet */
    if (!cachedGrant<BaarAccessState>("baar")) setAccess("loading");
    try {
      const b = await baarBootstrap();
      setBoot(b);
      if (!b.authenticated || !b.authorized) {
        rememberGrant("baar", null);
        setAccess("denied");
      } else {
        rememberGrant("baar", b);
        setAccess("granted");
      }
    } catch (e: any) {
      if (cachedGrant<BaarAccessState>("baar")) return; // keep what she already sees
      setAccess(/fetch|network|failed to fetch/i.test(e?.message || "") ? "offline" : "denied");
    }
  }, [session?.user.id, sessionLoading]);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  const loadList = useCallback(async () => {
    if (!boot?.baar_access) return;
    setLoading(true);
    try {
      const result = await fetchBaarList(filters, PAGE, (currentPage - 1) * PAGE);
      setBoys(result.items);
      setTotalBoys(result.total);
    } catch {
      toast.error("לא הצלחנו לטעון את הבאר");
      setBoys([]);
      setTotalBoys(0);
    } finally {
      setLoading(false);
    }
  }, [boot?.baar_access, currentPage, filters]);

  useEffect(() => {
    if (boot?.baar_access) void loadList();
  }, [boot?.baar_access, loadList]);

  const handleToggleSave = useCallback(
    async (boy: BaarBoy, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = !boy.saved;
      setBoys((list) => list.map((b) => (b.id === boy.id ? { ...b, saved: next } : b)));
      try {
        await toggleBaarSave(boy.id);
        toast.success(next ? "נשמר לאזור האישי שלך" : "הוסר מהשמורים");
        if (!next && filters.sort === "saved") void loadList();
      } catch {
        setBoys((list) => list.map((b) => (b.id === boy.id ? { ...b, saved: !next } : b)));
        toast.error("לא הצלחנו לשמור כרגע");
      }
    },
    [filters.sort, loadList]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | { id: string; recommend?: boolean }>).detail;
      if (typeof detail === "string") {
        setAutoRecommend(false);
        setOpenBoyId(detail);
      } else if (detail?.id) {
        setAutoRecommend(!!detail.recommend);
        setOpenBoyId(detail.id);
      }
    };
    window.addEventListener("baar:open-profile", handler);
    return () => window.removeEventListener("baar:open-profile", handler);
  }, []);

  const refreshInquiryCount = useCallback(async () => {
    if (!boot?.baar_access) return;
    try {
      const list = await fetchBaarInquiryThreads();
      setInquiryUnread(list.reduce((sum, t) => sum + (t.unread || 0), 0));
    } catch {
      /* ignore */
    }
  }, [boot?.baar_access]);

  useEffect(() => {
    void refreshInquiryCount();
  }, [refreshInquiryCount]);

  const handleArchive = async (id: string) => {
    try {
      await archiveBaarBoy(id);
      toast.success("הפרופיל עבר לארכיון");
      setBoys((list) => list.filter((b) => b.id !== id));
      setTotalBoys((total) => Math.max(0, total - 1));
    } catch {
      toast.error("לא הצלחנו לארכב");
    }
  };

  const pageCount = Math.max(1, Math.ceil(totalBoys / PAGE));
  const visiblePages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === pageCount || Math.abs(page - currentPage) <= 1,
  );

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(pageCount, Math.max(1, page)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (access !== "granted") {
    return (
      <div dir="rtl" className="min-h-screen bg-background">
        <LibaTopBar active="baar" sticky={false} />
        <AccessGate
          state={access}
          onSignIn={async (m) => {
            if (m === "google") {
              try {
                await signInWithGoogle("/liba/baar");
              } catch {
                toast.error("ההתחברות דרך Google לא הושלמה. אפשר להתחבר עם קוד לאימייל.");
              }
              return;
            }
            setAuthOpen(true);
          }}
          onRetry={checkAccess}
          offlineTitle="הבאר זמין כשיש חיבור לרשת"
          gateTitle="הבאר מיועד לחברות הקהילה"
          requestTitle="בקשת גישה לבאר"
        />
        <AuthDialog
          initialMode="choose"
          open={authOpen}
          onOpenChange={setAuthOpen}
          title="כמה טוב שאת כאן"
          description="ההתחברות היא רק כדי שנדע שזו את."
          redirectPath="/liba/baar"
        />
      </div>
    );
  }

  const bootTyped = boot as BaarAccessState & { authenticated: true; authorized: true };
  const hasAccess = bootTyped.baar_access;
  const profile = bootTyped.profile;

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-20 md:pb-0">
      <LibaTopBar
        active="baar"
        actions={
          <LibaHeaderActions
            me={{ displayName: profile?.display_name ?? "חברה", avatarUrl: profile?.avatar_url ?? null }}
            isAdmin={!!bootTyped.is_admin}
            onSignOut={() => supabase.auth.signOut()}
            onInquiries={hasAccess ? () => setInquiriesOpen(true) : undefined}
            inquiriesUnread={hasAccess ? inquiryUnread : 0}
          />
        }
      />

      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        {!hasAccess ? (
          <div className="mx-auto max-w-xl rounded-[28px] border border-border/70 bg-card p-8 text-center md:p-12">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Heart className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-light text-foreground">כדי להיכנס לבאר, מוסיפות שני בחורים למאגר</h1>
            <p className="mt-3 text-[15px] font-light leading-relaxed text-muted-foreground">
              הבאר נבנה על ידי הקהילה. כל אחת תורמת את מה שיש לה, וביחד יוצרים משאב אמין.
            </p>
            <div className="mt-8">
              {bootTyped.my_boys === 0 && (
                <p className="mb-4 text-[14px] text-muted-foreground">עוד לא הוספת בחורים. בואי נתחיל?</p>
              )}
              {bootTyped.my_boys === 1 && (
                <p className="mb-4 text-[14px] text-primary">אחד כבר בפנים 💗 עוד בחור אחד והבאר נפתחת עבורך.</p>
              )}
              <Button onClick={() => setCreateOpen(true)} className="rounded-full px-7">
                <Plus className="h-4 w-4" />
                הוספת בחור
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DirectoryHeading title="הבאר">
              <p>הבאר היא מאגר בחורים מומלצים של חברות אחותי כלה. לכל בחור יש חברה שמכירה אותו או המליצה עליו, וניתן לפנות אליה כדי לקבל מידע נוסף.</p>
              <p>בכרטיס הבחור תוכלי לקרוא פרטים, המלצות ומידע שנוסף על ידי חברות, ולמצוא את פרטי איש הקשר להצעה. אפשר לשמור כרטיסים באזור האישי ולסנן את המאגר לפי הפרטים שחשובים לך.</p>
              <p>מכירה בחור שיכול להתאים? הוסיפי אותו למאגר, או הוסיפי מידע והמלצה לכרטיס קיים. המידע הוא נקודת פתיחה להיכרות ולבירור אישי, ולא תחליף לבדיקה שלך.</p>
            </DirectoryHeading>
            <div className="mb-3 flex flex-nowrap items-center gap-2 md:flex-wrap">
              <DirectoryAdd onClick={() => setCreateOpen(true)} label="הוספת בחור" />
              <label className="relative min-w-0 flex-1 md:w-56 md:max-w-full md:flex-none md:shrink-0">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={filters.query || ""}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setFilters((f) => ({ ...f, query: e.target.value }));
                  }}
                  placeholder="חיפוש לפי שם..."
                  className="h-9 w-full rounded-full border border-border bg-card py-2 pe-4 ps-10 text-[13.5px] outline-none focus:border-primary"
                />
              </label>
              <div className="hidden items-center gap-2 md:flex">
                <AgeRangeSlider
                  filters={filters}
                  onChange={(next) => {
                    setCurrentPage(1);
                    setFilters(next);
                  }}
                />
                <QuickFilters
                  filters={filters}
                  onChange={(next) => {
                    setCurrentPage(1);
                    setFilters(next);
                  }}
                />
              </div>
              <button
                onClick={() => {
                  setCurrentPage(1);
                  setFilters((f) => ({ ...f, sort: f.sort === "saved" ? "new" : "saved" }));
                }}
                className={`hidden h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-light transition-colors md:inline-flex ${
                  filters.sort === "saved"
                    ? "border-primary/40 bg-[hsl(var(--primary)/0.1)] text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {filters.sort === "saved" ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                השמורים שלי
              </button>
              <FilterDrawer
                filters={filters}
                onChange={(next) => {
                  setCurrentPage(1);
                  setFilters(next);
                }}
              />
              <div className="ms-auto"><DirectoryView value={view === "cards" ? "cards" : "list"} onChange={(v) => setView(v === "cards" ? "cards" : "rows")} /></div>
            </div>
            <p className="mb-5 text-right text-[12px] font-light text-muted-foreground">{totalBoys} בחורים במאגר</p>
            {view === "rows" && boys.length > 0 && (
              <div className="hidden grid-cols-[1.2fr_0.5fr_0.8fr_0.8fr_0.8fr_0.75fr_0.9fr_auto] gap-4 border-b border-border/60 pb-2 text-[12px] font-light text-muted-foreground md:grid" dir="rtl">
                <span>שם</span>
                <span>גיל</span>
                <span>סטטוס</span>
                <span>אוריינטציה</span>
                <span>עדה</span>
                <span>תמונה</span>
                <span>ממליצות</span>
                <span />
              </div>
            )}

            {loading ? (
              <div className="grid min-h-[70vh] place-items-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : boys.length === 0 ? (
              filters.sort === "saved" ? (
                <EmptyState
                  message="עוד לא שמרת בחורים"
                  description="כשתראי בחור שתרצי לחזור אליו, אפשר לשמור בלחיצה על הסימנייה בכרטיס."
                  action={{ label: "לכל הבחורים בבאר", onClick: () => setFilters({ sort: "new" }) }}
                />
              ) : (
                <EmptyState
                  message="לא מצאנו בחור שמתאים לכל הסינונים האלה"
                  description="אפשר לנקות חלק מהסינונים ולנסות שוב."
                  action={{
                    label: "ניקוי חלק מהסינונים",
                    onClick: () => setFilters({ query: filters.query, sort: filters.sort }),
                  }}
                />
              )
            ) : view === "cards" ? (
              <div className="grid min-h-[70vh] grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" dir="rtl">
                {boys.map((boy) => (
                  <BoyCard
                    key={boy.id}
                    boy={boy}
                    onOpen={() => setOpenBoyId(boy.id)}
                    onToggleSave={(e) => void handleToggleSave(boy, e)}
                    onEdit={(e) => {
                      e.stopPropagation();
                      setEditingBoy(boy);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="min-h-[70vh] divide-y divide-border/40" dir="rtl">
                {boys.map((boy) => (
                  <BoyRow
                    key={boy.id}
                    boy={boy}
                    onOpen={() => setOpenBoyId(boy.id)}
                    onToggleSave={(e) => void handleToggleSave(boy, e)}
                  />
                ))}
              </div>
            )}

            {totalBoys > 0 && (
              <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="מעבר בין עמודי הבאר" dir="ltr">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="לעמוד הקודם"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {visiblePages.map((page, index) => {
                  const previous = visiblePages[index - 1];
                  return (
                    <span key={page} className="contents">
                      {previous && page - previous > 1 && <span className="px-1 text-muted-foreground">…</span>}
                      <Button
                        variant={page === currentPage ? "default" : "outline"}
                        size="icon"
                        className="h-9 w-9 rounded-full tabular-nums"
                        onClick={() => goToPage(page)}
                        aria-current={page === currentPage ? "page" : undefined}
                        aria-label={`עמוד ${page}`}
                      >
                        {page}
                      </Button>
                    </span>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pageCount}
                  aria-label="לעמוד הבא"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            )}
          </>
        )}
      </main>

      <BoyDialog
        open={createOpen || !!editingBoy}
        onOpenChange={(v) => {
          if (!v) {
            setCreateOpen(false);
            setEditingBoy(null);
          }
        }}
        editing={editingBoy}
        profile={profile}
        skipRules={hasAccess || (bootTyped.my_boys ?? 0) > 0}
        onSaved={() => {
          void checkAccess();
          void loadList();
        }}
      />


      <ProfileDialog
        boyId={openBoyId}
        onClose={() => setOpenBoyId(null)}
        onEdit={(boy) => {
          setEditingBoy(boy);
          setOpenBoyId(null);
        }}
        onArchive={handleArchive}
        profile={profile}
        userId={session?.user?.id ?? ""}
        autoRecommend={autoRecommend}
      />

      <BaarInquiriesDrawer
        open={inquiriesOpen}
        onOpenChange={(v) => {
          setInquiriesOpen(v);
          if (!v) void refreshInquiryCount();
        }}
        onCountChange={setInquiryUnread}
      />

      {/* כרטיס הפרופיל שנפתח בלחיצה על תמונה או שם של חברה */}
      <MemberProfileHost />
    </div>
  );
};

export default BaarPage;
