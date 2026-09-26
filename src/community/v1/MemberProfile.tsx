/**
 * כרטיס פרופיל של חברה בליבה.
 *
 * Shows only what she chose to share in "תכירו אותי", her heart in Liba and her
 * level. Contact details appear only when she explicitly allowed showing them.
 * A woman who wrote under a nickname has no profile link at all.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Heart, Loader2, Mail, MessageCircle, Send, X } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { MemberAvatar } from "./Avatar";
import { memberProfile, type MemberProfile as Member } from "./api";
import { useLibaChat } from "./LibaMessages";
import type { ThreadSource } from "./messages";

/* ------------------------- opening it from anywhere ------------------------ */

const EVENT = "liba:member-profile";

/**
 * "בקשר למה" — where the conversation is being opened from. It rides along with
 * the first message she sends, and never becomes the title of the whole chat.
 */
export type MemberChatContext = {
  sourceType?: ThreadSource;
  sourceId?: string | null;
  title?: string | null;
  subtitle?: string | null;
  link?: string | null;
};

type OpenDetail = { userId: string; context?: MemberChatContext | null };

/** Opens the card for a member; safe to call from any card or comment. */
export const openMemberProfile = (userId?: string | null, context?: MemberChatContext | null) => {
  if (!userId) return;
  window.dispatchEvent(new CustomEvent<OpenDetail>(EVENT, { detail: { userId, context: context ?? null } }));
};

/** the shared "write to her" button — everywhere an avatar shows up */
const WriteButton = ({
  userId,
  context,
  full = false,
  onDone,
}: {
  userId: string;
  context?: MemberChatContext | null;
  full?: boolean;
  onDone?: () => void;
}) => {
  const { openChat } = useLibaChat();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void openChat({
          userId,
          sourceType: context?.sourceType ?? "direct",
          sourceId: context?.sourceId ?? null,
          contextTitle: context?.title ?? null,
          contextSubtitle: context?.subtitle ?? null,
          contextLink: context?.link ?? null,
        });
        onDone?.();
      }}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 ${
        full ? "w-full px-4 py-2 text-[13.5px] font-light" : "px-3 py-1.5 text-[12px] font-light"
      }`}
    >
      <Send className="h-3.5 w-3.5" />
      לשלוח הודעה
    </button>
  );
};

/* -------------------- hover preview: her card at a glance ------------------- */

const profileCache = new Map<string, Member>();
const profilePending = new Map<string, Promise<Member>>();

const loadProfile = (userId: string): Promise<Member> => {
  const cached = profileCache.get(userId);
  if (cached) return Promise.resolve(cached);
  const pending = profilePending.get(userId);
  if (pending) return pending;
  const req = memberProfile(userId).then((m) => {
    profileCache.set(userId, m);
    profilePending.delete(userId);
    return m;
  });
  profilePending.set(userId, req);
  return req;
};

const HoverPreview = ({ member, context }: { member: Member; context?: MemberChatContext | null }) => {
  const hearts = member.hearts;
  const about = [member.about_area, member.about_work, member.about_loves, member.about_help]
    .filter(Boolean)
    .slice(0, 3) as string[];
  return (
    <div className="space-y-2.5" dir="rtl">
      <div className="flex items-center gap-2.5">
        <MemberAvatar
          name={member.name}
          seed={member.seed ?? member.user_id}
          imageUrl={member.avatar_url}
          size="sm"
          online={member.online}
        />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-foreground">{member.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11.5px] font-light text-muted-foreground">
            <span>{hearts.level?.emoji}</span>
            <span>{hearts.level?.label}</span>
            <span className="text-muted-foreground/50">·</span>
            <Heart className="h-3 w-3 text-primary" />
            <span className="tabular-nums">{hearts.hearts}</span>
          </p>
        </div>
      </div>
      {about.length > 0 && (
        <div className="space-y-1">
          {about.map((line, i) => (
            <p key={i} className="truncate text-[12px] font-light text-foreground/75">
              {line}
            </p>
          ))}
        </div>
      )}
      {member.mastery_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {member.mastery_tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full bg-[hsl(var(--primary)/0.08)] px-2 py-0.5 text-[10.5px] font-light text-foreground/80"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {(member.contact_via_liba || member.contact_whatsapp || member.contact_email) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 pt-2 text-[11.5px] font-light text-muted-foreground">
          <span className="text-muted-foreground/70">אפשר לפנות אליה:</span>
          {member.contact_via_liba && <span>כאן בליבה</span>}
          {member.contact_whatsapp && (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              וואטסאפ
            </span>
          )}
          {member.contact_email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              מייל
            </span>
          )}
        </div>
      )}
      {!member.mine && (
        <div className="border-t border-border/50 pt-2.5">
          <WriteButton userId={member.user_id} context={context} full />
          {context?.title && (
            <p className="mt-1.5 truncate text-[10.5px] font-light text-muted-foreground/70">
              ההודעה תיפתח בקשר ל: {context.title}
            </p>
          )}
        </div>
      )}
      <p className="text-[10.5px] font-light text-muted-foreground/60">לחיצה לפרופיל המלא</p>
    </div>
  );
};

/**
 * Wraps a member's name/avatar: hovering shows her shared details, hearts and
 * level, and how she can be reached. Members under a nickname get no preview.
 */
export const MemberHover = ({
  userId,
  children,
  context,
}: {
  userId?: string | null;
  children: ReactNode;
  context?: MemberChatContext | null;
}) => {
  const [member, setMember] = useState<Member | null>(userId ? profileCache.get(userId) ?? null : null);
  if (!userId) return <>{children}</>;
  return (
    <HoverCard openDelay={350} closeDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-72 rounded-2xl border-border/60 p-3.5 shadow-lg"
        onMouseEnter={() => {
          if (!member) loadProfile(userId).then(setMember).catch(() => undefined);
        }}
      >
        {member ? (
          <HoverPreview member={member} context={context} />
        ) : (
          <HoverLoader userId={userId} onLoaded={setMember} />
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

const HoverLoader = ({ userId, onLoaded }: { userId: string; onLoaded: (m: Member) => void }) => {
  useEffect(() => {
    let alive = true;
    loadProfile(userId)
      .then((m) => alive && onLoaded(m))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId, onLoaded]);
  return (
    <div className="flex justify-center py-3" dir="rtl">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string | null }) =>
  value ? (
    <div>
      <p className="text-[11.5px] tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] font-light leading-relaxed text-foreground/90">
        {value}
      </p>
    </div>
  ) : null;

const Card = ({
  member,
  onClose,
  context,
}: {
  member: Member;
  onClose: () => void;
  context?: MemberChatContext | null;
}) => {
  const hearts = member.hearts;
  const empty =
    !member.about_area &&
    !member.about_work &&
    !member.about_loves &&
    !member.about_help &&
    member.mastery_tags.length === 0 &&
    !member.mastery_note;

  return (
    <div className="w-full max-w-md rounded-3xl bg-card p-10 shadow-xl md:p-12" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <MemberAvatar
            name={member.name}
            seed={member.seed ?? member.user_id}
            imageUrl={member.avatar_url}
            size="lg"
            online={member.online}
          />
          <div>
            <p className="text-[17px] text-foreground">{member.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-light text-muted-foreground">
              <span>{hearts.level?.emoji}</span>
              <span>{hearts.level?.label}</span>
              <span className="text-muted-foreground/50">·</span>
              <Heart className="h-3 w-3 text-primary" />
              <span className="tabular-nums">{hearts.hearts}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {empty ? (
        <p className="mt-5 text-[13px] font-light leading-relaxed text-muted-foreground">
          {member.mine
            ? "עוד לא ספרת עלייך כלום. אפשר למלא את “תכירו אותי” באזור האישי."
            : "היא עוד לא ספרה עליה כאן. אפשר פשוט להגיד לה שלום בשיחה."}
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          <Row label="אזור" value={member.about_area} />
          <Row label="במה אני עוסקת" value={member.about_work} />
          <Row label="מה אני אוהבת" value={member.about_loves} />
          <Row label="במה אפשר להיעזר בי" value={member.about_help} />
          {member.mastery_tags.length > 0 && (
            <div>
              <p className="text-[11.5px] tracking-[0.08em] text-muted-foreground">תחומים</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {member.mastery_tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[hsl(var(--primary)/0.08)] px-2.5 py-1 text-[11.5px] font-light text-foreground/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          <Row label="עוד משהו" value={member.mastery_note} />
        </div>
      )}

      {(member.contact_whatsapp || member.contact_email || member.contact_via_liba) && (
        <div className="mt-5 space-y-2 border-t border-border/60 pt-4">
          <p className="text-[11.5px] tracking-[0.08em] text-muted-foreground">איך לפנות אליי</p>
          {member.contact_via_liba && (
            <p className="text-[13px] font-light text-foreground/80">כאן בליבה, בשיחות</p>
          )}
          {member.contact_whatsapp && (
            <a
              href={`https://wa.me/${member.contact_whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-light text-primary"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              וואטסאפ
            </a>
          )}
          {member.contact_email && (
            <a
              href={`mailto:${member.contact_email}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-light text-primary"
            >
              <Mail className="h-3.5 w-3.5" />
              {member.contact_email}
            </a>
          )}
        </div>
      )}

      {!member.mine && (
        <div className="mt-5">
          <WriteButton userId={member.user_id} context={context} full onDone={onClose} />
          {context?.title && (
            <p className="mt-1.5 text-center text-[11px] font-light text-muted-foreground">
              ההודעה תישלח בקשר ל: {context.title}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/** Mounted once inside Liba; listens for open requests and loads the card. */
export const MemberProfileHost = () => {
  const [id, setId] = useState<string | null>(null);
  const [context, setContext] = useState<MemberChatContext | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setMember(null);
      setError(false);
      const detail = (e as CustomEvent<OpenDetail | string>).detail;
      if (typeof detail === "string") {
        setContext(null);
        setId(detail);
      } else {
        setContext(detail?.context ?? null);
        setId(detail?.userId ?? null);
      }
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    memberProfile(id)
      .then((m) => alive && setMember(m))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id]);

  if (!id) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={() => setId(null)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {member ? (
          <Card member={member} context={context} onClose={() => setId(null)} />
        ) : (
          <div className="rounded-3xl bg-card px-12 py-12 text-center shadow-xl" dir="rtl">
            {error ? (
              <p className="text-[13px] font-light text-muted-foreground">
                לא הצלחנו לפתוח את הפרופיל כרגע.
              </p>
            ) : (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberProfileHost;
