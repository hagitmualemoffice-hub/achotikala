/**
 * One shared reactions row for posts, responses and replies alike.
 *
 * A woman has exactly one reaction per item: the heart is the quick choice, and
 * everything else lives in one small picker. The summary next to it reads like
 * WhatsApp — a few icons and one total — and opens the "who reacted" sheet.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, SmilePlus } from "lucide-react";
import { POST_REACTIONS, emojiKind, reactionLabel } from "./reactions";
import { COMMUNITY_EMOJIS } from "./EmojiPicker";
import { reactionActors, type ReactionKind, type ReactionMap, type ReactionTarget } from "./api";
import { MemberAvatar } from "./Avatar";
import { ReactionIcon } from "./ReactionIcons";
import ResponsiveDialog from "@/components/ResponsiveDialog";

const FEATURED_EMOJIS = ["🤗", "🤩", "💃", "😢", "😭", "😂", "🩷", "💗", "❤️‍🔥"];

type Actor = {
  name: string;
  initials?: string;
  seed?: string | null;
  avatar_url?: string | null;
  user_id?: string | null;
  profile_id?: string | null;
  kind?: ReactionKind;
};

interface Props {
  targetType: ReactionTarget;
  targetId: string;
  reactions: ReactionMap;
  onReact: (kind: ReactionKind) => void;
  size?: "md" | "sm";
  /** hide a kind that is handled elsewhere (e.g. "עזרת לי" on a response) */
  hideTextKinds?: ReactionKind[];
  /** extra buttons rendered at the end of the row */
  children?: React.ReactNode;
}

const ReactionsRow = ({
  targetType,
  targetId,
  reactions,
  onReact,
  size = "md",
  hideTextKinds = [],
  children,
}: Props) => {
  const [picker, setPicker] = useState(false);
  const [more, setMore] = useState(false);
  const [details, setDetails] = useState(false);
  const [tab, setTab] = useState<ReactionKind | "all">("all");
  const [actors, setActors] = useState<Actor[] | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!picker) { setMore(false); return; }
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setPicker(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [picker]);

  const openDetails = async () => {
    setTab("all");
    setDetails(true);
    setActors(null);
    try {
      const list = (await reactionActors(targetType, targetId)) as unknown as Actor[];
      setActors(list ?? []);
    } catch {
      setActors([]);
    }
  };

  const textKinds: ReactionKind[] = ["pray", "useful", "me_too"];
  const textChoices = POST_REACTIONS.filter(
    (r) => textKinds.includes(r.kind) && !hideTextKinds.includes(r.kind),
  );
  const choices = POST_REACTIONS.filter(
    (r) => r.kind !== "heart" && !textKinds.includes(r.kind) && !hideTextKinds.includes(r.kind),
  );
  const mineKind =
    Object.keys(reactions).find((k) => reactions[k]?.mine) ?? null;
  const heartOn = mineKind === "heart";
  const mineIsDrawn = !!mineKind && POST_REACTIONS.some((r) => r.kind === mineKind);

  const used = Object.entries(reactions)
    .map(([kind, v]) => ({ kind, count: v?.count ?? 0 }))
    .filter((x) => x.count > 0);
  const total = used.reduce((sum, x) => sum + x.count, 0);
  const top = [...used].sort((a, b) => b.count - a.count);


  const iconSize = size === "md" ? "h-[19px] w-[19px]" : "h-4 w-4";
  const pick = (kind: ReactionKind) => {
    onReact(kind);
    setPicker(false);
  };

  const shown = (actors ?? []).filter((a) => tab === "all" || a.kind === tab);

  return (
    <div ref={wrap} className="relative flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {/* quick heart — filled only when she chose a heart herself */}
      <button
        type="button"
        onClick={() => onReact("heart")}
        aria-label="לב"
        aria-pressed={heartOn}
        title="לב"
        className="rounded-full p-1.5 transition-opacity duration-200 hover:opacity-80"
      >
        <ReactionIcon
          kind="heart"
          filled={heartOn}
          className={`${iconSize} text-primary`}
        />
      </button>

      {/* the picker for every other reaction */}
      <button
        type="button"
        onClick={() => setPicker((p) => !p)}
        aria-label="בחירת תגובה"
        title="בחירת תגובה"
        className={`inline-flex items-center rounded-full p-1.5 transition-colors ${
          picker ? "bg-primary/10 text-primary" : "text-muted-foreground/70 hover:text-primary"
        }`}
      >
        {mineKind && mineKind !== "heart" && !textKinds.includes(mineKind) ? (
          <ReactionIcon kind={mineKind} className={iconSize} />
        ) : (
          <SmilePlus className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        )}
      </button>

      {/*
        expressive text reactions stay visible on desktop; tapping the selected
        one removes it. On phones they live inside the picker, so the row keeps
        just the heart and the picker.
      */}
      {textChoices.map((r) => {
        const on = mineKind === r.kind;
        // "נגעת בי" stays on the phone row as a bare icon; the others are desktop only
        const onPhone = r.kind === "pray";
        return (
          <button
            key={r.kind}
            type="button"
            onClick={() => onReact(r.kind)}
            aria-label={on ? `הסרת ${r.label}` : r.label}
            aria-pressed={on}
            title={on ? `הסרת ${r.label}` : r.label}
            className={`${
              onPhone ? "inline-flex border-transparent px-1.5" : "hidden px-2.5"
            } shrink-0 items-center gap-1 whitespace-nowrap rounded-full border py-1 text-[11.5px] font-light transition-colors duration-200 md:inline-flex md:px-2.5 ${
              on
                ? "md:border-primary/60 text-primary"
                : "text-muted-foreground md:border-foreground/20 hover:border-primary/40 hover:text-primary"
            }`}
          >
            <ReactionIcon
              kind={r.kind}
              className={`${size === "md" ? "h-[17px] w-[17px]" : "h-4 w-4"} transition-all ${
                on ? "opacity-100" : "grayscale opacity-55"
              }`}
            />
            <span className={onPhone ? "hidden md:inline" : undefined}>{r.label}</span>
          </button>
        );
      })}

      {children}

      {/* WhatsApp-style summary — icons, one total, tap for details */}
      {total > 0 && (
        <button
          type="button"
          onClick={() => void openDetails()}
          title="מי הגיבה"
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-light transition-colors ${
            size === "md" ? "text-[11.5px]" : "text-[11px]"
          } ${mineKind ? "border-primary/40 text-primary" : "border-border/70 text-muted-foreground hover:border-foreground/30"}`}
        >
          <span className="flex items-center gap-0.5">
            {top.map((x) => (
              <ReactionIcon key={x.kind} kind={x.kind} className="h-[15px] w-[15px]" />
            ))}
          </span>

          <span className="tabular-nums">{total}</span>
        </button>
      )}

      {picker && (
        <div className="absolute bottom-full start-0 z-30 mb-2 w-[340px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/70 bg-card p-2.5 shadow-[var(--shadow-card)] animate-scale-in motion-reduce:animate-none">
          <div className="grid grid-cols-7 items-stretch gap-1">
            {choices.map((r) => {
              const on = mineKind === r.kind;
              return (
                <button
                  key={r.kind}
                  type="button"
                  onClick={() => pick(r.kind)}
                  aria-label={on ? `הסרת ${r.label}` : r.label}
                  aria-pressed={on}
                  title={on ? `הסרת ${r.label}` : r.label}
                  className={`flex min-h-10 flex-col items-center justify-center rounded-xl px-1 py-1 transition-colors duration-150 hover:bg-muted ${
                    on ? "bg-primary/10 ring-1 ring-primary/40" : ""
                  }`}
                >
                  <ReactionIcon kind={r.kind} className="h-[22px] w-[22px]" />
                </button>
              );
            })}

            {FEATURED_EMOJIS.map((emoji) => {
              const kind = emojiKind(emoji);
              const on = mineKind === kind;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => pick(kind)}
                  aria-label={emoji}
                  aria-pressed={on}
                  className={`grid min-h-10 place-items-center rounded-xl text-[21px] leading-none transition-colors hover:bg-muted ${on ? "bg-primary/10 ring-1 ring-primary/40" : ""}`}
                >
                  {emoji}
                </button>
              );
            })}

            {textChoices.map((r) => {
              const on = mineKind === r.kind;
              return (
                <button
                  key={r.kind}
                  type="button"
                  onClick={() => pick(r.kind)}
                  aria-label={on ? `הסרת ${r.label}` : r.label}
                  aria-pressed={on}
                  title={on ? `הסרת ${r.label}` : r.label}
                  className={`col-span-2 flex min-h-11 items-center justify-center gap-1 rounded-xl bg-muted px-1.5 py-1 transition-all duration-150 ${on ? "ring-1 ring-primary/40" : ""}`}
                >
                  <ReactionIcon kind={r.kind} className="h-[21px] w-[21px]" />
                  <span className="whitespace-nowrap text-[9.5px] font-light text-muted-foreground">{r.label}</span>
                </button>
              );
            })}

            {/* WhatsApp-style: open the full emoji list and react with anything */}
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-label="עוד אימוג׳ים"
              aria-expanded={more}
              title="עוד אימוג׳ים"
              className={`flex min-h-10 items-center justify-center rounded-xl px-1.5 py-1 transition-colors hover:bg-muted ${
                more ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <Plus className="h-[19px] w-[19px]" />
            </button>
          </div>

          {more && (
            <div className="mt-1.5 max-h-[190px] overflow-y-auto border-t border-border/60 pt-1.5">
              <div className="grid grid-cols-8 gap-0.5">
                {COMMUNITY_EMOJIS.map((e) => {
                  const kind = emojiKind(e);
                  const on = mineKind === kind;
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => pick(kind)}
                      aria-label={on ? `הסרת ${e}` : e}
                      aria-pressed={on}
                      className={`rounded-xl py-1.5 text-[17px] leading-none transition-colors hover:bg-primary/[0.08] ${
                        on ? "bg-primary/10 ring-1 ring-primary/40" : ""
                      }`}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}


      <ResponsiveDialog
        open={details}
        onOpenChange={setDetails}
        contentClassName="max-w-[420px]"
      >
        <div dir="rtl" className="flex min-h-0 flex-col">
          <p className="px-5 pb-2 pt-4 text-[14px] text-foreground">תגובות</p>

          <div className="flex gap-1.5 overflow-x-auto border-b border-border/60 px-5 pb-2">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-light transition-colors ${
                tab === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              הכל {total}
            </button>
            {used.map((x) => (
              <button
                key={x.kind}
                type="button"
                onClick={() => setTab(x.kind)}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-light transition-colors ${
                  tab === x.kind ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <ReactionIcon kind={x.kind} className="h-[16px] w-[16px]" />
                <span className="tabular-nums">{x.count}</span>
              </button>
            ))}

          </div>

          <div className="popup-scroll min-h-[120px] px-5 py-3">
            {actors === null ? (
              <span className="flex items-center gap-2 text-[13px] font-light text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                רגע…
              </span>
            ) : shown.length === 0 ? (
              <span className="text-[13px] font-light text-muted-foreground">אין מה להציג כאן.</span>
            ) : (
              <ul className="space-y-3">
                {shown.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="flex items-center gap-2.5">
                    <MemberAvatar
                      name={p.name}
                      seed={p.seed}
                      imageUrl={p.avatar_url ?? null}
                      size="xs"
                      userId={p.profile_id ?? p.user_id}
                      context={{ sourceType: targetType === "comment" ? "comment" : "post", sourceId: targetId, title: "תגובה בליבה" }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-light text-foreground">
                      {p.name}
                    </span>
                    {p.kind && (
                      <span
                        className="flex items-center gap-1 text-[11.5px] font-light text-muted-foreground"
                        title={reactionLabel(p.kind)}
                      >
                        <ReactionIcon kind={p.kind} className="h-[17px] w-[17px]" />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default ReactionsRow;
