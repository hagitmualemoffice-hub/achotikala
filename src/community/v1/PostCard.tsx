import IdentityPostingNotice from "./IdentityPostingNotice";
import { useIdentityExperiment, identityErrorMessage } from "./identityExperiment";
import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  MessageCircle,
  Pin,
  MoreHorizontal,
  Lightbulb,
  FileSpreadsheet,
  FileText,
  Link2,
  File,
  Wrench,
  Check,
  Loader2,
  Pencil,
  Trash2,
  PinOff,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarStack, avatarColor } from "./Avatar";
import { accentBg, accentColor, spaceById } from "./spaces";
import { useReinforce } from "./reinforcement";
import EmojiPicker, { insertAtCursor } from "./EmojiPicker";
import {
  addComment,
  adminPin,
  adminSetSidebar,
  deleteContent,
  fetchThread,
  openAttachment,
  reactionActors,
  relTime,
  toggleReaction,
  toggleSave,
  updateContent,
  type ApiAttachment,
  type ApiComment,
  type ApiPost,
  type ReactionKind,
  type ReactionMap,
} from "./api";
import ReactionsRow from "./ReactionsRow";
import { MemberHover, openMemberProfile, type MemberChatContext } from "./MemberProfile";
import { useLibaChat } from "./LibaMessages";
import { clearDraft, draftField, draftKeys, useDraftAutosave } from "./drafts";
import AutoGrowingTextarea from "@/components/AutoGrowingTextarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const attachmentIcon = (kind: ApiAttachment["kind"]) => {
  if (kind === "excel") return FileSpreadsheet;
  if (kind === "pdf") return FileText;
  if (kind === "link") return Link2;
  return File;
};




interface Props {
  post: ApiPost;
  me: {
    displayName: string;
    initials: string;
    nickname: string | null;
    avatarUrl?: string | null;
    avatarInNicknameMode?: boolean;
  };
  onRecommend: (post: ApiPost) => void;
  onChanged?: (post: ApiPost) => void;
  onDeleted?: (id: string) => void;
  defaultOpen?: boolean;
  featured?: boolean;
}

/**
 * Colourful letter avatar — the colour is stable per person, not per space.
 * A profile photo replaces the letters whenever one may be shown (never for
 * nickname activity unless she allowed it: the server simply sends no photo then).
 */
const Avatar = ({
  initials,
  nickname,
  size = "md",
  seed,
  imageUrl,
  online,
  userId,
  context,
}: {
  initials: string;
  nickname?: boolean;
  color?: string;
  size?: "md" | "sm";
  seed?: string | null;
  imageUrl?: string | null;
  online?: boolean;
  userId?: string | null;
  context?: MemberChatContext | null;
}) => {
  const dims = size === "md" ? "h-11 w-11 text-[14px]" : "h-8 w-8 text-[12px]";
  const open = (event: React.MouseEvent) => {
    if (!userId) return;
    event.stopPropagation();
    openMemberProfile(userId, context);
  };
  if (imageUrl) {
    return (
      <button type="button" onClick={open} disabled={!userId} aria-label={userId ? "לפתיחת פרופיל" : undefined} className={`relative shrink-0 rounded-full outline-none ${userId ? "transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary" : "cursor-default"}`}>
        <img src={imageUrl} alt="" aria-hidden className={`${dims} rounded-full object-cover`} />
        {online && <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-[hsl(var(--presence-online))]" title="מחוברת עכשיו" />}
      </button>
    );
  }
  const bg = avatarColor(userId || seed || initials);
  return (
    <button type="button" onClick={open} disabled={!userId} aria-label={userId ? "לפתיחת פרופיל" : undefined} className={`relative shrink-0 rounded-full outline-none ${userId ? "transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary" : "cursor-default"}`}>
      <span
        aria-hidden
        className={`flex select-none items-center justify-center rounded-full font-medium text-primary-foreground ${dims} ${nickname ? "ring-2 ring-background/60" : ""}`}
        style={{ backgroundColor: bg }}
      >
        {initials}
      </span>
      {online && <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-[hsl(var(--presence-online))]" title="מחוברת עכשיו" />}
    </button>
  );
};



const PostCard = ({ post, me, onRecommend, onChanged, onDeleted, defaultOpen, featured = false }: Props) => {
  const space = spaceById(post.space);
  const accent = accentColor(space);
  const reinforce = useReinforce();
  const { openChat } = useLibaChat();

  const [current, setCurrent] = useState<ApiPost>(post);
  useEffect(() => setCurrent(post), [post]);

  const patch = (next: ApiPost) => {
    setCurrent(next);
    onChanged?.(next);
  };

  const [expanded, setExpanded] = useState(!!defaultOpen);
  const [openComments, setOpenComments] = useState(!!defaultOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  // unsent text lives on her device until it is actually published
  const commentKey = draftKeys.comment(post.id);
  const editKey = draftKeys.editPost(post.id);
  const [draft, setDraft] = useState(() => draftField(commentKey, "body"));
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const replyKey = replyTo ? draftKeys.reply(replyTo) : null;

  useDraftAutosave(commentKey, { body: draft });
  useDraftAutosave(replyKey, { body: replyDraft });

  useEffect(() => {
    setReplyDraft(replyTo ? draftField(draftKeys.reply(replyTo), "body") : "");
  }, [replyTo]);

  const [comments, setComments] = useState<ApiComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(() => draftField(editKey, "body", current.body));
  const [editTitle, setEditTitle] = useState(() => draftField(editKey, "title", current.title ?? ""));
  useDraftAutosave(editKey, { body: editBody, title: editTitle }, editing);


  const [deleting, setDeleting] = useState(false);

  const { allowNickname, ready, state: identityState } = useIdentityExperiment();
  const [asNickname, setAsNickname] = useState(false);
  const [replyAsNickname, setReplyAsNickname] = useState(false);

  const canModerate = current.can_moderate;
  const canEdit = current.mine || canModerate;
  const participants = (current.participants ?? [])
    .filter((person) =>
      current.author.user_id && person.user_id
        ? person.user_id !== current.author.user_id
        : person.name !== current.author.name || person.nickname !== current.author.nickname,
    )
    .map((person) => ({
      name: person.name,
      nickname: person.nickname,
      seed: person.seed ?? person.user_id,
      imageUrl: person.avatar_url ?? null,
      online: person.online,
    }));

  const loadThread = async () => {
    setLoadingComments(true);
    try {
      const data = await fetchThread(current.id);
      setComments(data);
    } catch {
      toast.error("לא הצלחנו לטעון את השיחה, נסי שוב");
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (defaultOpen) loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [actors, setActors] = useState<Partial<Record<ReactionKind, string>>>({});

  const toggleOpenComments = () => {
    const next = !openComments;
    setOpenComments(next);
    if (next && comments === null) loadThread();
  };

  /** Lazily loads who reacted, for the hover tooltip. */
  const loadActors = async (kind: ReactionKind, count: number) => {
    if (count === 0 || actors[kind] !== undefined) return;
    setActors((a) => ({ ...a, [kind]: "" }));
    try {
      const list = await reactionActors("post", current.id, kind);
      setActors((a) => ({ ...a, [kind]: list.map((x) => x.name).join(", ") }));
    } catch {
      setActors((a) => ({ ...a, [kind]: "" }));
    }
  };

  /**
   * One reaction per woman per item: choosing a new one replaces the previous
   * one, choosing the same one again removes it.
   */
  const nextReactions = (prev: ReactionMap, kind: ReactionKind): ReactionMap => {
    const kinds = Object.keys(prev) as ReactionKind[];
    const mineKind = kinds.find((k) => prev[k]?.mine) ?? null;
    const next: ReactionMap = { ...prev };
    if (mineKind) {
      next[mineKind] = { count: Math.max(0, (prev[mineKind]?.count ?? 1) - 1), mine: false };
    }
    if (mineKind !== kind) {
      next[kind] = { count: (next[kind]?.count ?? 0) + 1, mine: true };
    }
    return next;
  };

  const doReaction = async (kind: ReactionKind) => {
    const prev = current.reactions;
    const optimistic = nextReactions(prev, kind);
    const willTurnOn = !!optimistic[kind]?.mine;
    patch({ ...current, reactions: optimistic });
    if (willTurnOn) {
      if (kind === "me_too") reinforce((prev[kind]?.count ?? 0) + 1 >= 5 ? "meTooMany" : "meTooReceived");
      else if (kind === "useful") reinforce("commentUseful");
      else reinforce("meTooReceived");
    }
    try {
      const fresh = await toggleReaction("post", current.id, kind);
      patch({ ...current, reactions: fresh });
    } catch {
      patch({ ...current, reactions: prev });
      toast.error("לא הצלחנו לעדכן, נסי שוב");
    }
  };

  const doCommentReaction = async (commentId: string, kind: ReactionKind) => {
    if (!comments) return;
    const apply = (list: ApiComment[]): ApiComment[] =>
      list.map((c) => {
        if (c.id === commentId) return { ...c, reactions: nextReactions(c.reactions, kind) };
        if (c.replies) return { ...c, replies: apply(c.replies) };
        return c;
      });
    const prev = comments;
    setComments(apply(prev));
    try {
      const fresh = await toggleReaction("comment", commentId, kind);
      setComments((cur) => {
        if (!cur) return cur;
        const set = (list: ApiComment[]): ApiComment[] =>
          list.map((c) => {
            if (c.id === commentId) return { ...c, reactions: fresh };
            if (c.replies) return { ...c, replies: set(c.replies) };
            return c;
          });
        return set(cur);
      });
    } catch {
      setComments(prev);
      toast.error("לא הצלחנו לעדכן, נסי שוב");
    }
  };

  const doSave = async () => {
    const prev = current.saved;
    patch({ ...current, saved: !prev });
    try {
      const saved = await toggleSave(current.id);
      patch({ ...current, saved });
    } catch {
      patch({ ...current, saved: prev });
      toast.error("לא הצלחנו לעדכן, נסי שוב");
    }
  };

  const doPin = async () => {
    const prev = current.pinned;
    setMenuOpen(false);
    patch({ ...current, pinned: !prev });
    try {
      await adminPin(current.id, !prev);
    } catch {
      patch({ ...current, pinned: prev });
      toast.error("לא הצלחנו לעדכן, נסי שוב");
    }
  };

  const doSidebar = async (show: boolean) => {
    setMenuOpen(false);
    try {
      await adminSetSidebar(current.id, show);
      toast.success(show ? "ההודעה מוצגת בטור הצד" : "ההודעה הוסרה מטור הצד");
    } catch {
      toast.error("לא הצלחנו לעדכן, נסי שוב");
    }
  };

  const doSaveEdit = async () => {
    if (editTitle.trim().length < 4) {
      toast.error("צריך להוסיף כותרת בת 4 תווים לפחות");
      return;
    }
    try {
      await updateContent("post", current.id, editBody, editTitle.trim());
      clearDraft(editKey);
      patch({
        ...current,
        body: editBody,
        title: editTitle.trim(),
        edited_at: new Date().toISOString(),
      });
      setEditing(false);
    } catch {
      toast.error("לא הצלחנו לשמור, נסי שוב");
    }
  };

  const doDelete = async () => {
    try {
      await deleteContent("post", current.id);
      onDeleted?.(current.id);
    } catch {
      toast.error("לא הצלחנו למחוק, נסי שוב");
    } finally {
      setDeleting(false);
    }
  };

  const sendComment = async () => {
    const body = draft.trim();
    if (!body) return;
    try {
      await addComment({ postId: current.id, body, asNickname });
      setDraft("");
      clearDraft(commentKey);
      reinforce("firstComment");
      await loadThread();
      patch({ ...current, comment_count: current.comment_count + 1 });
    } catch (error) {
      toast.error(identityErrorMessage(error, "לא הצלחנו לשלוח, נסי שוב"));
    }
  };

  const sendReply = async (parentId: string) => {
    const body = replyDraft.trim();
    if (!body) return;
    try {
      await addComment({ postId: current.id, body, parentId, asNickname: replyAsNickname });
      clearDraft(draftKeys.reply(parentId));
      setReplyDraft("");
      setReplyTo(null);
      reinforce("firstComment");
      await loadThread();
      patch({ ...current, comment_count: current.comment_count + 1 });
    } catch (error) {
      toast.error(identityErrorMessage(error, "לא הצלחנו לשלוח, נסי שוב"));
    }
  };

  const title = (current.title ?? "").trim() || current.body.trim().split(/\n+/)[0]?.slice(0, 72) || "שיתוף מהלב";
  const bodyRef = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    if (expanded) return;
    const el = bodyRef.current;
    if (!el) return;
    const check = () => setClamped(el.scrollHeight - el.clientHeight > 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [current.body, expanded]);


  return (
    <article className="group relative py-9 transition-colors duration-300 md:py-11">
      {!featured && current.unread && (
        <span
          className="absolute top-11 right-0 h-10 w-[3px] rounded-l-full"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      )}

      {!featured && <header className="flex items-start gap-4 md:gap-5">
        <Avatar
          initials={current.author.initials}
          nickname={current.author.nickname}
          seed={current.author.seed ?? current.author.user_id}
          imageUrl={current.author.avatar_url ?? null}
          online={current.author.online}
          color={accent}
          userId={current.author.profile_id}
          context={{ sourceType: "post", sourceId: current.id, title, link: `/liba?post=${current.id}` }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
            <MemberHover userId={current.author.profile_id} context={{ sourceType: "post", sourceId: current.id, title: current.title || current.body.slice(0, 60) }}>
              <button
                type="button"
                onClick={() => openMemberProfile(current.author.profile_id, { sourceType: "post", sourceId: current.id, title: current.title || current.body.slice(0, 60) })}
                className={`font-medium text-foreground ${current.author.profile_id ? "hover:text-primary" : "cursor-default"}`}
              >
                {current.author.name}
              </button>
            </MemberHover>
            {current.author.nickname && (
              <span
                className="rounded-full border border-dashed px-2 py-[1px] text-[10.5px] font-light"
                style={{ borderColor: accent.replace(")", " / 0.45)"), color: accent }}
              >
                בניק קבוע
              </span>
            )}
            <span className="text-muted-foreground/60">·</span>
            <span className="font-light text-muted-foreground">
              {relTime(current.created_at)}
              {current.edited_at && " · נערך"}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span
              className="inline-flex items-center text-[12px] font-light"
              style={{ color: accent }}
            >
              {space.shortName}
            </span>
            {current.pinned && (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-light text-muted-foreground">
                <Pin className="h-3 w-3" />
                נעוץ
              </span>
            )}
          </div>

          <h3 className="mt-2.5 text-[17px] font-semibold leading-[1.4] tracking-[-0.015em] text-foreground md:text-[19px]">
            {title}
          </h3>
        </div>

        <div className="relative flex shrink-0 items-center gap-1">
          <button
            onClick={doSave}
            aria-label={current.saved ? "הסרה מהשמורים" : "שמרי לעצמך"}
            className={`rounded-full p-2 transition-colors hover:bg-muted ${
              current.saved ? "text-primary" : "text-muted-foreground/70 hover:text-primary"
            }`}
          >
            <Bookmark className={`h-4 w-4 ${current.saved ? "fill-current" : ""}`} />
          </button>
          {(current.mine || canModerate) && (
            <button
              onClick={() => setMenuOpen((m) => !m)}
              aria-label="עוד אפשרויות"
              className={`${current.mine || canModerate ? "" : "hidden md:inline-flex"} rounded-full p-2 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}

          {menuOpen && (
            <div className="absolute end-0 top-11 z-20 w-60 overflow-hidden rounded-2xl border border-border/70 bg-card py-1.5 shadow-[var(--shadow-card)]">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onRecommend(current);
                }}
                className="hidden w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13px] font-light text-foreground transition-colors hover:bg-muted md:flex"
              >
                <Lightbulb className="h-4 w-4 text-primary" />
                המליצי להוסיף לכלים
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  doSave();
                }}
                className="hidden w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13px] font-light text-foreground transition-colors hover:bg-muted md:flex"
              >
                <Bookmark className="h-4 w-4 text-muted-foreground" />
                {current.saved ? "הסרה מהשמורים" : "שמרי לעצמך"}
              </button>

              {canModerate && (
                <button
                  onClick={doPin}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13px] font-light text-foreground transition-colors hover:bg-muted"
                >
                  {current.pinned ? (
                    <PinOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Pin className="h-4 w-4 text-muted-foreground" />
                  )}
                  {current.pinned ? "ביטול נעיצה" : "נעיצה בראש הפיד"}
                </button>
              )}
              {canModerate && current.space === "system" && (
                <>
                  <button
                    onClick={() => void doSidebar(true)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13px] font-light text-foreground transition-colors hover:bg-muted"
                  >
                    <Pin className="h-4 w-4 text-muted-foreground" />
                    הצגה בטור הצד
                  </button>
                  <button
                    onClick={() => void doSidebar(false)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13px] font-light text-foreground transition-colors hover:bg-muted"
                  >
                    <PinOff className="h-4 w-4 text-muted-foreground" />
                    הסרה מטור הצד
                  </button>
                </>
              )}

              {canEdit ? (
                <>
                  <div className="my-1 hidden border-t border-border/60 md:block" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setEditBody(current.body);
                      setEditTitle(current.title ?? "");
                      setEditing(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13px] font-light text-foreground transition-colors hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    עריכה
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleting(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13px] font-light text-destructive transition-colors hover:bg-muted"
                  >
                    <Trash2 className="h-4 w-4" />
                    מחיקה
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </header>}

      {featured && (
        <div className="md:px-2">
          <h2 className="text-[22px] font-medium leading-relaxed text-foreground md:text-[28px]">{current.title}</h2>
          <div className="mt-4 space-y-2.5">
            {current.body.split("\n").map((line, i) => {
              const t = line.trim();
              if (!t) return null;
              const dash = t.indexOf("—");
              if (dash > 0) {
                const head = t.slice(0, dash).replace(/[|–-]\s*$/, "").trim();
                const rest = t.slice(dash + 1).trim();
                return (
                  <div key={i} className="rounded-2xl border border-primary/15 bg-primary/[0.05] px-4 py-3">
                    <p className="text-[14px] font-medium text-primary md:text-[15px]">{head}</p>
                    <p className="mt-0.5 text-[13.5px] font-light leading-6 text-foreground/85 md:text-[14.5px]">{rest}</p>
                  </div>
                );
              }
              return (
                <p key={i} className="text-[15px] font-light leading-7 text-foreground/90 md:text-[16px]">{t}</p>
              );
            })}
          </div>
        </div>
      )}

      {editing ? (
        <div className="mt-4 space-y-3 md:ms-[64px] md:max-w-[64ch]">
          <input
            value={editTitle}
            maxLength={80}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="כותרת (חובה)"
            className="w-full rounded-2xl border border-border bg-background/80 px-4 py-2.5 text-[15px] font-semibold outline-none transition-all placeholder:font-light placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-[14.5px] font-light leading-[1.9] outline-none transition-all focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
          />
          <div className="flex items-center gap-2.5">
            <button
              onClick={doSaveEdit}
              className="rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))]"
            >
              שמירה
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full px-4 py-2 text-[12.5px] font-light text-muted-foreground transition-colors hover:bg-muted"
            >
              ביטול
            </button>
          </div>
        </div>
      ) : !featured ? (
        <div className="mt-4 ps-0 md:ms-[64px] md:max-w-[64ch]">
          <div
            ref={bodyRef}
            className={`whitespace-pre-wrap text-[14px] font-light leading-[1.65] text-foreground/90 md:text-[15px] ${
              expanded ? "" : "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5]"
            }`}
          >
            {current.body}
          </div>
          {clamped && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-2 text-[13px] text-primary transition-opacity hover:opacity-70"
            >
              {expanded ? "הצג פחות" : "הצג עוד"}
            </button>
          )}
        </div>

      ) : null}

      {current.attachments.length > 0 && (
        <div className="mt-5 max-w-[48ch] space-y-2.5 md:ms-[64px]">
          {current.attachments.map((a) => {
            const AIcon = attachmentIcon(a.kind);
            return (
              <button
                key={a.id}
                onClick={() => openAttachment(a)}
                className="flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-start"
                style={{ backgroundColor: accentBg(space, 0.1) }}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/85"
                  style={{ color: accent }}
                >
                  <AIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-foreground">{a.title}</span>
                  {a.meta && (
                    <span className="block text-[11.5px] font-light text-muted-foreground">{a.meta}</span>
                  )}
                </span>
                {a.curated && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11px] text-primary">
                    <Wrench className="h-3 w-3" />
                    מומלץ
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <footer className={`mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 ${featured ? "" : "md:ms-[64px]"}`}>
        <ReactionsRow
          targetType="post"
          targetId={current.id}
          reactions={current.reactions}
          onReact={doReaction}
        />

        <span className="ms-auto inline-flex items-center gap-2 md:ms-0">
          <span className="inline-flex items-center gap-1 text-[12.5px] font-light tabular-nums text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            {current.comment_count}
          </span>
          {participants.length > 0 && (
            <AvatarStack
              people={participants}
              total={Math.max(0, (current.participant_count ?? participants.length + 1) - 1)}
              max={3}
            />
          )}
        </span>
        <button
          onClick={toggleOpenComments}
          aria-expanded={openComments}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[12.5px] font-medium text-primary transition-colors hover:bg-primary/[0.07]"
        >
          תגובה
        </button>
      </footer>


      {openComments && (
        // a clear line between the end of the post and the start of the talk
        <div className={`mt-5 border-t-2 border-border/70 pt-5 md:mt-7 md:border-0 md:pt-0 ${featured ? "" : "md:ms-[64px]"}`}>
          <div
            className="border-s ps-5 md:ps-7"
            style={{ borderColor: accent.replace(")", " / 0.22)") }}
          >

            {loadingComments && (
              <div className="flex items-center gap-2 py-4 text-[13px] font-light text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                טוענות את השיחה…
              </div>
            )}

            {!loadingComments && comments && (
              <div className="space-y-6">
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    accent={accent}
                    onReact={doCommentReaction}
                    replyTo={replyTo}
                    setReplyTo={setReplyTo}
                    replyDraft={replyDraft}
                    setReplyDraft={setReplyDraft}
                    replyRef={replyRef}
                    replyAsNickname={replyAsNickname}
                    setReplyAsNickname={setReplyAsNickname}
                    myNickname={me.nickname}
                    onSendReply={sendReply}
                    onReinforce={reinforce}
                    onChangedComment={(next) =>
                      setComments((cur) =>
                        cur
                          ? cur.map((x) => (x.id === next.id ? next : { ...x, replies: x.replies?.map((r) => (r.id === next.id ? next : r)) }))
                          : cur,
                      )
                    }
                    onDeletedComment={(id) =>
                      setComments((cur) =>
                        cur
                          ? cur
                              .filter((x) => x.id !== id)
                              .map((x) => ({ ...x, replies: x.replies?.filter((r) => r.id !== id) }))
                          : cur,
                      )
                    }
                    onCountChanged={(delta) =>
                      patch({ ...current, comment_count: current.comment_count + delta })
                    }
                  />
                ))}
              </div>
            )}

            <div className="mt-7 border-t border-border/50 pt-5">
              <IdentityPostingNotice comment />
              <div className="flex items-end gap-3">
                <Avatar
                  initials={me.initials}
                  seed={asNickname ? me.nickname : me.displayName}
                  nickname={asNickname}
                  imageUrl={asNickname && !me.avatarInNicknameMode ? null : me.avatarUrl ?? null}
                  color={accent}
                  size="sm"
                />
                <span className="relative flex flex-1 items-end">
                  <AutoGrowingTextarea
                    ref={draftRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendComment();
                      }
                    }}
                    placeholder="מה תרצי לומר לה?"
                    rows={1}
                    className="max-h-40 min-h-[46px] w-full rounded-[22px] border border-border bg-background/80 px-4 py-3 pe-11 text-[13.5px] font-light leading-relaxed outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                  />
                  <span className="absolute bottom-1.5 end-2">
                    <EmojiPicker
                      size="sm"
                      onPick={(e) => insertAtCursor(draftRef.current, draft, e, setDraft)}
                    />
                  </span>
                </span>
                {/* phones: a round send button with an arrow, as in WhatsApp */}
                <button
                  onClick={sendComment}
                  disabled={!ready || (!allowNickname && !identityState?.has_full_name)}
                  aria-label="שליחה"
                  title="שליחה"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-[hsl(var(--primary-glow))] md:h-auto md:w-auto md:px-4 md:py-2.5 md:text-[12.5px]"
                >
                  <Send className="h-[18px] w-[18px] md:hidden" />
                  <Check className="hidden h-3.5 w-3.5 md:inline" />
                  <span className="hidden md:inline">שליחה</span>
                </button>
              </div>
              {allowNickname && me.nickname && (
                <button
                  onClick={() => setAsNickname((v) => !v)}
                  className="mt-2 ms-11 text-[11.5px] font-light text-muted-foreground/80 transition-colors hover:text-foreground"
                >
                  {asNickname ? `בניק ${me.nickname}` : `בשם ${me.displayName}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את הפוסט?</AlertDialogTitle>
            <AlertDialogDescription>הפעולה הזאת לא ניתנת לביטול.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>מחיקה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
};

interface CommentItemProps {
  comment: ApiComment;
  accent: string;
  onReact: (id: string, kind: ReactionKind) => void;
  replyTo: string | null;
  setReplyTo: (id: string | null) => void;
  replyDraft: string;
  setReplyDraft: (v: string) => void;
  replyRef: React.RefObject<HTMLTextAreaElement>;
  replyAsNickname: boolean;
  setReplyAsNickname: (v: boolean) => void;
  myNickname: string | null;
  onSendReply: (parentId: string) => void;
  onReinforce: (key: Parameters<ReturnType<typeof useReinforce>>[0]) => void;
  onChangedComment: (c: ApiComment) => void;
  onDeletedComment: (id: string) => void;
  onCountChanged: (delta: number) => void;
  /** a reply inside a response — same functionality, tighter look */
  nested?: boolean;
  /** replies stay attached to the response they belong to */
  replyParentId?: string;
}

const CommentItem = ({
  comment,
  accent,
  onReact,
  replyTo,
  setReplyTo,
  replyDraft,
  setReplyDraft,
  replyRef,
  replyAsNickname,
  setReplyAsNickname,
  myNickname,
  onSendReply,
  onReinforce,
  onChangedComment,
  onDeletedComment,
  onCountChanged,
  nested = false,
  replyParentId,
}: CommentItemProps) => {
  const { allowNickname, ready, state: identityState } = useIdentityExperiment();
  const { openChat } = useLibaChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const editKey = draftKeys.editComment(comment.id);
  const [editBody, setEditBody] = useState(() => draftField(editKey, "body", comment.body));
  useDraftAutosave(editKey, { body: editBody }, editing);
  const [deleting, setDeleting] = useState(false);

  const doSaveEdit = async () => {
    try {
      await updateContent("comment", comment.id, editBody);
      clearDraft(editKey);
      onChangedComment({ ...comment, body: editBody, edited_at: new Date().toISOString() });
      setEditing(false);
    } catch {
      toast.error("לא הצלחנו לשמור, נסי שוב");
    }
  };

  const doDelete = async () => {
    try {
      await deleteContent("comment", comment.id);
      onDeletedComment(comment.id);
      onCountChanged(-1);
    } catch {
      toast.error("לא הצלחנו למחוק, נסי שוב");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={nested ? "space-y-3" : "space-y-4"}>
      <div className={`flex items-start ${nested ? "gap-3" : "gap-3.5"}`}>
        <Avatar
          initials={comment.author.initials}
          nickname={comment.author.nickname}
          seed={comment.author.seed ?? comment.author.user_id}
          imageUrl={comment.author.avatar_url ?? null}
          online={comment.author.online}
          color={accent}
          size="sm"
          userId={comment.author.profile_id}
          context={{ sourceType: "comment", sourceId: comment.id, title: "תגובה בפורום", subtitle: comment.body.slice(0, 60) }}
        />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
            <MemberHover userId={comment.author.profile_id} context={{ sourceType: "comment", sourceId: comment.id, title: "תגובה בפורום", subtitle: comment.body.slice(0, 60) }}>
              <button
                type="button"
                onClick={() => openMemberProfile(comment.author.profile_id, { sourceType: "comment", sourceId: comment.id, title: "תגובה בפורום", subtitle: comment.body.slice(0, 60) })}
                className={`font-medium text-foreground ${comment.author.profile_id ? "hover:text-primary" : "cursor-default"}`}
              >
                {comment.author.name}
              </button>
            </MemberHover>
            {comment.author.nickname && (
              <span
                className="rounded-full border border-dashed px-1.5 py-[1px] text-[10px] font-light"
                style={{ borderColor: accent.replace(")", " / 0.45)"), color: accent }}
              >
                ניק
              </span>
            )}
            <span className="text-muted-foreground/60">·</span>
            <span className="font-light text-muted-foreground">
              {relTime(comment.created_at)}
              {comment.edited_at && " · נערך"}
            </span>

            {/* management only — kept away from the social row */}
            {comment.mine && (
              <span className="relative ms-auto">
                <button
                  onClick={() => setMenuOpen((m) => !m)}
                  aria-label="עוד אפשרויות"
                  className="rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {menuOpen && (
                  <span className="absolute end-0 top-7 z-20 block w-48 overflow-hidden rounded-2xl border border-border/70 bg-card py-1.5 shadow-[var(--shadow-card)]">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setEditBody(comment.body);
                        setEditing(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13px] font-light text-foreground transition-colors hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      עריכה
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleting(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13px] font-light text-destructive transition-colors hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      מחיקה
                    </button>
                  </span>
                )}
              </span>
            )}
          </p>


          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                className="w-full max-w-[58ch] rounded-2xl border border-border bg-background/80 px-3.5 py-2.5 text-[13.5px] font-light leading-[1.9] outline-none transition-all focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={doSaveEdit}
                  className="rounded-full bg-primary px-3.5 py-1.5 text-[12px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))]"
                >
                  שמירה
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-full px-3.5 py-1.5 text-[12px] font-light text-muted-foreground transition-colors hover:bg-muted"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 max-w-[62ch] whitespace-pre-wrap text-[14.5px] font-light leading-[1.6] text-foreground/90">
              {comment.body}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-muted-foreground">
            <ReactionsRow
              targetType="comment"
              targetId={comment.id}
              reactions={comment.reactions}
              size="sm"
              onReact={(kind) => onReact(comment.id, kind)}
            />

            <button
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className={`font-light transition-colors ${
                replyTo === comment.id ? "text-primary" : "hover:text-foreground"
              }`}
            >
              תגובה
            </button>
          </div>

          {replyTo === comment.id && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-end gap-2.5">
                <span className="relative flex flex-1 items-end">
                  <AutoGrowingTextarea
                    ref={replyRef}
                    value={replyDraft}
                    autoFocus
                    onChange={(e) => setReplyDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSendReply(replyParentId ?? comment.id);
                      }
                    }}
                    placeholder={`תשובה ל${comment.author.name}…`}
                    rows={1}
                    className="max-h-28 min-h-9 w-full rounded-[20px] border border-border bg-background/80 px-4 py-2 pe-10 text-[13px] font-light leading-relaxed outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                  />
                  <span className="absolute bottom-1 end-1.5">
                    <EmojiPicker
                      size="sm"
                      onPick={(e) => insertAtCursor(replyRef.current, replyDraft, e, setReplyDraft)}
                    />
                  </span>
                </span>
                <button
                  disabled={!ready || (!allowNickname && !identityState?.has_full_name)}
                  onClick={() => onSendReply(replyParentId ?? comment.id)}
                  aria-label="שליחה"
                  title="שליחה"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-[hsl(var(--primary-glow))] md:h-auto md:w-auto md:px-4 md:py-2"
                >
                  <Send className="h-4 w-4 md:hidden" />
                  <span className="hidden text-[12px] md:inline">שליחה</span>
                </button>
              </div>
              <IdentityPostingNotice comment />
              {allowNickname && myNickname && (
                <button
                  onClick={() => setReplyAsNickname(!replyAsNickname)}
                  className="text-[11px] font-light text-muted-foreground/80 transition-colors hover:text-foreground"
                >
                  {replyAsNickname ? `בניק ${myNickname}` : "בשם המלא"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* replies keep the very same reactions and menu, only tighter */}
      {comment.replies?.map((r) => (
        <div key={r.id} className="me-11 border-s border-border/70 ps-4">
          <CommentItem
            comment={r}
            accent={accent}
            nested
            replyParentId={comment.id}
            onReact={onReact}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            replyDraft={replyDraft}
            setReplyDraft={setReplyDraft}
            replyRef={replyRef}
            replyAsNickname={replyAsNickname}
            setReplyAsNickname={setReplyAsNickname}
            myNickname={myNickname}
            onSendReply={onSendReply}
            onReinforce={onReinforce}
            onChangedComment={onChangedComment}
            onDeletedComment={onDeletedComment}
            onCountChanged={onCountChanged}
          />
        </div>
      ))}

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את התגובה?</AlertDialogTitle>
            <AlertDialogDescription>הפעולה הזאת לא ניתנת לביטול.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>מחיקה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PostCard;
