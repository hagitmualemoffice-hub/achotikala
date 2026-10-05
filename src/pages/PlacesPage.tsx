/**
 * מקומות לדייטים — the sister database of הבאר, inside ליבה.
 * Same language, same chips, same calm cards — only the content is places.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  Bus,
  Coins,
  Filter,
  Flag,
  Grid2X2,
  Heart,
  List,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AccessGate from "@/apartments/AccessGate";
import { cachedGrant, rememberGrant } from "@/community/v1/accessMemo";
import { useCommunitySession } from "@/community/useCommunitySession";
import AuthDialog from "@/apartments/AuthDialog";
import { signInWithGoogle } from "@/apartments/googleSignIn";
import LibaHeaderActions from "@/community/v1/LibaHeaderActions";
import LibaTopBar from "@/community/v1/LibaTopBar";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import EmptyState from "@/components/EmptyState";
import { bootstrap as communityBootstrap } from "@/community/v1/api";
import type { CommunityProfile } from "@/community/v1/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  AREA_OPTIONS,
  KASHRUT_OPTIONS,
  KIND_OPTIONS,
  REPORT_REASONS,
  type PlaceCard,
  type PlaceDetail,
  type PlaceFilters,
  type PlaceInput,
  type PlacesAccessState,
  archivePlace,
  createPlace,
  fetchPlace,
  fetchPlaces,
  findSimilarPlaces,
  placeErrorText,
  placesBootstrap,
  reportPlace,
  suggestPlaceUpdate,
  togglePlaceSave,
  updatePlace,
} from "@/community/v1/places";

type GateState = "loading" | "anon" | "denied" | "offline" | "granted";

const VIEW_KEY = "achotikala.places.view";
const DRAFT_KEY = "achotikala.places.draft";
const PAGE = 24;

/* ---- chips: the same value always gets the same colour, here and inside the card ---- */
const TONES: Record<string, string> = {
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
  sand: "bg-[hsl(var(--tag-sand-bg))] text-[hsl(var(--tag-sand))]",
  lilac: "bg-[hsl(var(--tag-lilac-bg))] text-[hsl(var(--tag-lilac))]",
  aqua: "bg-[hsl(var(--tag-aqua-bg))] text-[hsl(var(--tag-aqua))]",
  brick: "bg-[hsl(var(--tag-brick-bg))] text-[hsl(var(--tag-brick))]",
};

const TONE_BY_VALUE: Record<string, keyof typeof TONES> = {
  // אזור
  "ירושלים": "violet",
  "מרכז": "steel",
  "אחר": "neutral",
  // סוג מקום
  "בית קפה": "amber",
  "פתוח": "olive",
  "משולב": "teal",
  "מלון": "plum",
  "אטרקציה": "coral",
  // כשרות
  "מהדרין": "mint",
  'בד"ץ': "indigo",
  "רבנות": "cyan",
  "לא רלוונטי": "neutral",
};

const chipTone = (value: string) => TONES[TONE_BY_VALUE[value.trim()] ?? "neutral"];

const Chip = ({ children }: { children: string }) => (
  <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-normal ${chipTone(children)}`}>{children}</span>
);

const CROWD_LABEL = ["", "ריק ושקט", "שקט", "בינוני", "עמוס", "עמוס מאוד"];

const CrowdMeter = ({ level }: { level: number }) => {
  const label = CROWD_LABEL[level] ?? level;
  const pct = Math.min(100, Math.max(0, level * 20));
  return (
    <span className="inline-flex w-32 flex-col gap-1" title={`עומס: ${label}`}>
      <span className="flex items-center justify-between">
        <span className="text-[12px] font-normal text-foreground">עומס</span>
        <span className="text-[11px] font-light text-muted-foreground">{label}</span>
      </span>
      <span className="relative block h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--crowd-empty))]">
        <span
          className="absolute right-0 top-0 block h-full rounded-full bg-[hsl(var(--crowd-fill))] transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
};

const TransitText = ({ transit }: { transit: boolean | null }) => {
  if (transit === null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-light ${
        transit ? "text-[hsl(var(--transit-yes))]" : "text-[hsl(var(--transit-no))]"
      }`}
    >
      <Bus className="h-3 w-3" />
      {transit ? 'נגיש בתחב"צ' : 'ללא תחב"צ'}
    </span>
  );
};

const IconChip = ({ on, children }: { on: boolean; children: React.ReactNode }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-normal ${
      on ? TONES.sky : TONES.neutral
    }`}
  >
    {children}
  </span>
);

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <span className="mb-1.5 block text-[13px] text-foreground">
    {text}
    {required && <span className="text-primary"> *</span>}
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

/* same form language as הבאר */
const inputClass =
  "w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary";
const textareaCls =
  "w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-primary";

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[18px] font-light text-foreground md:text-[22px]">{children}</h2>
);

const FormCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-1 py-5 md:px-0 md:py-6 ${className}`}>{children}</div>
);

const QuickChip = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-light transition-colors ${
      selected
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
    }`}
  >
    {children}
  </button>
);

/* ------------------------------ advanced search ------------------------------ */

const PlacesFilterDrawer = ({
  filters,
  onChange,
}: {
  filters: PlaceFilters;
  onChange: (f: PlaceFilters) => void;
}) => {
  const [open, setOpen] = useState(false);
  const hasActive =
    !!filters.kashrut ||
    !!filters.maxCrowd ||
    !!filters.transit ||
    !!filters.noMinPayment ||
    !!filters.savedOnly ||
    !!filters.mineOnly ||
    (filters.sort && filters.sort !== "recent");

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={`h-9 rounded-full px-3.5 text-[12.5px] font-light ${
          hasActive ? "border-primary text-primary" : "text-muted-foreground"
        }`}
      >
        <Filter className="ml-1.5 h-3.5 w-3.5" />
        חיפוש מתקדם
      </Button>

      <ResponsiveDialog open={open} onOpenChange={setOpen} desktopContentClassName="max-w-lg">
        <div dir="rtl" className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-10 py-8 md:px-14 md:py-8">
            <SectionTitle>סינון</SectionTitle>
            <Button variant="ghost" size="sm" onClick={() => onChange({ query: filters.query, sort: "recent" })}>ניקוי</Button>
          </div>
          <div className="flex-1 space-y-0 overflow-y-auto px-10 md:space-y-6 md:px-14 md:py-8">
            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="אזור" />
              <div className="flex flex-wrap gap-2">{AREA_OPTIONS.map((a) => <Choice key={a} selected={filters.area === a} onClick={() => onChange({ ...filters, area: filters.area === a ? "" : a })}>{a}</Choice>)}</div>
            </div>
            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="סוג מקום" />
              <div className="flex flex-wrap gap-2">{KIND_OPTIONS.map((k) => <Choice key={k} selected={filters.kind === k} onClick={() => onChange({ ...filters, kind: filters.kind === k ? "" : k })}>{k}</Choice>)}</div>
            </div>
            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="כשרות" />
              <div className="flex flex-wrap gap-2">
                {KASHRUT_OPTIONS.map((k) => (
                  <Choice
                    key={k}
                    selected={filters.kashrut === k}
                    onClick={() => onChange({ ...filters, kashrut: filters.kashrut === k ? "" : k })}
                  >
                    {k}
                  </Choice>
                ))}
              </div>
            </div>

            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="מידת העומס" />
              <div className="flex flex-wrap gap-2">
                <Choice
                  selected={filters.maxCrowd === 2}
                  onClick={() => onChange({ ...filters, maxCrowd: filters.maxCrowd === 2 ? null : 2 })}
                >
                  שקט (עד 2)
                </Choice>
                <Choice
                  selected={filters.maxCrowd === 3}
                  onClick={() => onChange({ ...filters, maxCrowd: filters.maxCrowd === 3 ? null : 3 })}
                >
                  בינוני ומטה (עד 3)
                </Choice>
              </div>
            </div>

            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="נוחות" />
              <div className="flex flex-wrap gap-2">
                <Choice
                  selected={!!filters.transit}
                  onClick={() => onChange({ ...filters, transit: filters.transit ? undefined : true })}
                >
                  נגיש בתחב"צ
                </Choice>
                <Choice
                  selected={!!filters.noMinPayment}
                  onClick={() => onChange({ ...filters, noMinPayment: filters.noMinPayment ? undefined : true })}
                >
                  בלי תשלום מינימום
                </Choice>
              </div>
            </div>

            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="מה להציג" />
              <div className="flex flex-wrap gap-2">
                <Choice
                  selected={!!filters.savedOnly}
                  onClick={() => onChange({ ...filters, savedOnly: filters.savedOnly ? undefined : true })}
                >
                  השמורים שלי
                </Choice>
                <Choice
                  selected={!!filters.mineOnly}
                  onClick={() => onChange({ ...filters, mineOnly: filters.mineOnly ? undefined : true })}
                >
                  המקומות שהוספתי
                </Choice>
              </div>
            </div>

            <div className="border-b border-border/70 py-5 md:border-0 md:py-0">
              <Label text="סדר התוצאות" />
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["recent", "הכי חדשים"],
                    ["name", "לפי שם"],
                    ["quiet", "מהשקטים"],
                  ] as const
                ).map(([value, label]) => (
                  <Choice
                    key={value}
                    selected={(filters.sort ?? "recent") === value}
                    onClick={() => onChange({ ...filters, sort: value })}
                  >
                    {label}
                  </Choice>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-muted/40 p-4 md:bg-background">
            <Button onClick={() => setOpen(false)} className="h-12 w-full rounded-md text-[15px] md:ms-auto md:h-10 md:w-auto md:rounded-full md:px-6">הצגת תוצאות</Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
};

/* ------------------------------- add / edit form ------------------------------- */

const emptyDraft: PlaceInput = {
  name: "",
  kind: "",
  area: "",
  address: "",
  kashrut: "",
  crowd_level: null,
  transit: null,
  min_payment: null,
  loved_note: "",
  details: "",
  link: "",
};

const PlaceDialog = ({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: PlaceDetail | null;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState<PlaceInput>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [similar, setSimilar] = useState<{ id: string; name: string; area: string | null }[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        kind: editing.kind ?? "",
        area: editing.area ?? "",
        address: editing.address ?? "",
        kashrut: editing.kashrut ?? "",
        crowd_level: editing.crowd_level,
        transit: editing.transit,
        min_payment: editing.min_payment,
        loved_note: editing.loved_note ?? "",
        details: editing.details ?? "",
        link: editing.link ?? "",
      });
      return;
    }
    // her work is never lost, even if the panel closes by mistake
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      setForm(raw ? { ...emptyDraft, ...(JSON.parse(raw) as PlaceInput) } : emptyDraft);
    } catch {
      setForm(emptyDraft);
    }
  }, [open, editing]);

  useEffect(() => {
    if (!open || editing) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* private mode — nothing to do */
    }
  }, [form, open, editing]);

  // gently warn about a place that may already be here
  useEffect(() => {
    if (!open) return;
    const name = form.name.trim();
    if (name.length < 2) {
      setSimilar([]);
      return;
    }
    const t = setTimeout(() => {
      findSimilarPlaces(name, editing?.id ?? null)
        .then(setSimilar)
        .catch(() => setSimilar([]));
    }, 350);
    return () => clearTimeout(t);
  }, [form.name, open, editing]);

  const set = <K extends keyof PlaceInput>(key: K, value: PlaceInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      if (editing) await updatePlace(editing.id, form);
      else {
        await createPlace(form);
        localStorage.removeItem(DRAFT_KEY);
      }
      toast.success(editing ? "המקום עודכן 💗" : "המקום נוסף למאגר. תודה שהוספת לנו 💗");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(placeErrorText(e));
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
    >
      <div dir="rtl" className="space-y-3 overflow-y-auto px-5 pb-24 pt-4 md:px-12 md:pb-10 md:pt-8">
        <div className="pe-10 pt-1 md:pe-0 md:pt-2">
          <p className="text-[11px] text-primary">{editing ? "עריכת מקום" : "הוספת מקום ליד הבאר"}</p>
          <SectionTitle>טופס מקום מומלץ לדייט ☕💙</SectionTitle>
          <p className="mt-2 text-[13px] font-light leading-relaxed text-muted-foreground">
            {editing
              ? "אפשר לעדכן כל פרט שהשתנה."
              : "כמה טוב שאת מוסיפה לנו מקום. כל פרט קטן עוזר למישהי אחרת לצאת לדייט רגוע."}
          </p>
        </div>

        <FormCard>
          <Label text="שם המקום" required />
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="למשל: קפה גרג בטלביה"
            className={inputClass}
          />
          {similar.length > 0 && (
            <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/[0.06] p-3.5 text-[12.5px] font-light">
              <p className="text-foreground">יכול להיות שהמקום כבר במאגר:</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {similar.map((s) => (
                  <li key={s.id}>
                    {s.name}
                    {s.area ? ` · ${s.area}` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-muted-foreground">אם זה מקום אחר — פשוט ממשיכות.</p>
            </div>
          )}
        </FormCard>

        <FormCard>
          <Label text="סוג מקום" required />
          <div className="flex flex-wrap gap-2">
            {KIND_OPTIONS.map((k) => (
              <Choice key={k} selected={form.kind === k} onClick={() => set("kind", k)}>
                {k}
              </Choice>
            ))}
          </div>
        </FormCard>

        <FormCard>
          <Label text="אזור" required />
          <div className="flex flex-wrap gap-2">
            {AREA_OPTIONS.map((a) => (
              <Choice key={a} selected={form.area === a} onClick={() => set("area", a)}>
                {a}
              </Choice>
            ))}
          </div>
        </FormCard>

        <FormCard>
          <Label text="כתובת מדויקת" />
          <input
            value={form.address ?? ""}
            onChange={(e) => set("address", e.target.value)}
            placeholder="רחוב, מספר, עיר"
            className={inputClass}
          />
        </FormCard>

        <FormCard>
          <Label text="כשרות" />
          <div className="flex flex-wrap gap-2">
            {KASHRUT_OPTIONS.map((k) => (
              <Choice key={k} selected={form.kashrut === k} onClick={() => set("kashrut", k)}>
                {k}
              </Choice>
            ))}
          </div>
        </FormCard>

        <FormCard>
          <Label text="מידת העומס" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Choice key={n} selected={form.crowd_level === n} onClick={() => set("crowd_level", n)}>
                {`${n} · ${CROWD_LABEL[n]}`}
              </Choice>
            ))}
          </div>
        </FormCard>

        <FormCard className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label text='נגיש בתחב"צ' />
            <div className="flex gap-2">
              <Choice selected={form.transit === true} onClick={() => set("transit", true)}>
                יש
              </Choice>
              <Choice selected={form.transit === false} onClick={() => set("transit", false)}>
                אין
              </Choice>
            </div>
          </div>
          <div>
            <Label text="תשלום מינימום" />
            <div className="flex gap-2">
              <Choice selected={form.min_payment === true} onClick={() => set("min_payment", true)}>
                יש
              </Choice>
              <Choice selected={form.min_payment === false} onClick={() => set("min_payment", false)}>
                אין
              </Choice>
            </div>
          </div>
        </FormCard>

        <FormCard>
          <Label text="מה שאהבתי במקום הזה" />
          <textarea
            value={form.loved_note ?? ""}
            onChange={(e) => set("loved_note", e.target.value)}
            rows={3}
            placeholder="משהו קטן שגרם לך להרגיש טוב שם"
            className={textareaCls}
          />
        </FormCard>

        <FormCard>
          <Label text="פרטים" />
          <textarea
            value={form.details ?? ""}
            onChange={(e) => set("details", e.target.value)}
            rows={4}
            placeholder="שעות פתיחה, עומס בשעות שונות, אם צריך להזמין מקום מראש, מה יש באזור..."
            className={textareaCls}
          />
        </FormCard>

        <FormCard>
          <Label text="קישור (אתר או וייז)" />
          <input value={form.link ?? ""} onChange={(e) => set("link", e.target.value)} className={inputClass} />
        </FormCard>

        <FormCard className="fixed inset-x-0 bottom-0 z-[60] flex justify-end rounded-none border-x-0 border-b-0 bg-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_hsl(var(--foreground)/0.06)] md:static md:mx-0 md:rounded-2xl md:border md:p-6 md:shadow-sm">
          <Button className="h-12 w-full rounded-full bg-primary px-6 text-primary-foreground shadow-md shadow-primary/20 hover:bg-[hsl(var(--primary-glow))] md:w-auto" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "שמירת שינויים" : "הוספת המקום"}
          </Button>
        </FormCard>
      </div>
    </ResponsiveDialog>
  );
};

/* ------------------------------- place details ------------------------------- */

const PlaceSheet = ({
  placeId,
  onClose,
  onEdit,
  onChanged,
  isAdmin,
}: {
  placeId: string | null;
  onClose: () => void;
  onEdit: (place: PlaceDetail) => void;
  onChanged: () => void;
  isAdmin: boolean;
}) => {
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [text, setText] = useState("");
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);

  useEffect(() => {
    if (!placeId) return;
    setLoading(true);
    fetchPlace(placeId)
      .then(setPlace)
      .catch(() => toast.error("לא הצלחנו לפתוח את המקום."))
      .finally(() => setLoading(false));
  }, [placeId]);

  const save = async () => {
    if (!place) return;
    try {
      const saved = await togglePlaceSave(place.id);
      setPlace({ ...place, saved });
      onChanged();
    } catch (e) {
      toast.error(placeErrorText(e));
    }
  };

  return (
    <ResponsiveDialog
      open={!!placeId}
      onOpenChange={(v) => !v && onClose()}
      desktopContentClassName="max-w-2xl"
    >
      {loading || !place ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-5 overflow-y-auto px-10 pb-12 pt-8 md:px-14 md:pt-12" dir="rtl">
          <h2 className="text-[22px] font-light leading-snug text-foreground">{place.name}</h2>
          <div className="flex flex-wrap gap-1.5">
            {place.area && <Chip>{place.area}</Chip>}
            {place.kind && <Chip>{place.kind}</Chip>}
            {place.kashrut && <Chip>{place.kashrut}</Chip>}
            {place.min_payment !== null && (
              <IconChip on={!place.min_payment}>
                <Coins className="h-3 w-3" />
                {place.min_payment ? "יש תשלום מינימום" : "אין תשלום מינימום"}
              </IconChip>
            )}
          </div>
          {(place.crowd_level || place.transit !== null) && (
            <div className="flex flex-wrap items-center gap-2">
              {place.crowd_level ? <CrowdMeter level={place.crowd_level} /> : null}
              {place.transit !== null && <TransitText transit={place.transit} />}
            </div>
          )}

          {place.address && (
            <p className="flex items-start gap-1.5 text-[14px] font-light text-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {place.address}
            </p>
          )}

          {place.loved_note && (
            <div className="rounded-2xl bg-primary/[0.06] p-4">
              <p className="mb-1 text-[12.5px] text-primary">מה שאהבתי במקום הזה</p>
              <p className="whitespace-pre-wrap text-[14px] font-light leading-relaxed text-foreground">
                {place.loved_note}
              </p>
            </div>
          )}

          {place.details && (
            <div>
              <p className="mb-1 text-[12.5px] text-muted-foreground">פרטים</p>
              <p className="whitespace-pre-wrap text-[14px] font-light leading-relaxed text-foreground">
                {place.details}
              </p>
            </div>
          )}

          {place.link && (
            <a
              href={place.link}
              target="_blank"
              rel="noreferrer"
              className="inline-block break-all text-[13.5px] font-light text-primary underline"
            >
              {place.link}
            </a>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
            <Button variant="outline" className="rounded-full" onClick={save}>
              {place.saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              {place.saved ? "שמור אצלך" : "לשמור אצלי"}
            </Button>
            {place.can_edit && (
              <Button variant="outline" className="rounded-full" onClick={() => onEdit(place)}>
                <Pencil className="h-4 w-4" />
                עריכה
              </Button>
            )}
            {!place.can_edit && (
              <Button variant="outline" className="rounded-full" onClick={() => setSuggestOpen(true)}>
                <Sparkles className="h-4 w-4" />
                הצעת עדכון
              </Button>
            )}
            <Button variant="ghost" className="rounded-full text-muted-foreground" onClick={() => setReportOpen(true)}>
              <Flag className="h-4 w-4" />
              דיווח
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                className="rounded-full text-muted-foreground"
                onClick={async () => {
                  try {
                    await archivePlace(place.id);
                    toast.success("המקום הועבר לארכיון.");
                    onClose();
                    onChanged();
                  } catch (e) {
                    toast.error(placeErrorText(e));
                  }
                }}
              >
                <X className="h-4 w-4" />
                ארכוב
              </Button>
            )}
          </div>

          {(suggestOpen || reportOpen) && (
            <div className="space-y-3 rounded-2xl border border-border/70 p-4">
              {reportOpen && (
                <div>
                  <Label text="סיבת הדיווח" />
                  <div className="flex flex-wrap gap-1.5">
                    {REPORT_REASONS.map((r) => (
                      <Choice key={r} selected={reason === r} onClick={() => setReason(r)}>
                        {r}
                      </Choice>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder={reportOpen ? "אפשר להוסיף הסבר קצר" : "מה כדאי לעדכן במקום הזה?"}
                className={textareaCls}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => {
                    setSuggestOpen(false);
                    setReportOpen(false);
                    setText("");
                  }}
                >
                  ביטול
                </Button>
                <Button
                  className="rounded-full px-5"
                  onClick={async () => {
                    try {
                      if (reportOpen) await reportPlace(place.id, reason, text);
                      else await suggestPlaceUpdate(place.id, text);
                      toast.success("קיבלנו, תודה 💗");
                      setSuggestOpen(false);
                      setReportOpen(false);
                      setText("");
                    } catch (e) {
                      toast.error(placeErrorText(e));
                    }
                  }}
                >
                  שליחה
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </ResponsiveDialog>
  );
};

/* ------------------------------- the page ------------------------------- */

const PlacesPage = () => {
  const { session, loading: sessionLoading } = useCommunitySession();
  /* if she was already allowed in during this visit, open straight away */
  const remembered = cachedGrant<PlacesAccessState>("mekomot");
  const [access, setAccess] = useState<GateState>(remembered ? "granted" : "loading");
  const [boot, setBoot] = useState<PlacesAccessState | null>(remembered);
  const [authOpen, setAuthOpen] = useState(false);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);

  const [items, setItems] = useState<PlaceCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PlaceFilters>({ sort: "recent" });
  const [view, setView] = useState<"cards" | "rows">(
    () => (localStorage.getItem(VIEW_KEY) as "cards" | "rows") ?? "cards",
  );
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("place"));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlaceDetail | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => localStorage.setItem(VIEW_KEY, view), [view]);

  /* a saved place opened from "שמורים" arrives as ?place=... */
  useEffect(() => {
    const id = params.get("place");
    if (id && id !== openId) setOpenId(id);
  }, [params, openId]);

  const checkAccess = useCallback(async () => {
    if (sessionLoading) return;
    if (!session?.user) {
      rememberGrant("mekomot", null);
      setAccess("anon");
      return;
    }
    if (!cachedGrant<PlacesAccessState>("mekomot")) setAccess("loading");
    try {
      const state = await placesBootstrap();
      setBoot(state);
      if (!state.authenticated || !state.authorized) {
        rememberGrant("mekomot", null);
        setAccess(state.authenticated ? "denied" : "anon");
      } else {
        rememberGrant("mekomot", state);
        setAccess("granted");
      }
    } catch {
      if (!cachedGrant<PlacesAccessState>("mekomot")) setAccess("offline");
    }
  }, [session?.user.id, sessionLoading]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  useEffect(() => {
    if (access !== "granted") return;
    communityBootstrap()
      .then((b) => setProfile(b.profile ?? null))
      .catch(() => setProfile(null));
  }, [access]);

  const load = useCallback(() => {
    if (access !== "granted") return;
    setLoading(true);
    fetchPlaces(filters, PAGE, (page - 1) * PAGE)
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => toast.error("לא הצלחנו לטעון את המקומות."))
      .finally(() => setLoading(false));
  }, [access, filters, page]);

  useEffect(() => {
    const t = setTimeout(load, filters.query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, filters.query]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE));
  const patch = (next: Partial<PlaceFilters>) => {
    setPage(1);
    setFilters((f) => ({ ...f, ...next }));
  };

  const toggleSave = async (place: PlaceCard) => {
    try {
      const saved = await togglePlaceSave(place.id);
      setItems((list) => list.map((p) => (p.id === place.id ? { ...p, saved } : p)));
    } catch (e) {
      toast.error(placeErrorText(e));
    }
  };

  const pages = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i + 1),
    [pageCount],
  );

  if (access !== "granted") {
    return (
      <div dir="rtl" className="min-h-screen bg-background">
        <LibaTopBar active="mekomot" sticky={false} />
        <AccessGate
          state={access}
          onSignIn={async (m) => {
            if (m === "google") {
              try {
                await signInWithGoogle("/liba/mekomot");
              } catch {
                toast.error("ההתחברות דרך Google לא הושלמה. אפשר להתחבר עם קוד לאימייל.");
              }
              return;
            }
            setAuthOpen(true);
          }}
          onRetry={checkAccess}
          offlineTitle="ליד הבאר זמין כשיש חיבור לרשת"
          gateTitle="ליד הבאר מיועד לחברות ליבה"
          requestTitle="בקשת גישה לליבה"
        />
        <AuthDialog
          initialMode="choose"
          open={authOpen}
          onOpenChange={setAuthOpen}
          title="כמה טוב שאת כאן"
          description="ההתחברות היא רק כדי שנדע שזו את."
          redirectPath="/liba/mekomot"
        />
      </div>
    );
  }

  const bootTyped = boot as PlacesAccessState & { authorized: true };

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-20 md:pb-0">
      <LibaTopBar
        active="mekomot"
        actions={
          <LibaHeaderActions
            me={{ displayName: profile?.display_name ?? "חברה", avatarUrl: profile?.avatar_url ?? null }}
            isAdmin={!!bootTyped.is_admin}
            onSignOut={() => supabase.auth.signOut()}
          />
        }
      />

      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 hidden flex-col gap-4 md:flex md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[26px] font-light leading-[1.2] text-foreground md:text-[34px]">ליד הבאר</h1>
            <p className="mt-1.5 max-w-2xl text-[14.5px] font-light leading-relaxed text-muted-foreground">
              מקומות שחברות בליבה כבר היו בהם וסימנו לנו מה טוב בהם: עד כמה שקט, אם נגיש בתחבורה ציבורית,
              {"\n"}מה הכשרות ומה כדאי לדעת לפני שיוצאים. מזמינות אותך להיעזר - וגם להוסיף מקום שאהבת. 💗
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="rounded-full px-6"
          >
            <Plus className="h-4 w-4" />
            הוספת מקום
          </Button>
        </div>

        {/* שורה אחת רגועה: חיפוש · אזור · סוג מקום · חיפוש מתקדם · תצוגה */}
        <div className="mb-5 flex items-center gap-2">
          <label className="relative min-w-0 flex-1 sm:w-[16.5rem] sm:flex-none">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={filters.query ?? ""}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder="חיפוש לפי שם..."
              className="h-9 w-full rounded-full border border-border bg-card py-2 pe-4 ps-10 text-[13.5px] outline-none focus:border-primary"
            />
          </label>

          {/* סליידר אזור */}
          <div className="hidden h-9 shrink-0 items-center rounded-full border border-border bg-muted/50 p-0.5 md:flex">
            {AREA_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => patch({ area: filters.area === a ? "" : a })}
                aria-pressed={filters.area === a}
                className={`relative h-7 rounded-full px-3 text-[12.5px] font-light transition-all ${
                  filters.area === a
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />

          {/* תפריט נפתח סוג מקום */}
          <div className="hidden md:block"><Select
            value={filters.kind || "__all__"}
            onValueChange={(value) => patch({ kind: value === "__all__" ? "" : value })}
          >
            <SelectTrigger className={`h-9 w-auto min-w-[8.5rem] justify-between gap-1.5 rounded-full px-3 text-[13px] font-light outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 ${filters.kind ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>
              <span className="truncate">סוג מקום: {filters.kind || "הכל"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-[13px]">
                הכל
              </SelectItem>
              {KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k} className="text-[13px]">
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select></div>

          <PlacesFilterDrawer
            filters={filters}
            onChange={(next) => {
              setPage(1);
              setFilters(next);
            }}
          />

          <div className="flex h-9 shrink-0 items-center rounded-full border border-border bg-muted/50 p-0.5 md:ms-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView("cards")}
              className={`h-8 w-8 rounded-full ${view === "cards" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
              title="כרטיסים"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView("rows")}
              className={`h-8 w-8 rounded-full ${view === "rows" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
              title="שורות"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          onClick={() => { setEditing(null); setFormOpen(true); }}
          aria-label="הוספת מקום"
          className="fixed bottom-20 left-4 z-40 h-14 w-14 rounded-full shadow-[var(--shadow-card)] md:hidden"
        >
          <Plus className="h-6 w-6" />
        </Button>


        <p className="mb-3 text-[13px] font-light text-muted-foreground">{total} מקומות במאגר</p>

        {loading ? (
          <div className="grid min-h-[70vh] place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="לא מצאנו מקום שמתאים לחיפוש הזה"
            description="אפשר לנקות את הסינונים ולנסות שוב. ואם את מכירה מקום טוב שחסר כאן — נשמח שתוסיפי אותו."
            action={{ label: "ניקוי פילטרים", onClick: () => setFilters({ sort: "recent" }) }}
            secondary={{
              label: "הוספת מקום",
              onClick: () => {
                setEditing(null);
                setFormOpen(true);
              },
            }}
          />
        ) : view === "cards" ? (
          <div className="grid min-h-[70vh] grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" dir="rtl">
            {items.map((p) => (
              <article
                key={p.id}
                onClick={() => setOpenId(p.id)}
                className="group relative flex min-h-[220px] cursor-pointer flex-col rounded-3xl border border-border/70 bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSave(p);
                  }}
                  aria-label="שמירה"
                  className="absolute left-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                >
                  {p.saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                </button>

                <div className="flex items-start gap-3 pe-8">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[22px] font-semibold leading-tight text-foreground">{p.name}</h2>
                    {p.address && (
                      <p className="mt-0.5 truncate text-[12.5px] font-light text-muted-foreground">{p.address}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {p.kind && <Chip>{p.kind}</Chip>}
                  {p.kashrut && <Chip>{p.kashrut}</Chip>}
                  {p.transit === true && <TransitText transit={p.transit} />}
                </div>

                {p.loved_note && (
                  <p className="mt-3 line-clamp-3 flex-1 text-[13px] font-light leading-relaxed text-foreground/75">
                    {p.loved_note}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-end pt-3">
                  <span className="text-[12px] font-light text-primary">לפרטים</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="min-h-[70vh] divide-y divide-border/40" dir="rtl">
            {items.map((p) => (
              <div
                key={p.id}
                onClick={() => setOpenId(p.id)}
                className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 rounded-2xl px-2 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.8fr_auto]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="hidden h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary md:grid">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="min-w-0">
                    <span className="block truncate text-[17px] font-semibold text-foreground">{p.name}</span>
                    {p.address && (
                      <span className="block truncate text-[12.5px] font-light text-muted-foreground">{p.address}</span>
                    )}
                  </span>
                </div>
                <span className="hidden text-[13px] font-light text-muted-foreground md:block">{p.area || "—"}</span>
                <span className="hidden text-[13px] font-light text-muted-foreground md:block">{p.kind || "—"}</span>
                <span className="hidden md:block">
                  {p.crowd_level ? <CrowdMeter level={p.crowd_level} /> : <span className="text-[13px] font-light text-muted-foreground">—</span>}
                </span>
                <span className="hidden md:block">
                  {p.transit !== null ? <TransitText transit={p.transit} /> : <span className="text-[13px] font-light text-muted-foreground">—</span>}
                </span>
                <span className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSave(p);
                    }}
                    aria-label="שמירה"
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                  >
                    {p.saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                  </button>
                  <span className="text-[12px] font-light text-muted-foreground">לפרטים</span>
                </span>
              </div>
            ))}
          </div>
        )}


        {pageCount > 1 && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-1.5">
            {pages.map((n) => (
              <button
                key={n}
                onClick={() => {
                  setPage(n);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`h-8 min-w-8 rounded-full px-2.5 text-[13px] ${
                  n === page ? "bg-primary/10 font-normal text-primary" : "font-light text-muted-foreground hover:bg-muted"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </main>

      <PlaceSheet
        placeId={openId}
        onClose={() => {
          setOpenId(null);
          if (params.get("place")) {
            const next = new URLSearchParams(params);
            next.delete("place");
            setParams(next, { replace: true });
          }
        }}
        isAdmin={!!bootTyped.is_admin}
        onEdit={(place) => {
          setEditing(place);
          setOpenId(null);
          setFormOpen(true);
        }}
        onChanged={load}
      />

      <PlaceDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
};

export default PlacesPage;
