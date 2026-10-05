/**
 * Two ways to read the forum:
 *  - FeedCard: warm, editorial rows — title first, short preview, optional image, faces.
 *  - CompactRow: dense discussion list, many conversations at a glance.
 * Both open the full discussion on click; the only write here is a reaction toggle.
 */
import { useEffect, useRef, useState } from "react";
import { ImageIcon, MessageCircle, MoreHorizontal, Pencil, Pin, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AvatarStack, MemberAvatar } from "./Avatar";
import { MemberHover, openMemberProfile, type MemberChatContext } from "./MemberProfile";
import { accentColor, spaceById } from "./spaces";
import {
  deleteContent,
  fetchThread,
  fileUrl,
  relTime,
  type ApiComment,
  type ApiPost,

  type ReactionMap,
} from "./api";
import { reactionLabel } from "./reactions";
import { ReactionIcon } from "./ReactionIcons";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useLibaChat } from "./LibaMessages";


/**
 * Responses read right inside the card: open and close them without leaving
 * the list. Nested replies are flattened — the full discussion is one tap away.
 */
const InlineComments = ({ postId, onOpen }: { postId: string; onOpen: () => void }) => {
  const [list, setList] = useState<ApiComment[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchThread(postId)
      .then((data) => alive && setList(data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [postId]);

  if (failed)
    return (
      <p className="mt-3 text-[12.5px] font-light text-muted-foreground">
        לא הצלחנו לטעון את התגובות.
      </p>
    );

  if (!list)
    return (
      <p className="mt-3 flex items-center gap-2 text-[12.5px] font-light text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> טוענות תגובות…
      </p>
    );

  if (list.length === 0)
    return (
      <p className="mt-3 text-[12.5px] font-light text-muted-foreground">
        עוד אין תגובות. את מוזמנת להיות הראשונה.
      </p>
    );

  const flat: ApiComment[] = [];
  const walk = (items: ApiComment[]) =>
    items.forEach((c) => {
      flat.push(c);
      if (c.replies?.length) walk(c.replies);
    });
  walk(list);

  return (
    <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
      {flat.map((c) => (
        <div key={c.id} className="flex items-start gap-2 text-right">
          <MemberAvatar
            name={c.author.name}
            seed={c.author.seed ?? c.author.user_id}
            imageUrl={c.author.avatar_url ?? null}
            nickname={c.author.nickname}
            size="xs"
            online={c.author.online}
            userId={c.author.profile_id}
            context={{ sourceType: "comment", sourceId: c.id, title: "תגובה בפורום", subtitle: c.body.slice(0, 60) }}
          />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
              <span className="font-medium text-foreground/80">{c.author.name}</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="font-light text-muted-foreground">{relTime(c.created_at)}</span>
            </p>
            <p className="whitespace-pre-wrap text-[13.5px] font-light leading-[1.6] text-foreground/80">
              {c.body}
            </p>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={onOpen}
        className="text-[12.5px] font-medium text-primary transition-opacity hover:opacity-70"
      >
        להגיב ולראות את כל השיחה
      </button>
    </div>
  );
};

/** Edit / delete for her own posts (or an admin), straight from the list. */
const PostActions = ({
  post,
  onEdit,
  onDeleted,
  compact = false,
}: {
  post: ApiPost;
  onEdit: () => void;
  onDeleted?: (id: string) => void;
  compact?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  if (!post.mine) return null;

  const remove = async () => {
    if (busy) return;
    if (!window.confirm("למחוק את הפוסט? הפעולה אינה ניתנת לשחזור.")) return;
    setBusy(true);
    try {
      await deleteContent("post", post.id);
      onDeleted?.(post.id);
      toast.success("הפוסט נמחק");
    } catch {
      toast.error("לא הצלחנו למחוק, נסי שוב");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <span ref={wrap} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label="עוד אפשרויות"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground ${
          compact ? "p-1" : "p-1.5"
        }`}
      >
        <MoreHorizontal className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      {open && (
        <span className="absolute end-0 top-8 z-20 w-44 overflow-hidden rounded-2xl border border-border/70 bg-card py-1.5 text-right shadow-[var(--shadow-card)]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-light text-foreground transition-colors hover:bg-muted"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
            עריכה
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void remove();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-light text-destructive transition-colors hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" />
            מחיקה
          </button>
        </span>
      )}
    </span>
  );
};

const firstLines = (body: string) =>
  body
    .split(/\n+/)
    .filter((l) => l.trim())
    .slice(0, 2)
    .join(" ")
    .trim();

const postTitle = (post: ApiPost) =>
  (post.title ?? "").trim() || firstLines(post.body).slice(0, 72) || "שיתוף מהלב";

const commenters = (post: ApiPost) =>
  (post.participants ?? [])
    .filter((person) =>
      post.author.user_id && person.user_id
        ? person.user_id !== post.author.user_id
        : person.name !== post.author.name || person.nickname !== post.author.nickname,
    )
    .map((person) => ({
      name: person.name,
      nickname: person.nickname,
      seed: person.seed ?? person.user_id,
      imageUrl: person.avatar_url ?? null,
      online: person.online,
    }));


const imageAttachment = (post: ApiPost) =>
  post.attachments.find((a) => a.kind === "image") ?? null;

/** Signed link for a private community image; falls back to nothing on error. */
const usePostImage = (post: ApiPost, enabled: boolean) => {
  const att = imageAttachment(post);
  const [url, setUrl] = useState<string | null>(att?.url ?? null);
  useEffect(() => {
    if (!enabled || !att || att.url || !att.has_file) return;
    let alive = true;
    fileUrl({ attachmentId: att.id })
      .then((u) => alive && setUrl(u))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled, att?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return { hasImage: !!att, url };
};

const activityTime = (post: ApiPost) => relTime(post.created_at);

/**
 * WhatsApp-style summary: up to three most-used reaction faces, then one total
 * count for every reaction on the item. All choices live inside the post.
 */
const ReactionRow = ({ map, dense = false }: { map: ReactionMap; dense?: boolean }) => {
  const used = Object.entries(map)
    .map(([kind, v]) => ({ kind, count: v?.count ?? 0, mine: !!v?.mine }))
    .filter((x) => x.count > 0);
  if (used.length === 0) return null;

  const total = used.reduce((sum, x) => sum + x.count, 0);
  const mine = used.some((x) => x.mine);
  const top = [...used].sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <span
      title={used.map((x) => `${reactionLabel(x.kind)} ${x.count}`).join(" · ")}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-light ${
        dense ? "text-[11px]" : "text-[11.5px]"
      } ${mine ? "border-primary/40 text-primary" : "border-border/70 text-muted-foreground"}`}
    >
      <span className="flex items-center gap-0.5 leading-none">
        {top.map((x) => (
          <ReactionIcon key={x.kind} kind={x.kind} className="h-[15px] w-[15px]" />
        ))}
      </span>
      <span className="tabular-nums">{total}</span>
    </span>
  );
};



/** just the name of the space, in its own colour — the icon only added noise */
const SpaceChip = ({ space }: { space: ReturnType<typeof spaceById> }) => (
  <span
    className="inline-flex shrink-0 items-center whitespace-nowrap text-[11.5px] font-light"
    style={{ color: accentColor(space) }}
  >
    {space.shortName}
  </span>
);

export const FeedCard = ({
  post,
  onOpen,
  onEdit,
  onDeleted,
}: {
  post: ApiPost;
  onOpen: () => void;
  onEdit?: () => void;
  onDeleted?: (id: string) => void;
}) => {
  const space = spaceById(post.space);
  const accent = accentColor(space);
  const { url } = usePostImage(post, true);
  const preview = post.body.trim();
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [clamped, setClamped] = useState(false);
  const previewRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (expanded) return;
    const element = previewRef.current;
    if (!element) return;
    const check = () => setClamped(element.scrollHeight - element.clientHeight > 2);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, preview]);

  return (
    <article className="border-b border-border/60 px-1 py-5 text-right last:border-b-0 md:px-2">
      <div className="min-w-0 w-full">
        <div className="flex min-w-0 items-start gap-2">
          <button onClick={onOpen} className="block min-w-0 flex-1 text-right md:w-[70%] md:flex-none">
            <span className="block truncate text-[17px] font-semibold leading-[1.4] text-foreground md:text-[19px]">
              {postTitle(post)}
            </span>
          </button>
          <span className="ms-auto">
            <PostActions post={post} onEdit={onEdit ?? onOpen} onDeleted={onDeleted} />
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-start gap-x-2 gap-y-1.5 text-[12px]">
          <MemberAvatar
            name={post.author.name}
            seed={post.author.seed ?? post.author.user_id}
            imageUrl={post.author.avatar_url ?? null}
            nickname={post.author.nickname}
            size="xs"
            online={post.author.online}
            userId={post.author.profile_id}
            context={{ sourceType: "post", sourceId: post.id, title: postTitle(post), link: `/liba?post=${post.id}` }}
          />

          <MemberHover userId={post.author.profile_id} context={{ sourceType: "post", sourceId: post.id, title: post.title || post.body.slice(0, 60), link: `/liba?post=${post.id}` }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openMemberProfile(post.author.profile_id, { sourceType: "post", sourceId: post.id, title: post.title || post.body.slice(0, 60), link: `/liba?post=${post.id}` });
              }}
              className={`font-medium text-foreground/80 ${post.author.profile_id ? "hover:text-primary" : "cursor-default"}`}
            >
              {post.author.name}
            </button>
          </MemberHover>
          <SpaceChip space={space} />
          <span className="font-light text-muted-foreground">{activityTime(post)}</span>
          {post.pinned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-light text-muted-foreground">
              <Pin className="h-3 w-3" />
              נעוץ
            </span>
          )}
        </div>

        <div className="w-full text-right">
          {preview && (
            <span
              ref={previewRef}
              role="button"
              tabIndex={0}
              onClick={onOpen}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen();
                }
              }}
              className="mt-2 block cursor-pointer whitespace-pre-wrap text-right text-[14px] font-light leading-[1.65] text-foreground/75 md:text-[15px]"
              style={
                expanded
                  ? undefined
                  : {
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 5,
                      overflow: "hidden",
                    }
              }
            >
              {preview}
            </span>
          )}

          {(clamped || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-1.5 text-[12.5px] font-medium text-primary transition-opacity hover:opacity-70"
            >
              {expanded ? "הצג פחות" : "הצג עוד"}
            </button>
          )}

          {url && (
            <button type="button" onClick={onOpen} className="block">
              <img
                src={url}
                alt={postTitle(post)}
                loading="lazy"
                className="mt-3 max-h-48 w-full rounded-xl object-cover md:max-w-[22rem]"
              />
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-start gap-x-3 gap-y-2">
          <ReactionRow map={post.reactions} />
          <span className="flex items-center gap-2">
            <button
              onClick={() => setShowComments((v) => !v)}
              aria-expanded={showComments}
              className="inline-flex items-center gap-1.5 text-[12px] font-light text-muted-foreground transition-colors hover:text-primary"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="tabular-nums">{post.comment_count}</span>
              <span>תגובות</span>
              {showComments ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {commenters(post).length > 0 && (
              <AvatarStack
                people={commenters(post)}
                total={Math.max(0, (post.participant_count ?? commenters(post).length + 1) - 1)}
              />
            )}
            <button
              type="button"
              onClick={onOpen}
              className="text-[12px] font-medium text-primary transition-opacity hover:opacity-70"
            >
              תגובה
            </button>
          </span>
        </div>

        {showComments && <InlineComments postId={post.id} onOpen={onOpen} />}
      </div>
    </article>
  );
};

export const CompactRow = ({
  post,
  onOpen,
  onEdit,
  onDeleted,
}: {
  post: ApiPost;
  onOpen: () => void;
  onEdit?: () => void;
  onDeleted?: (id: string) => void;
}) => {
  const space = spaceById(post.space);
  const preview = firstLines(post.body);
  const hasImage = !!imageAttachment(post);

  return (
    <div className="border-b border-border/50 px-2 py-3 text-right transition-colors last:border-b-0 hover:bg-muted/25 md:grid md:min-h-[72px] md:grid-cols-[minmax(260px,1fr)_auto_54px_minmax(76px,auto)_76px] md:items-center md:gap-x-4 md:px-3 md:py-2.5">
      {/* on the phone the whole row opens the discussion, not only the title */}
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="relative grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] grid-rows-2 items-center gap-x-2 gap-y-1 md:hidden"
      >
        <span className="min-w-0 text-start">
          <span className="flex min-w-0 items-center gap-1.5">
            {post.pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
            <span className="min-w-0 truncate whitespace-nowrap text-[14.5px] font-semibold text-foreground">
              {postTitle(post)}
            </span>
            {hasImage && <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-light text-muted-foreground">
          {activityTime(post)}
          <span onClick={(e) => e.stopPropagation()}>
            <PostActions post={post} onEdit={onEdit ?? onOpen} onDeleted={onDeleted} compact />
          </span>
        </span>


        <span className="flex min-w-0 items-center gap-2 text-start text-[11.5px]">
          <MemberAvatar
            name={post.author.name}
            seed={post.author.seed ?? post.author.user_id}
            imageUrl={post.author.avatar_url ?? null}
            nickname={post.author.nickname}
            size="xs"
            online={post.author.online}
            userId={post.author.profile_id}
            context={{ sourceType: "post", sourceId: post.id, title: postTitle(post), link: `/liba?post=${post.id}` }}
          />
          <span className="max-w-[7rem] shrink-0 truncate font-medium text-foreground/80">
            {post.author.name}
          </span>
          <SpaceChip space={space} />
        </span>
        {/* the comment count sits at the far left, under the time */}
        <span className="inline-flex shrink-0 items-center justify-self-end gap-1 text-[11.5px] font-light tabular-nums text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.comment_count}
        </span>
      </div>

      <button onClick={onOpen} className="hidden min-w-0 text-start md:block">
        <span className="flex min-w-0 items-center gap-2">
          {post.pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <span className="min-w-0 truncate text-[15px] font-semibold leading-snug text-foreground transition-colors hover:text-primary">
            {postTitle(post)}
          </span>
          {hasImage && <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />}
        </span>
        <span className="mt-1.5 flex min-w-0 flex-nowrap items-center gap-2 text-[11.5px]">
          <MemberAvatar
            name={post.author.name}
            seed={post.author.seed ?? post.author.user_id}
            imageUrl={post.author.avatar_url ?? null}
            nickname={post.author.nickname}
            size="xs"
            online={post.author.online}
            userId={post.author.profile_id}
            context={{ sourceType: "post", sourceId: post.id, title: postTitle(post), link: `/liba?post=${post.id}` }}
          />

          <MemberHover userId={post.author.profile_id} context={{ sourceType: "post", sourceId: post.id, title: post.title || post.body.slice(0, 60), link: `/liba?post=${post.id}` }}>
            <span
              role={post.author.profile_id ? "button" : undefined}
              onClick={(e) => {
                if (!post.author.profile_id) return;
                e.stopPropagation();
                e.preventDefault();
                openMemberProfile(post.author.profile_id, { sourceType: "post", sourceId: post.id, title: post.title || post.body.slice(0, 60), link: `/liba?post=${post.id}` });
              }}
              className={`max-w-[8rem] shrink-0 truncate font-medium text-foreground/80 ${post.author.profile_id ? "hover:text-primary" : ""}`}
            >
              {post.author.name}
            </span>
          </MemberHover>
          <SpaceChip space={space} />
          {preview && <span className="min-w-0 truncate font-light text-muted-foreground">{preview}</span>}
        </span>
      </button>

      <span className="hidden items-center justify-center md:inline-flex">
        <PostActions post={post} onEdit={onEdit ?? onOpen} onDeleted={onDeleted} compact />
        <ReactionRow map={post.reactions} dense />
      </span>

      <span className="hidden shrink-0 items-center justify-center gap-1 text-[12px] font-light tabular-nums text-muted-foreground md:inline-flex">
        <MessageCircle className="h-3.5 w-3.5" />
        {post.comment_count}
      </span>

      {commenters(post).length > 0 && (
        <span className="hidden shrink-0 justify-self-center md:block">
          <AvatarStack
            people={commenters(post)}
            total={Math.max(0, (post.participant_count ?? commenters(post).length + 1) - 1)}
            max={4}
          />
        </span>
      )}

      <span className="hidden shrink-0 text-end text-[11.5px] font-light text-muted-foreground md:block">
        {activityTime(post)}
      </span>
    </div>
  );
};
