/**
 * "הגדרות חשבון" — the small, quiet place where each woman owns her own identity:
 * her real name, her community nickname, an optional photo, what stays private,
 * and which emails she wants.
 *
 * Two rules the UI never bends:
 *  - an email address is never a public display name
 *  - a personal photo is never shown behind a nickname unless she said yes
 */
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, Flower2, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "./Avatar";
import { avatarFromFile } from "./avatarFile";
import { updateProfile, type AboutInput, type CommunityProfile, type NotifyPrefs } from "./api";
import { emptyHearts, MASTERY_TAGS } from "./hearts";
import { AboutInvitation, MyHeartCard } from "./MyHeart";
import SpaceUpdates from "./SpaceUpdates";
import { ETHNICITY_OPTIONS, ORIENTATION_OPTIONS, STATUS_OPTIONS } from "./baar";
import {
  fetchDailyState,
  setDailySettings,
  type DailyFilterKind,
  type DailyState,
} from "./dailyBaar";

/** A multi-line, conversational field for the "תכירו אותי" answers. */
const AreaField = ({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 2,
  maxLength = 220,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[13px] text-foreground">{label}</span>
    {hint && (
      <span className="mb-1.5 block text-[11.5px] font-light leading-relaxed text-muted-foreground">
        {hint}
      </span>
    )}
    <textarea
      value={value}
      rows={rows}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-[13.5px] font-light leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-border"
    />
  </label>
);

const NOTIFY_OPTIONS: { key: keyof NotifyPrefs & string; label: string }[] = [
  { key: "comment_on_my_post", label: "כשמישהי מגיבה לפוסט שלי" },
  { key: "reply_to_my_comment", label: "כשמישהי מגיבה לתגובה שלי" },
  { key: "inquiry_all", label: "על כל בחור חדש בפורום הבירורים" },
  { key: "inquiry_ashkenazi", label: "רק על בחור אשכנזי (בבירורים)" },
  { key: "inquiry_sephardi", label: "רק על בחור ספרדי (בבירורים)" },
  { key: "new_apartment", label: "כשמתפרסמת דירה חדשה בלוח הדירות" },
];

/** ההשתדלות היומית — pause/resume and the one personal filter. Saves on the spot. */
const DailyBaarSettings = () => {
  const [state, setState] = useState<DailyState | null>(null);
  const [active, setActive] = useState(true);
  const [kind, setKind] = useState<DailyFilterKind>("status");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetchDailyState()
      .then((st) => {
        if (!st.authorized) return;
        setState(st);
        setActive(st.active);
        if (st.filter_kind) setKind(st.filter_kind);
        setValue(st.filter_value ?? "");
      })
      .catch(() => undefined);
  }, []);

  if (!state) return null;

  const toggleActive = async (v: boolean) => {
    setActive(v);
    try {
      await setDailySettings(v, kind, value || null);
      toast.success(v ? "ההשתדלות היומית פועלת 💛" : "ההשתדלות היומית מושהית");
    } catch {
      setActive(!v);
      toast.error("לא הצלחנו לשמור כרגע");
    }
  };

  const saveFilter = async () => {
    setSaving(true);
    try {
      await setDailySettings(active, kind, value || null);
      setDirty(false);
      toast.success("ההעדפה נשמרה 💛");
    } catch {
      toast.error("לא הצלחנו לשמור כרגע");
    } finally {
      setSaving(false);
    }
  };

  const options = kind === "status" ? STATUS_OPTIONS : kind === "orientation" ? ORIENTATION_OPTIONS : ETHNICITY_OPTIONS;

  return (
    <div className="space-y-2 rounded-3xl border border-primary/15 bg-primary/[0.03] p-4">
      <h3 className="flex items-center gap-2 text-[13px] tracking-[0.12em] text-muted-foreground">
        <Flower2 className="h-3.5 w-3.5 text-primary/70" />
        ההשתדלות היומית
      </h3>
      <Toggle
        on={active}
        onChange={(v) => void toggleActive(v)}
        label="כרטיס אחד ליום מהבאר"
        note="כל יום כרטיס אחד נבחר במיוחד בשבילך. אפשר להפסיק בכל רגע, והכרטיסים לא יוצגו שוב."
      />
      <div className="rounded-2xl bg-background/70 p-3">
        <p className="mb-2 text-[12.5px] text-foreground">העדפה אישית — מה להציג לך</p>
        <div className="flex gap-2">
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as DailyFilterKind);
              setValue("");
              setDirty(true);
            }}
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary"
          >
            <option value="status">סטטוס</option>
            <option value="orientation">אוריינטציה</option>
            <option value="ethnicity">עדה</option>
          </select>
          <select
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setDirty(true);
            }}
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary"
          >
            <option value="">בלי העדפה</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {dirty && (
          <button
            onClick={() => void saveFilter()}
            disabled={saving}
            className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-[12px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))] disabled:opacity-70"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            שמירת ההעדפה
          </button>
        )}
        {!dirty && value && <p className="mt-2 text-[11.5px] font-light text-muted-foreground">מוצג לך רק לפי ההעדפה שבחרת.</p>}
      </div>
    </div>
  );
};


const Field = ({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 40,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[12.5px] font-light text-muted-foreground">{label}</span>
    <input
      value={value}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-[14px] outline-none transition-colors placeholder:font-light placeholder:text-muted-foreground/60 focus:border-border"
    />
  </label>
);

const Toggle = ({
  on,
  onChange,
  label,
  note,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  note?: string;
}) => (
  <button
    type="button"
    onClick={() => onChange(!on)}
    aria-pressed={on}
    className="flex w-full items-start gap-3 rounded-2xl px-1 py-2 text-start transition-colors hover:bg-muted/50"
  >
    <span
      className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
        on ? "bg-primary" : "bg-muted-foreground/25"
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
          on ? "-translate-x-4" : "translate-x-0"
        }`}
      />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[13.5px] text-foreground">{label}</span>
      {note && (
        <span className="mt-0.5 block text-[11.5px] font-light leading-relaxed text-muted-foreground">
          {note}
        </span>
      )}
    </span>
  </button>
);

export interface AccountSettingsProps {
  open: boolean;
  onClose: () => void;
  profile: CommunityProfile | null;
  onSaved: (p: CommunityProfile) => void;
  /** open a single area only — used as a shortcut from the hearts badge */
  focusTab?: "profile" | "about" | "heart" | "updates";
}

export default function AccountSettings({
  open,
  onClose,
  profile,
  onSaved,
  focusTab,
}: AccountSettingsProps) {
  const [tab, setTab] = useState<"profile" | "about" | "heart" | "updates">(focusTab ?? "profile");
  useEffect(() => {
    if (open) setTab(focusTab ?? "profile");
  }, [open, focusTab]);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [nick, setNick] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoTouched, setPhotoTouched] = useState(false);
  const [nickPhoto, setNickPhoto] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const [prefs, setPrefs] = useState<NotifyPrefs>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /* "תכירו אותי" — the community profile, separate from the account details */
  const [area, setArea] = useState("");
  const [work, setWork] = useState("");
  const [loves, setLoves] = useState("");
  const [help, setHelp] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [masteryNote, setMasteryNote] = useState("");
  const [viaLiba, setViaLiba] = useState(true);
  const [wa, setWa] = useState("");
  const [waShow, setWaShow] = useState(false);
  const [mail, setMail] = useState("");
  const [mailShow, setMailShow] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirst(profile?.first_name ?? "");
    setLast(profile?.last_name ?? "");
    setNick(profile?.nickname ?? "");
    setPhoto(profile?.avatar_url ?? null);
    setPhotoTouched(false);
    setNickPhoto(!!profile?.avatar_in_nickname_mode);
    setShowOnline(!!profile?.show_online);
    setPrefs({
      comment_on_my_post: profile?.notify_prefs?.comment_on_my_post ?? true,
      reply_to_my_comment: profile?.notify_prefs?.reply_to_my_comment ?? true,
      inquiry_all: profile?.notify_prefs?.inquiry_all ?? false,
      inquiry_ashkenazi: profile?.notify_prefs?.inquiry_ashkenazi ?? false,
      inquiry_sephardi: profile?.notify_prefs?.inquiry_sephardi ?? false,
      new_apartment: profile?.notify_prefs?.new_apartment ?? true,
    });
    setArea(profile?.about_area ?? "");
    setWork(profile?.about_work ?? "");
    setLoves(profile?.about_loves ?? "");
    setHelp(profile?.about_help ?? "");
    setTags(profile?.mastery_tags ?? []);
    setMasteryNote(profile?.mastery_note ?? "");
    setViaLiba(profile?.contact_via_liba ?? true);
    setWa(profile?.contact_whatsapp ?? "");
    setWaShow(!!profile?.contact_show_whatsapp);
    setMail(profile?.contact_email ?? "");
    setMailShow(!!profile?.contact_show_email);
    setError("");
  }, [open, profile]);

  if (!open) return null;

  const previewName = first.trim() ? `${first.trim()} ${last.trim()}`.trim() : profile?.display_name ?? "";
  const hearts = profile?.hearts ?? emptyHearts();

  const pickPhoto = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const data = await avatarFromFile(file);
      setPhoto(data);
      setPhotoTouched(true);
    } catch {
      toast.error("לא הצלחנו לקרוא את התמונה. אפשר לנסות תמונה אחרת.");
    }
  };

  const save = async () => {
    const f = first.trim();
    if (f.length < 2) {
      setError("צריך שם פרטי (שני תווים לפחות)");
      return;
    }
    if (f.includes("@")) {
      setError("כאן נכנס שם, לא כתובת מייל");
      return;
    }
    const n = nick.trim();
    if (n && (n.length < 2 || n.length > 18)) {
      setError("הכינוי צריך להיות בין 2 ל-18 תווים");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await updateProfile({
        firstName: f,
        lastName: last.trim() || null,
        nickname: n || null,
        avatar: photoTouched && photo ? photo : null,
        clearAvatar: photoTouched && !photo,
        avatarInNicknameMode: nickPhoto,
        notifyPrefs: prefs,
        showOnline,
        about: {
          area: area.trim() || null,
          work: work.trim() || null,
          loves: loves.trim() || null,
          help: help.trim() || null,
          mastery_tags: tags,
          mastery_note: masteryNote.trim() || null,
          contact_via_liba: viaLiba,
          contact_whatsapp: wa.trim() || null,
          contact_show_whatsapp: waShow && !!wa.trim(),
          contact_email: mail.trim() || null,
          contact_show_email: mailShow && !!mail.trim(),
        } satisfies AboutInput,
      });
      onSaved(saved);
      toast.success("הפרטים נשמרו");
      onClose();
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "");
      if (msg.includes("nickname_taken")) setError("הכינוי הזה כבר תפוס, אפשר לבחור אחר");
      else if (msg.includes("nickname_length")) setError("הכינוי צריך להיות בין 2 ל-18 תווים");
      else if (msg.includes("avatar_too_large")) setError("התמונה גדולה מדי, אפשר לבחור תמונה אחרת");
      else if (/fetch|network/i.test(msg))
        setError("אין כרגע חיבור לרשת. הפרטים יישמרו כשיהיה חיבור — אפשר לנסות שוב.");
      else setError("לא הצלחנו לשמור, נסי שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-foreground/25 p-4 backdrop-blur-sm">
      <div
        dir="rtl"
        className="mt-[8vh] mb-10 w-full max-w-3xl rounded-3xl bg-card p-10 shadow-[var(--shadow-card)] md:p-14"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-light text-foreground">האזור האישי שלי</h2>
            <p className="mt-1 text-[12.5px] font-light leading-relaxed text-muted-foreground">
              כתובת המייל שלך היא פרטית ולא מוצגת לחברות הקהילה.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* תפריט אזורים */}
        <div className="mb-7 flex flex-wrap gap-2 pb-1">
          {[
            { key: "profile", label: "הגדרות פרופיל" },
            { key: "about", label: "תכירו אותי" },
            { key: "heart", label: "הלב שלי בליבה" },
            { key: "updates", label: "עדכונים ומאסטריות" },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key as typeof tab)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 font-light text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "updates" && <SpaceUpdates />}

        {tab === "heart" && (
          <section className="space-y-6">
            <MyHeartCard state={hearts} />
            {!profile?.profile_complete && (
              <AboutInvitation
                hearts={
                  hearts.rules.find((r) => r.action === "profile_complete")?.hearts ?? 20
                }
              />
            )}
          </section>
        )}

        {tab === "about" && (
          <section className="space-y-6">
            <div>
              <h3 className="text-[13px] tracking-[0.12em] text-muted-foreground">תכירו אותי</h3>
              <p className="mt-1.5 text-[12px] font-light leading-relaxed text-muted-foreground">
                זה המקום שבו נשים בליבה מכירות אחת את השנייה. כל שדה כאן הוא בחירה שלך — אפשר למלא
                רק מה שמתאים לך.
              </p>
            </div>

            <AreaField
              label="📍 מאיזה אזור אני"
              value={area}
              onChange={setArea}
              rows={1}
              maxLength={80}
              placeholder="למשל: ירושלים והסביבה"
            />
            <AreaField
              label="💼 במה אני עוסקת"
              value={work}
              onChange={setWork}
              placeholder="לא חייב להיות תואר רשמי"
            />
            <AreaField
              label="🌿 מה אני אוהבת לעשות"
              value={loves}
              onChange={setLoves}
              placeholder="למשל: לבשל, לטייל, לקרוא, לשבת עם חברות"
            />
            <AreaField
              label="🤲 איך אני יכולה לעזור למשתתפות פה"
              value={help}
              onChange={setHelp}
              placeholder="במה תשמחי שיפנו אליך"
            />

            <div>
              <p className="text-[13px] text-foreground">✨ אני מאסטרית ב…</p>
              <p className="mt-1.5 text-[11.5px] font-light leading-relaxed text-muted-foreground">
                לא חייב להיות המקצוע שלך — כל דבר שאת מכירה טוב ותשמחי שישאלו אותך עליו.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {MASTERY_TAGS.map((t) => {
                  const on = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setTags((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))
                      }
                      className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                        on
                          ? "bg-[hsl(var(--primary)/0.12)] text-primary"
                          : "bg-muted/60 font-light text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                <AreaField
                  label="ובמילים שלך"
                  value={masteryNote}
                  onChange={setMasteryNote}
                  placeholder="למשל: אני עובדת במשאבי אנוש ואשמח לעזור בקורות חיים ובהכנה לראיונות."
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] text-foreground">💬 איך אפשר לפנות אליי</p>
              <p className="text-[11.5px] font-light leading-relaxed text-muted-foreground">
                מוצג רק מה שסימנת. בלי סימון, אף מספר או כתובת לא נחשפים לאף אחת.
              </p>
              <Toggle
                on={viaLiba}
                onChange={setViaLiba}
                label="דרך ליבה"
                note="נשים יפנו אליך כאן, בתוך הקהילה."
              />
              <Field
                label="וואטסאפ (לא חובה)"
                value={wa}
                onChange={setWa}
                maxLength={20}
                placeholder="05X-XXXXXXX"
              />
              <Toggle
                on={waShow}
                onChange={setWaShow}
                label="להציג את הוואטסאפ שלי לחברות הקהילה"
              />
              <Field
                label="מייל לפנייה (לא חובה)"
                value={mail}
                onChange={setMail}
                maxLength={80}
                placeholder="כתובת שנוח לך לקבל בה פניות"
              />
              <Toggle
                on={mailShow}
                onChange={setMailShow}
                label="להציג את המייל הזה לחברות הקהילה"
                note="כתובת המייל שאיתה את מתחברת נשארת פרטית תמיד."
              />
            </div>
          </section>
        )}

        {tab === "profile" && (
          <section className="space-y-7">
            <div>
              <h3 className="text-[13px] tracking-[0.12em] text-muted-foreground">פרטים אישיים</h3>

              <div className="mt-4 flex items-center gap-4">
                <MemberAvatar name={previewName || "?"} seed={previewName} imageUrl={photo} size="lg" />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-2 text-[12.5px] font-light text-foreground transition-colors hover:bg-muted/70"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {photo ? "החלפת תמונה" : "העלאת תמונה"}
                  </button>
                  {photo && (
                    <button
                      onClick={() => {
                        setPhoto(null);
                        setPhotoTouched(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-light text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      הסרה
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      void pickPhoto(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="שם פרטי" value={first} onChange={setFirst} placeholder="השם שלך" />
                <Field label="שם משפחה" value={last} onChange={setLast} placeholder="לא חובה" />
              </div>
              <div className="mt-4">
                <Field
                  label="כינוי בקהילה (לא חובה)"
                  value={nick}
                  onChange={setNick}
                  maxLength={18}
                  placeholder="למשל: אחת ששואלת"
                />
              </div>

              <div className="mt-4 rounded-2xl bg-muted/50 p-4 text-[12.5px] font-light leading-relaxed text-muted-foreground">
                כך את מופיעה בקהילה:
                <span className="mt-2 flex items-center gap-2 text-foreground">
                  <MemberAvatar name={previewName || "?"} seed={previewName} imageUrl={photo} size="xs" />
                  {previewName || "חברה בקהילה"}
                </span>
                {nick.trim() && (
                  <span className="mt-2 flex items-center gap-2 text-foreground">
                    <MemberAvatar
                      name={nick.trim()}
                      seed={nick.trim()}
                      nickname
                      imageUrl={nickPhoto ? photo : null}
                      size="xs"
                    />
                    {nick.trim()} — כשאת משתתפת בכינוי
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[13px] tracking-[0.12em] text-muted-foreground">פרטיות</h3>
              <Toggle
                on={nickPhoto}
                onChange={setNickPhoto}
                label="תמונת פרופיל במצב כינוי"
                note="כשזה כבוי, בכינוי מוצג רק עיגול עם האות הראשונה של הכינוי — התמונה, השם והמייל שלך לא נחשפים."
              />
              <Toggle
                on={showOnline}
                onChange={setShowOnline}
                label="להציג כשאני מחוברת"
                note="כשזה פעיל, חברות הקהילה יראו נקודה ירוקה ליד התמונה שלך בזמן שאת בליבה."
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-[13px] tracking-[0.12em] text-muted-foreground">התראות</h3>
              {NOTIFY_OPTIONS.map((o) => (
                <Toggle
                  key={o.key}
                  on={prefs[o.key] ?? true}
                  onChange={(v) => setPrefs((p) => ({ ...p, [o.key]: v }))}
                  label={`קבלת התראה במייל ${o.label}`}
                />
              ))}
            </div>
          </section>
        )}

        {error && (
          <p className="mt-5 flex items-center gap-1.5 text-[12.5px] font-light text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-7 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
          >
            ביטול
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[13px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))] disabled:opacity-70"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
}

/** Gentle, one-time request for a real name — never blocks her from the community. */
export const NamePrompt = ({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (p: CommunityProfile) => void;
}) => {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const save = async () => {
    const f = first.trim();
    if (f.length < 2) {
      setError("צריך שם פרטי (שני תווים לפחות)");
      return;
    }
    if (f.includes("@")) {
      setError("כאן נכנס שם, לא כתובת מייל");
      return;
    }
    setSaving(true);
    try {
      const saved = await updateProfile({ firstName: f, lastName: last.trim() || null });
      onSaved(saved);
      onClose();
    } catch {
      setError("לא הצלחנו לשמור כרגע. אפשר להשלים את זה מאוחר יותר בהגדרות החשבון.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-sm">
      <div dir="rtl" className="w-full max-w-md rounded-3xl bg-card p-10 shadow-[var(--shadow-card)] md:p-14">
        <h2 className="text-[19px] font-light text-foreground">איך לקרוא לך כאן?</h2>
        <p className="mt-2 text-[13px] font-light leading-relaxed text-muted-foreground">
          כדי שלא תופיע כאן כתובת מייל, נשמח לדעת את השם שלך. אפשר לשנות אותו בכל רגע בהגדרות
          החשבון.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <input
            value={first}
            maxLength={40}
            onChange={(e) => {
              setFirst(e.target.value);
              setError("");
            }}
            placeholder="שם פרטי"
            className="rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-[14px] outline-none focus:border-border"
          />
          <input
            value={last}
            maxLength={40}
            onChange={(e) => setLast(e.target.value)}
            placeholder="שם משפחה (לא חובה)"
            className="rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-[14px] outline-none focus:border-border"
          />
        </div>
        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-light text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
          >
            אחר כך
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[13px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))] disabled:opacity-70"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
};
