import IdentityPostingNotice from "./IdentityPostingNotice";
import { useIdentityExperiment, identityErrorMessage } from "./identityExperiment";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Check,
  ImagePlus,
  Paperclip,
  Link2,
  FileText,
  FileSpreadsheet,
  File,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Eye,
  Globe,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { postableSpaces, isLibaAdmin, accentBg, accentColor, spaceById, type SpaceId } from "@/community/v1/spaces";
import { useReinforce } from "@/community/v1/reinforcement";
import { adminSetSidebar, createPost, setNickname, uploadFile, type NewAttachment } from "@/community/v1/api";
import { clearDraft, draftField, draftKeys, useDraftAutosave } from "@/community/v1/drafts";

/* ------------------------------------------------------------------ */
/*  "כתבי פוסט" — the full writing flow (design only, no backend).    */
/*  שני שלבים בלבד: מרחב → כתיבה ופרסום (זהות + תצוגה מקדימה בתוכו)   */
/* ------------------------------------------------------------------ */

type Step = 0 | 1;

const STEP_LABELS = ["מרחב", "כתיבה ופרסום"];

type AttachKind = "file" | "link";

type Attached = NewAttachment & { id: string; uploading?: boolean };

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const LINK_META: Record<string, string> = {
  "kolzchut.org.il": "זכויות שוכרי דירה — כל זכות",
  "gov.il": "מחשבון סיוע בשכר דירה — משרד הבינוי והשיכון",
  "boi.org.il": "השוואת ריביות משכנתה — בנק ישראל",
  "yad2.co.il": "דירות להשכרה בירושלים — יד2",
};

const attachIcon = (a: Attached) => {
  switch (a.kind) {
    case "link":
      return Link2;
    case "excel":
      return FileSpreadsheet;
    case "pdf":
    case "doc":
      return FileText;
    default:
      return File;
  }
};

export interface ComposerProps {
  open: boolean;
  onClose: () => void;
  /** null = she has never written under a nickname before */
  nickname: string | null;
  onNicknameCreated: (nick: string) => void;
  displayName: string;
  initials: string;
  initialSpace?: SpaceId | null;
  onPublished: (postId: string) => void | Promise<void>;
}

const Field = ({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label className="text-[13px] text-foreground">{label}</label>
      {hint && <span className="text-[11.5px] font-light text-muted-foreground">{hint}</span>}
    </div>
    {children}
    {error && (
      <p className="mt-2 flex items-center gap-1.5 text-[12px] font-light text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        {error}
      </p>
    )}
  </div>
);

export default function Composer({
  open,
  onClose,
  nickname,
  onNicknameCreated,
  displayName,
  initials,
  initialSpace = null,
  onPublished,
}: ComposerProps) {
  const reinforce = useReinforce();
  const { allowNickname, ready, state: identityState } = useIdentityExperiment();

  const [step, setStep] = useState<Step>(initialSpace ? 1 : 0);
  const [space, setSpace] = useState<SpaceId | null>(initialSpace);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attached, setAttached] = useState<Attached[]>([]);
  const [addPanel, setAddPanel] = useState<null | AttachKind>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkError, setLinkError] = useState("");
  const [as, setAs] = useState<"name" | "nick">("name");
  const [identityOpen, setIdentityOpen] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const [nickError, setNickError] = useState("");
  const [nickChecking, setNickChecking] = useState(false);
  const [myNick, setMyNick] = useState<string | null>(nickname);
  const [touched, setTouched] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showInSidebar, setShowInSidebar] = useState(true);
  const [done, setDone] = useState(false);
  const [switched, setSwitched] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // the expanded composer shares the draft with the inline one above the feed
  useDraftAutosave(draftKeys.newPost, { title, body }, open && !done);
  useEffect(() => {
    if (!open) return;
    setTitle((t) => t || draftField(draftKeys.newPost, "title"));
    setBody((b) => b || draftField(draftKeys.newPost, "body"));
  }, [open]);

  const activeSpace = space ? spaceById(space) : null;
  const accent = activeSpace ? accentColor(activeSpace) : "hsl(var(--primary))";

  const titleError = useMemo(() => {
    if (!touched) return "";
    if (!title.trim()) return "צריך להוסיף כותרת.";
    if (title.trim().length < 4) return "הכותרת קצרה מדי.";
    return "";
  }, [title, touched]);

  const bodyError = useMemo(() => {
    if (!touched) return "";
    if (body.trim().length < 15) return "כתבי עוד מעט, כדי שיהיה למי שקוראת במה להיאחז.";
    return "";
  }, [body, touched]);

  const identityReady = as === "name" || Boolean(myNick);
  const canPublish =
    ready && (allowNickname || !!identityState?.has_full_name) &&
    Boolean(space) &&
    title.trim().length >= 4 &&
    body.trim().length >= 15 &&
    identityReady &&
    !attached.some((a) => a.uploading);

  const reset = () => {
    setStep(0);
    setSpace(null);
    setTitle("");
    setBody("");
    setAttached([]);
    setAddPanel(null);
    setLinkUrl("");
    setLinkTitle("");
    setAs("name");
    setIdentityOpen(false);
    setNickDraft("");
    setNickError("");
    setTouched(false);
    setPreviewOpen(false);
    setPublishing(false);
    setDone(false);
    setSwitched(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!/^https?:\/\/\S+\.\S+/.test(url)) {
      setLinkError("הכתובת לא נראית תקינה. היא צריכה להתחיל ב-https://");
      return;
    }
    setLinkError("");
    let host = url;
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* keep raw */
    }
    const metaKey = Object.keys(LINK_META).find((k) => host.endsWith(k));
    setAttached((a) => [
      ...a,
      {
        id: crypto.randomUUID(),
        kind: "link",
        title: linkTitle.trim() || (metaKey ? LINK_META[metaKey] : host),
        meta: host,
        url,
      },
    ]);
    setLinkUrl("");
    setLinkTitle("");
    setAddPanel(null);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files);
    setAddPanel(null);
    for (const file of list) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("הקובץ גדול מ-10MB");
        continue;
      }
      const id = crypto.randomUUID();
      setAttached((a) => [...a, { id, kind: "file", title: file.name, meta: null, uploading: true }]);
      try {
        const uploaded = await uploadFile(file);
        setAttached((a) => a.map((x) => (x.id === id ? { ...x, ...uploaded, uploading: false } : x)));
      } catch {
        setAttached((a) => a.filter((x) => x.id !== id));
        toast.error("העלאת הקובץ נכשלה");
      }
    }
  };

  const saveNick = async () => {
    const n = nickDraft.trim();
    if (n.length < 2 || n.length > 18) {
      setNickError("הניק צריך להיות בין 2 ל-18 תווים");
      return;
    }
    setNickChecking(true);
    setNickError("");
    try {
      await setNickname(n);
      setMyNick(n);
      onNicknameCreated(n);
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "");
      if (msg.includes("nickname_taken")) setNickError("הניק הזה כבר תפוס, אפשר לבחור אחר");
      else if (msg.includes("nickname_length")) setNickError("הניק צריך להיות בין 2 ל-18 תווים");
      else setNickError("קרתה תקלה, נסי שוב.");
    } finally {
      setNickChecking(false);
    }
  };

  const publish = async () => {
    if (!space) return;
    setPublishing(true);
    try {
      const postId = await createPost({
        space,
        body: body.trim(),
        title: title.trim(),
        asNickname: as === "nick",
        attachments: attached
          .filter((a) => !a.uploading)
          .map(({ id, uploading, ...rest }) => rest),
      });
      if (space === "system" && isLibaAdmin() && showInSidebar) {
        await adminSetSidebar(postId, true).catch(() => toast.error("ההודעה פורסמה, אבל לא נוספה לטור הצד"));
      }
      setDone(true);
      clearDraft(draftKeys.newPost);
      setTitle("");
      setBody("");
      setAttached([]);
      reinforce("firstComment");
      await onPublished(postId);
    } catch (error) {
      toast.error(identityErrorMessage(error, "הפרסום לא נשמר. נסי שוב."));
    } finally {
      setPublishing(false);
    }
  };

  if (!open) return null;

  const AttachedList = ({ compact = false }: { compact?: boolean }) => (
    <ul className={compact ? "mt-4 space-y-2" : "mt-3 space-y-2"}>
      {attached.map((a) => {
        const Icon = attachIcon(a);
        return (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-xl bg-muted/50 px-3.5 py-2.5"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-foreground">{a.title}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-light text-muted-foreground">
                {a.kind === "link" && <Globe className="h-3 w-3" />}
                <span dir="ltr">{a.meta ?? ""}</span>
              </span>
            </span>
            {!compact && (
              a.uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                <button
                  onClick={() => setAttached((l) => l.filter((x) => x.id !== a.id))}
                  aria-label="הסרה"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/30 backdrop-blur-[2px] animate-in fade-in duration-300 motion-reduce:animate-none md:items-start md:overflow-y-auto md:p-4 md:py-16">
      {/* phones: a drawer that rises from the bottom, with the publish button fixed to it */}
      <div
        dir="rtl"
        className="flex h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl flex-col rounded-t-[28px] bg-card shadow-[var(--shadow-card)] animate-in slide-in-from-bottom-4 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none md:h-auto md:max-h-none md:rounded-[28px] md:slide-in-from-bottom-0 md:zoom-in-[0.98]"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4 px-5 pt-5 md:px-14 md:pt-12">
          <div>
            <h2 className="text-[17px] font-light text-foreground md:text-xl">
              {done ? "הפוסט שלך באוויר" : (
                <>
                  <span className="md:hidden">מה תרצי לכתוב לנו?</span>
                  <span className="hidden md:inline">מה על הלב שלך?</span>
                </>
              )}
            </h2>
            <p
              className={`mt-1 text-[12.5px] font-light text-muted-foreground ${
                done ? "" : "hidden md:block"
              }`}
            >
              {done
                ? "החברות במרחב יראו אותו עוד רגע."
                : "הכתיבה כאן נשארת בין חברות הקהילה בלבד."}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="סגירה"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* steps */}
        {!done && (
          <div className="mt-6 hidden items-center gap-2 border-b border-border/60 px-10 pb-5 md:flex md:px-14 md:pb-4">
            {STEP_LABELS.map((l, i) => (
              <div key={l} className="flex items-center gap-2">
                <button
                  onClick={() => i < step && setStep(i as Step)}
                  className={`text-[12px] font-light transition-colors ${
                    i === step
                      ? "text-foreground"
                      : i < step
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground/45"
                  }`}
                  style={i === step ? { color: accent } : undefined}
                >
                  {l}
                </button>
                {i < STEP_LABELS.length - 1 && (
                  <ChevronLeft className="h-3 w-3 text-muted-foreground/35" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:overflow-visible md:px-14 md:py-12">
          {/* ---------------- done ---------------- */}
          {done ? (
            <div className="text-center">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: activeSpace ? accentBg(activeSpace, 0.16) : undefined }}
              >
                <Check className="h-6 w-6" style={{ color: accent }} />
              </div>
              <p className="mt-5 text-[15px] font-light leading-relaxed text-foreground">
                פרסמת ב״{activeSpace?.name}״ {as === "nick" ? `בניק ${myNick}` : `בשם ${displayName}`}.
              </p>
              <p className="mt-2 text-[13px] font-light leading-relaxed text-muted-foreground">
                נשלח לך עדכון כשמישהי תגיב.
              </p>

              {/* safety net: identity can still be switched */}
              <div className="mx-auto mt-6 max-w-md rounded-2xl bg-muted/50 px-5 py-4 text-start">
                {switched ? (
                  <p className="text-[12.5px] font-light leading-relaxed text-muted-foreground">
                    עודכן. הפוסט מופיע עכשיו{" "}
                    <span className="text-foreground">
                      {as === "nick" ? `בניק ${myNick}` : `בשם ${displayName}`}
                    </span>
                    .
                  </p>
                ) : allowNickname ? (
                  <>
                    <p className="text-[12.5px] font-light leading-relaxed text-muted-foreground">
                      אם התכוונת אחרת — אפשר להחליף בין השם לניק בשעה הראשונה, כל עוד אף אחת עוד
                      לא הגיבה. אחר כך הפוסט נשאר כמו שהוא, כדי שהשיחה תישאר ברורה.
                    </p>
                    <button
                      onClick={() => {
                        if (as === "name" && !myNick) {
                          setDone(false);
                          setStep(1);
                          setAs("nick");
                          setIdentityOpen(true);
                          return;
                        }
                        setAs(as === "name" ? "nick" : "name");
                        setSwitched(true);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-primary transition-opacity hover:opacity-70"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      {as === "name" ? "פרסום בניק במקום בשמי" : "פרסום בשמי במקום בניק"}
                    </button>
                  </>
                ) : <IdentityPostingNotice />}
              </div>

              <div className="mt-7 flex items-center justify-center gap-3">
                <button
                  onClick={close}
                  className="rounded-full bg-primary px-7 py-3 text-[13.5px] text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-[hsl(var(--primary-glow))]"
                >
                  לפוסט שלי
                </button>
                <button
                  onClick={reset}
                  className="text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
                >
                  לכתוב עוד משהו
                </button>
              </div>
            </div>
          ) : step === 0 ? (
            /* ---------------- 1. space ---------------- */
            <div>
              <p className="text-[13px] text-foreground">איפה תרצי לפרסם?</p>
              <p className="mt-1 text-[12px] font-light text-muted-foreground">
                כל מרחב הוא חדר אחר בקהילה. אפשר לשנות עד לפרסום.
              </p>
              {/* phones: one simple choice field instead of a wall of buttons */}
              <select
                value={space ?? ""}
                onChange={(e) => {
                  setSpace(e.target.value as typeof space);
                  setStep(1);
                }}
                className="mt-4 w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-[13.5px] font-light text-foreground outline-none focus:border-primary/40 md:hidden"
              >
                <option value="" disabled>
                  בחרי קבוצת דיונים
                </option>
                {postableSpaces().map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortName}
                  </option>
                ))}
              </select>

              <div className="mt-5 hidden gap-2.5 md:grid sm:grid-cols-2">
                {postableSpaces().map((s) => {
                  const on = space === s.id;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSpace(s.id);
                        setStep(1);
                      }}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-start transition-all ${
                        on ? "" : "border-border/70 hover:border-border"
                      }`}
                      style={
                        on
                          ? {
                              borderColor: accentBg(s, 0.4),
                              backgroundColor: accentBg(s, 0.09),
                            }
                          : undefined
                      }
                    >
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: accentBg(s, 0.14), color: accentColor(s) }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] text-foreground">{s.shortName}</span>
                        <span className="mt-0.5 block text-[11.5px] font-light leading-relaxed text-muted-foreground">
                          {s.tagline}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ---------------- 2. writing + identity + preview ---------------- */
            <div className="space-y-6">
              {activeSpace && (
                <div className="flex items-center gap-2 text-[12px] font-light">
                  <select
                    value={space ?? ""}
                    onChange={(event) => setSpace(event.target.value as SpaceId)}
                    aria-label="בחירת קבוצת דיונים"
                    className="w-full rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-[13px] font-light text-foreground outline-none focus:border-primary/40 md:hidden"
                  >
                    {postableSpaces().map((item) => (
                      <option key={item.id} value={item.id}>{item.shortName}</option>
                    ))}
                  </select>
                  <span
                    className="hidden rounded-full px-2.5 py-1 md:inline-flex"
                    style={{ backgroundColor: accentBg(activeSpace, 0.14), color: accent }}
                  >
                    {activeSpace.shortName}
                  </span>
                  <button
                    onClick={() => setStep(0)}
                    className="hidden text-muted-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground md:inline-flex"
                  >
                    שינוי
                  </button>
                </div>
              )}

              {space === "system" && isLibaAdmin() && (
                <label className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-[13px] font-light text-foreground">
                  <input
                    type="checkbox"
                    checked={showInSidebar}
                    onChange={(e) => setShowInSidebar(e.target.checked)}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  להציג את ההודעה גם בטור הצד, ליד האירועים ו"מדברות עכשיו"
                </label>
              )}

              <Field label="כותרת" hint={`${title.length}/80`} error={titleError}>
                <input
                  value={title}
                  maxLength={80}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="למשל: מישהי עברה מסלול משכנתה באמצע הדרך?"
                  className={`w-full rounded-xl border bg-background px-4 py-3 text-[14px] outline-none transition-all placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/15 ${
                    titleError ? "border-destructive/60" : "border-border focus:border-primary"
                  }`}
                />
              </Field>

              <Field label="מה תרצי לשתף?" hint="אין צורך בניסוח מושלם" error={bodyError}>
                <textarea
                  value={body}
                  rows={7}
                  onChange={(e) => setBody(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="כתבי בגובה העיניים — מה קרה, מה את מתלבטת עליו, ובמה יעזור לך שנעזור."
                  className={`w-full rounded-xl border bg-background px-4 py-3 text-[14px] font-light leading-[1.65] outline-none transition-all placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/15 ${
                    bodyError ? "border-destructive/60" : "border-border focus:border-primary"
                  }`}
                />
              </Field>

              {/* attachments */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAddPanel(addPanel === "file" ? null : "file")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/80 px-3.5 py-1.5 text-[12.5px] font-light text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    הוספת קובץ
                  </button>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/80 px-3.5 py-1.5 text-[12.5px] font-light text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    הוספת תמונה
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => setAddPanel(addPanel === "link" ? null : "link")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/80 px-3.5 py-1.5 text-[12.5px] font-light text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    הוספת קישור
                  </button>
                  <span className="text-[11.5px] font-light text-muted-foreground/80">
                    קבצים נשארים בתוך הקהילה
                  </span>
                </div>

                {addPanel === "file" && (
                  <div className="mt-3 rounded-2xl border border-dashed border-border p-4">
                    <p className="text-[12.5px] font-light text-muted-foreground">
                      גררי לכאן קובץ, או בחרי מהמחשב — עד 10MB (PDF, Word, Excel, תמונה).
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full bg-muted/70 px-3 py-1.5 text-[12px] font-light text-foreground/80 transition-colors hover:bg-muted"
                      >
                        בחירת קובץ מהמחשב
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          void handleFiles(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  </div>
                )}

                {addPanel === "link" && (
                  <div className="mt-3 space-y-3 rounded-2xl border border-dashed border-border p-4">
                    <input
                      value={linkUrl}
                      dir="ltr"
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://"
                      className={`w-full rounded-xl border bg-background px-4 py-2.5 text-[13px] outline-none transition-all focus:ring-2 focus:ring-primary/15 ${
                        linkError ? "border-destructive/60" : "border-border focus:border-primary"
                      }`}
                    />
                    <input
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="איך לקרוא לקישור? (לא חובה — נזהה לבד את שם העמוד)"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] font-light outline-none transition-all focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                    />
                    {linkError && (
                      <p className="flex items-center gap-1.5 text-[12px] font-light text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {linkError}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={addLink}
                        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-[12.5px] text-accent-foreground disabled:opacity-70"
                      >
                        הוספה
                      </button>
                      <button
                        onClick={() => {
                          setAddPanel(null);
                          setLinkError("");
                        }}
                        className="text-[12px] font-light text-muted-foreground hover:text-foreground"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {attached.length > 0 && <AttachedList />}
              </div>

              {/* ---------- identity ---------- */}
              <div className="rounded-2xl bg-accent/25 p-5">
                <p className="text-[13px] text-foreground">איך תרצי להופיע?</p>
                <p className="mt-1 text-[12px] font-light leading-relaxed text-muted-foreground">
                  שתי האפשרויות מקובלות כאן לגמרי. בניק החברות רואות את הניק בלבד; צוות הניהול
                  רואה מי כתבה, כדי לשמור על מרחב בטוח.
                </p>

                {/* collapsed summary */}
                {!allowNickname ? <IdentityPostingNotice /> : !identityOpen ? (
                  <div className="mt-4 flex items-start gap-3.5">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] ${
                        as === "nick"
                          ? "border border-dashed border-primary/45 text-primary"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {as === "nick" ? (myNick ?? "?").charAt(0) : initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] text-foreground">
                        {as === "nick" && myNick
                          ? `הפוסט יפורסם כ״${myNick}״`
                          : as === "nick"
                            ? "בניק — עוד לא בחרת ניק"
                            : `הפוסט יפורסם בשמך — ${displayName}`}
                      </p>
                      <p className="mt-0.5 text-[12px] font-light leading-relaxed text-muted-foreground">
                        {as === "nick"
                          ? "השם שלך לא יוצג לחברות הקהילה."
                          : "החברות יראו את שמך כפי שהוא מופיע בקהילה."}
                      </p>
                      <button
                        onClick={() => setIdentityOpen(true)}
                        className="mt-2 text-[12.5px] text-primary transition-opacity hover:opacity-70"
                      >
                        שינוי זהות
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <button
                      onClick={() => {
                        setAs("name");
                        setIdentityOpen(false);
                      }}
                      className={`flex w-full items-center gap-3.5 rounded-2xl border bg-card p-4 text-start transition-all ${
                        as === "name"
                          ? "border-primary/45"
                          : "border-border/70 hover:border-border"
                      }`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-[13px] text-primary">
                        {initials}
                      </span>
                      <span>
                        <span className="block text-[13.5px] text-foreground">
                          בשמי — {displayName}
                        </span>
                        <span className="block text-[11.5px] font-light text-muted-foreground">
                          כמו שאת מופיעה בקהילה
                        </span>
                      </span>
                      {as === "name" && <Check className="ms-auto h-4 w-4 text-primary" />}
                    </button>

                    <button
                      onClick={() => setAs("nick")}
                      className={`flex w-full items-center gap-3.5 rounded-2xl border bg-card p-4 text-start transition-all ${
                        as === "nick" ? "border-primary/45" : "border-border/70 hover:border-border"
                      }`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-primary/45 text-[13px] text-primary">
                        {myNick ? myNick.trim().charAt(0) : "?"}
                      </span>
                      <span>
                        <span className="block text-[13.5px] text-foreground">
                          {myNick ? `בניק שלי — ${myNick}` : "בחרי לך ניק לקהילה"}
                        </span>
                        <span className="block text-[11.5px] font-light text-muted-foreground">
                          {myNick
                            ? "הניק הקבוע שלך, כמו בפוסטים הקודמים"
                            : "שם שתוכלי להמשיך איתו גם בשיחות הבאות"}
                        </span>
                      </span>
                      {as === "nick" && myNick && <Check className="ms-auto h-4 w-4 text-primary" />}
                    </button>

                    {/* first-time nickname creation */}
                    {as === "nick" && !myNick && (
                      <div className="rounded-2xl bg-card p-5">
                        <p className="text-[13px] text-foreground">בחרי לך ניק לקהילה</p>
                        <p className="mt-1 text-[12px] font-light leading-relaxed text-muted-foreground">
                          הניק יופיע במקום שמך. אפשר להמשיך איתו גם בשיחות הבאות, כך שהחברות יזהו
                          אותך בין שיחה לשיחה. צוות הניהול יודע איזה חשבון עומד מאחורי הניק — רק
                          כדי לשמור על הקהילה.
                        </p>
                        <input
                          value={nickDraft}
                          maxLength={18}
                          onChange={(e) => {
                            setNickDraft(e.target.value);
                            setNickError("");
                          }}
                          placeholder="למשל: אחת ששואלת"
                          className={`mt-4 w-full rounded-xl border bg-background px-4 py-3 text-[14px] outline-none transition-all placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/15 ${
                            nickError ? "border-destructive/60" : "border-border focus:border-primary"
                          }`}
                        />
                        {nickError && (
                          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-light text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {nickError}
                          </p>
                        )}
                        <div className="mt-4 flex items-center gap-3">
                          <button
                            onClick={saveNick}
                            disabled={nickChecking}
                            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))] disabled:opacity-70"
                          >
                            {nickChecking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {nickChecking ? "בודקות שהניק פנוי" : "שמירת הניק"}
                          </button>
                          <span className="text-[11.5px] font-light text-muted-foreground">
                            2–18 תווים · במילים, בלי שמות של חברות אחרות
                          </span>
                        </div>
                      </div>
                    )}

                    {as === "nick" && myNick && (
                      <button
                        onClick={() => setIdentityOpen(false)}
                        className="text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
                      >
                        סיימתי
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ---------- preview ---------- */}
              <div className="border-t border-border/60 pt-5">
                <button
                  onClick={() => setPreviewOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {previewOpen ? "סגירת התצוגה המקדימה" : "איך זה ייראה בפיד"}
                </button>

                {previewOpen && (
                  <div className="relative mt-5 ps-1">
                    {activeSpace && (
                      <span
                        className="absolute right-0 top-11 h-10 w-[3px] rounded-full"
                        style={{ backgroundColor: accent }}
                        aria-hidden
                      />
                    )}
                    <div className="ps-5">
                      <span
                        className="inline-block rounded-full px-2.5 py-1 text-[11.5px]"
                        style={{
                          backgroundColor: activeSpace ? accentBg(activeSpace, 0.14) : undefined,
                          color: accent,
                        }}
                      >
                        {activeSpace?.shortName}
                      </span>
                      <h3 className="mt-3 text-[22px] font-light leading-snug text-foreground">
                        {title || "כותרת הפוסט"}
                      </h3>
                      <div className="mt-3 flex items-center gap-2.5">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-[12.5px] ${
                            as === "nick"
                              ? "border border-dashed border-primary/45 text-primary"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {as === "nick" ? (myNick ?? "?").charAt(0) : initials}
                        </span>
                        <span className="text-[13px] text-foreground">
                          {as === "nick" ? (myNick ?? "הניק שלך") : displayName}
                        </span>
                        {as === "nick" && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-light text-muted-foreground">
                            בניק
                          </span>
                        )}
                        <span className="text-[12px] font-light text-muted-foreground">· עכשיו</span>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-[14.5px] font-light leading-[1.6] text-foreground/85">
                        {body || "תוכן הפוסט…"}
                      </p>
                      {attached.length > 0 && <AttachedList compact />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        {!done && (
          <div className="sticky bottom-0 z-30 flex shrink-0 items-center justify-end gap-3 border-t border-border/60 bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_hsl(var(--foreground)/0.06)] md:static md:px-8 md:py-5 md:shadow-none">
            {step === 0 ? (
              <span className="text-[12px] font-light text-muted-foreground">
                בחרי מרחב כדי להמשיך
              </span>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-4 md:flex-initial">
                <span className="hidden text-[11.5px] font-light text-muted-foreground sm:block">
                  {as === "nick" && myNick
                    ? `יפורסם כ״${myNick}״`
                    : as === "nick"
                      ? "צריך לבחור ניק"
                      : `יפורסם בשמך — ${displayName}`}
                </span>
                <button
                  onClick={() => {
                    setTouched(true);
                    if (canPublish) publish();
                  }}
                  disabled={publishing || !canPublish}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-[13.5px] text-primary-foreground shadow-md shadow-primary/20 transition-[opacity,transform] hover:bg-[hsl(var(--primary-glow))] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 md:flex-initial"
                >
                  {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {publishing ? "מפרסמות…" : "פרסום בקהילה"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
