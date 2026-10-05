import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  Link2,
  ChevronDown,
  Check,
  X,
  Loader2,
  AlertCircle,
  Maximize2,
  FileSpreadsheet,
  FileText,
  File,
  Globe,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { postableSpaces, accentBg, accentColor, spaceById, type SpaceId } from "@/community/v1/spaces";
import { useReinforce } from "@/community/v1/reinforcement";
import EmojiPicker, { insertAtCursor } from "@/community/v1/EmojiPicker";
import { createPost, setNickname, uploadFile, type NewAttachment } from "@/community/v1/api";
import { MemberAvatar } from "@/community/v1/Avatar";
import { clearDraft, draftField, draftKeys, useDraftAutosave, useDraftCleared } from "@/community/v1/drafts";

/* -------------------------------------------------------------- */
/*  Lightweight inline composer above the feed.                    */
/*  כתיבה → זהות → מרחב → פרסום, בלי אשף                          */
/* -------------------------------------------------------------- */

type Attached = NewAttachment & { id: string; uploading?: boolean };

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const LINK_META: Record<string, string> = {
  "kolzchut.org.il": "זכויות שוכרי דירה — כל זכות",
  "gov.il": "מחשבון סיוע בשכר דירה — משרד הבינוי והשיכון",
  "boi.org.il": "השוואת ריביות משכנתה — בנק ישראל",
};

const icoFor = (a: Attached) => {
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

export interface InlineComposerProps {
  displayName: string;
  initials: string;
  nickname: string | null;
  avatarUrl?: string | null;
  avatarInNicknameMode?: boolean;
  onNicknameCreated: (nick: string) => void;
  space: SpaceId;
  onSpaceChange: (s: SpaceId) => void;
  onExpand: () => void;
  onPublished: (postId: string) => void | Promise<void>;
}

export default function InlineComposer({
  displayName,
  initials,
  nickname,
  avatarUrl,
  avatarInNicknameMode,
  onNicknameCreated,
  space,
  onSpaceChange,
  onExpand,
  onPublished,
}: InlineComposerProps) {
  const reinforce = useReinforce();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(() => draftField(draftKeys.newPost, "title"));
  const [body, setBody] = useState(() => draftField(draftKeys.newPost, "body"));
  const [as, setAs] = useState<"name" | "nick">("name");
  const [menu, setMenu] = useState<null | "identity" | "space">(null);
  const [nickDraft, setNickDraft] = useState("");
  const [nickError, setNickError] = useState("");
  const [nickChecking, setNickChecking] = useState(false);
  const [nickPanel, setNickPanel] = useState(false);
  const [attached, setAttached] = useState<Attached[]>([]);
  const [panel, setPanel] = useState<null | "file" | "link">(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [posted, setPosted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // her words are kept locally until the post is really published
  useDraftAutosave(draftKeys.newPost, { title, body });
  useDraftCleared(draftKeys.newPost, () => {
    setTitle("");
    setBody("");
  });

  const activeSpace = spaceById(space);
  const accent = accentColor(activeSpace);
  const canPublish =
    title.trim().length >= 4 &&
    body.trim().length >= 15 &&
    (as === "name" || Boolean(nickname)) &&
    !attached.some((a) => a.uploading);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setMenu(null);
        if (open) setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

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
      onNicknameCreated(n);
      setAs("nick");
      setNickPanel(false);
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "");
      if (msg.includes("nickname_taken")) setNickError("הניק הזה כבר תפוס, אפשר לבחור אחר");
      else if (msg.includes("nickname_length")) setNickError("הניק צריך להיות בין 2 ל-18 תווים");
      else setNickError("קרתה תקלה, נסי שוב.");
    } finally {
      setNickChecking(false);
    }
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!/^https?:\/\/\S+\.\S+/.test(url)) {
      setLinkError("הכתובת צריכה להתחיל ב-https://");
      return;
    }
    let host = url;
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* keep raw */
    }
    const key = Object.keys(LINK_META).find((k) => host.endsWith(k));
    setAttached((a) => [
      ...a,
      { id: crypto.randomUUID(), kind: "link", title: key ? LINK_META[key] : host, meta: host, url },
    ]);
    setLinkUrl("");
    setLinkError("");
    setPanel(null);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files);
    setPanel(null);
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

  const publish = async () => {
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
      setPosted(true);
      clearDraft(draftKeys.newPost);
      reinforce("firstComment");
      setTitle("");
      setBody("");
      setAttached([]);
      setOpen(false);
      window.setTimeout(() => setPosted(false), 4000);
      await onPublished(postId);
    } catch {
      toast.error("הפרסום לא נשמר. נסי שוב.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div ref={wrapRef} className="mb-5">
      <div
        onClick={() => {
          if (!open) {
            setOpen(true);
            requestAnimationFrame(() => bodyRef.current?.focus());
          }
        }}
        className={`rounded-[24px] p-3.5 transition-all duration-300 md:p-4 ${
          open ? "bg-primary/[0.03]" : "cursor-text bg-accent/25 hover:bg-accent/35"
        }`}
        style={open ? { boxShadow: `inset 0 0 0 1px hsl(var(--border) / 0.7)` } : undefined}
      >
        <div className="flex items-start gap-3">
          <MemberAvatar
            name={as === "nick" ? nickname ?? "?" : displayName}
            seed={as === "nick" ? nickname : displayName}
            imageUrl={as === "nick" && !avatarInNicknameMode ? null : avatarUrl ?? null}
            nickname={as === "nick"}
            size="sm"
            className="mt-0.5"
          />

          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-[13.5px] font-light text-foreground">
              כאן אפשר לשאול, לכתוב, לדבר
            </p>
            {open && (
              <input
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="כותרת (חובה)"
                className="mb-2 w-full rounded-2xl border border-border/70 bg-background/85 px-4 py-2.5 text-[14.5px] font-medium outline-none transition-all placeholder:font-light placeholder:text-muted-foreground/60 focus:border-border focus:bg-background"
              />
            )}
            <textarea
              ref={bodyRef}
              value={body}
              onFocus={() => setOpen(true)}
              onChange={(e) => setBody(e.target.value)}
              rows={open ? 6 : 1}
              placeholder="כתבי כאן..."
              className="w-full resize-none rounded-2xl border border-border/70 bg-background/85 px-4 py-2.5 text-[14px] font-light leading-[1.65] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-border focus:bg-background"
            />


            {/* meta row */}
            {open && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5 text-[12.5px] font-light">
              {/* identity */}
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">מפרסמת כ:</span>
                <span className="relative">
                  <button
                    onClick={() => setMenu(menu === "identity" ? null : "identity")}
                    className="inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1.5 text-foreground transition-colors hover:bg-background"
                  >
                    {as === "nick" ? (nickname ?? "בניק") : displayName}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  {menu === "identity" && (
                    <span className="absolute end-0 top-full z-20 mt-2 block w-[268px] rounded-2xl border border-border/70 bg-card p-1.5 shadow-[var(--shadow-card)]">
                      <button
                        onClick={() => {
                          setAs("name");
                          setMenu(null);
                        }}
                        className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-muted"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] text-foreground">
                            בשמי — {displayName}
                          </span>
                          <span className="block text-[11.5px] text-muted-foreground">
                            כמו שאת מופיעה בקהילה
                          </span>
                        </span>
                        {as === "name" && <Check className="mt-1 h-3.5 w-3.5 text-primary" />}
                      </button>
                      <button
                        onClick={() => {
                          if (nickname) {
                            setAs("nick");
                            setMenu(null);
                          } else {
                            setNickPanel(true);
                            setMenu(null);
                          }
                        }}
                        className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-muted"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] text-foreground">
                            {nickname ? `בניק שלי — ${nickname}` : "בחרי לך ניק לקהילה"}
                          </span>
                          <span className="block text-[11.5px] leading-relaxed text-muted-foreground">
                            {nickname
                              ? "השם שלך לא יוצג לחברות הקהילה."
                              : "שם שתוכלי להמשיך איתו גם בשיחות הבאות"}
                          </span>
                        </span>
                        {as === "nick" && nickname && (
                          <Check className="mt-1 h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    </span>
                  )}
                </span>
              </span>

              {/* space */}
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">במרחב:</span>
                <span className="relative">
                  <button
                    onClick={() => setMenu(menu === "space" ? null : "space")}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: accentBg(activeSpace, 0.16), color: accent }}
                  >
                    {activeSpace.shortName}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                  {menu === "space" && (
                    <span className="absolute end-0 top-full z-20 mt-2 block w-[318px] rounded-2xl border border-border/70 bg-card p-1.5 shadow-[var(--shadow-card)]">
                      {postableSpaces().map((s) => {
                        const Icon = s.icon;
                        const on = space === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              onSpaceChange(s.id);
                              setMenu(null);
                            }}
                            className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-start transition-colors ${
                              on ? "bg-primary/[0.07]" : "hover:bg-muted"
                            }`}
                          >
                            <Icon
                              className="mt-[3px] h-4 w-4 shrink-0"
                              style={{ color: accentColor(s) }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] text-foreground">{s.name}</span>
                              <span className="mt-0.5 block text-[11.5px] font-light leading-snug text-muted-foreground">
                                {s.tagline}
                              </span>
                            </span>
                            {on && <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />}
                          </button>
                        );
                      })}
                    </span>
                  )}

                </span>
              </span>

              <span className="ms-auto flex items-center gap-1">
                <EmojiPicker
                  label="הוספת אימוג'י"
                  onPick={(e) => insertAtCursor(bodyRef.current, body, e, setBody)}
                />
                <button
                  onClick={() => setPanel(panel === "file" ? null : "file")}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-primary/[0.07] hover:text-primary"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  צירוף קובץ
                </button>
                <button
                  onClick={() => setPanel(panel === "link" ? null : "link")}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-primary/[0.07] hover:text-primary"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  הוספת קישור
                </button>
              </span>

            </div>
            )}

            {/* nickname creation, naturally from here */}
            {nickPanel && !nickname && (
              <div className="mt-3 rounded-2xl bg-background/80 p-4">
                <p className="text-[13px] text-foreground">בחרי לך ניק לקהילה</p>
                <p className="mt-1 text-[11.5px] font-light leading-relaxed text-muted-foreground">
                  הניק יופיע במקום שמך, ואפשר להמשיך איתו גם בשיחות הבאות. צוות הניהול יודע איזה
                  חשבון מאחוריו, כדי לשמור על הקהילה.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={nickDraft}
                    maxLength={18}
                    onChange={(e) => {
                      setNickDraft(e.target.value);
                      setNickError("");
                    }}
                    placeholder="למשל: אחת ששואלת"
                    className="min-w-[180px] flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13.5px] outline-none focus:border-border"
                  />
                  <button
                    onClick={saveNick}
                    disabled={nickChecking}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[12.5px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))] disabled:opacity-70"
                  >
                    {nickChecking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {nickChecking ? "בודקות" : "שמירה"}
                  </button>
                  <button
                    onClick={() => setNickPanel(false)}
                    className="text-[12px] font-light text-muted-foreground hover:text-foreground"
                  >
                    ביטול
                  </button>
                </div>
                {nickError && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] font-light text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {nickError}
                  </p>
                )}
              </div>
            )}

            {/* attach panels */}
            {panel === "file" && (
              <div className="mt-3 rounded-2xl border border-dashed border-border/80 p-4">
                <p className="text-[12px] font-light text-muted-foreground">
                  גררי לכאן קובץ, או בחרי מהמחשב — עד 10MB. הקבצים נשארים בתוך הקהילה.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full bg-muted/70 px-3 py-1.5 text-[12px] font-light text-foreground/80 hover:bg-muted"
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

            {panel === "link" && (
              <div className="mt-3 rounded-2xl border border-dashed border-border/80 p-4">
                <input
                  value={linkUrl}
                  dir="ltr"
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-border"
                />
                {linkError && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] font-light text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {linkError}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={addLink}
                    className="rounded-full bg-accent px-4 py-1.5 text-[12.5px] text-accent-foreground"
                  >
                    הוספה
                  </button>
                  <button
                    onClick={() => setPanel(null)}
                    className="text-[12px] font-light text-muted-foreground hover:text-foreground"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}

            {attached.length > 0 && (
              <ul className="mt-3 space-y-2">
                {attached.map((a) => {
                  const Icon = icoFor(a);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl bg-background/75 px-3.5 py-2.5"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-foreground">{a.title}</span>
                        <span className="flex items-center gap-1.5 text-[11px] font-light text-muted-foreground">
                          {a.kind === "link" && <Globe className="h-3 w-3" />}
                          <span dir="ltr">{a.meta ?? ""}</span>
                        </span>
                      </span>
                      {a.uploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <button
                          onClick={() => setAttached((l) => l.filter((x) => x.id !== a.id))}
                          aria-label="הסרה"
                          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* actions */}
            {open && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="flex items-center gap-3 text-[12px] font-light text-muted-foreground">
                  <button
                    onClick={onExpand}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    כתיבה מורחבת
                  </button>
                  {as === "nick" && nickname && <span>השם שלך לא יוצג לחברות הקהילה.</span>}
                </span>
                <span className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setOpen(false);
                      setPanel(null);
                    }}
                    aria-label="סגירה"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => canPublish && !publishing && publish()}
                    disabled={publishing}
                    className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] transition-all ${
                    canPublish
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/35 hover:bg-[hsl(var(--primary-glow))]"
                      : "cursor-not-allowed bg-primary/45 text-primary-foreground"
                    }`}
                  >
                    {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
                    {publishing ? "מפרסמות…" : "פרסמי"}
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {posted && (
        <p className="mt-2.5 text-[12.5px] font-light text-muted-foreground">
          פרסמת ב״{activeSpace.name}״{" "}
          {as === "nick" ? `בניק ${nickname}` : `בשם ${displayName}`}.
        </p>
      )}
    </div>
  );
}
