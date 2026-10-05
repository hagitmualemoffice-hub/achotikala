/**
 * ההשתדלות היומית — one boy a day, chosen by the server, offered with warmth.
 * Three moments: the greeting, the card with her five answers, and the goodbye.
 * The card looks exactly like a baar card, recommendations included.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/community/v1/Avatar";
import { useLibaChat } from "@/community/v1/LibaMessages";
import { fetchThreads } from "@/community/v1/messages";
import dailyBaarEntryArt from "@/assets/daily-baar-entry.webp";
import dailyBaarSuccessArt from "@/assets/daily-baar-success.webp";
import {
  ORIENTATION_OPTIONS,
  STATUS_OPTIONS,
  suggestBaarUpdate,
  setBaarProposalContact,
  type BaarBoyProfile,
  type BaarRecommendation,
} from "@/community/v1/baar";
import {
  dailyErrorText,
  fetchDailyState,
  pickDailyBoy,
  respondDaily,
  sendDailyCardChat,
  sendDailyCardEmail,
  type DailyPick,
  type DailyResponse,
} from "@/community/v1/dailyBaar";

const DEFAULT_MESSAGE = "ראיתי אותו וחשבתי עלייך 💗";

/* ------------------------------ little touches ------------------------------ */



const ScreenTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[21px] font-light leading-snug text-foreground md:text-[24px]">{children}</h2>
);

const ScreenHint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[13.5px] font-light leading-relaxed text-muted-foreground">{children}</p>
);

const ChoiceButton = ({
  onClick,
  title,
  note,
  disabled,
}: {
  onClick: () => void;
  title: string;
  note?: string;
  disabled?: boolean;
}) => (
  <Button
    variant="outline"
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="h-auto min-h-[92px] w-full flex-col items-center justify-center gap-1 whitespace-normal rounded-2xl border-primary/20 bg-card px-2 py-3 text-center leading-snug hover:border-primary/50 hover:bg-primary/[0.04] disabled:opacity-50"
  >
    <span>{title}</span>
    {note && <span className="text-[11px] font-light text-muted-foreground">{note}</span>}
  </Button>
);

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[13px] text-foreground">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-primary"
    />
  </label>
);

/* --------------------------------- the card --------------------------------- */

const TagChip = ({ children }: { children: string }) => (
  <span className="rounded-full bg-[hsl(var(--tag-neutral-bg))] px-2.5 py-1 text-[11.5px] font-medium text-[hsl(var(--tag-neutral))]">
    {children}
  </span>
);

const RecommendationLine = ({
  rec,
  boyId,
  boyName,
  onChat,
}: {
  rec: BaarRecommendation;
  boyId: string;
  boyName: string;
  onChat: (userId: string) => void;
}) => (
  <li className="flex items-start gap-3 border-t border-border/50 pt-3 first:border-0 first:pt-0">
    <MemberAvatar
      name={rec.author.name}
      seed={rec.author.seed ?? rec.user_id}
      imageUrl={rec.author.avatar_url ?? null}
      size="sm"
      online={rec.author.online}
      userId={rec.user_id}
      context={{ sourceType: "baar", sourceId: boyId, title: `הבאר · ${boyName}`, subtitle: "המלצה בבאר", link: `/liba/baar?boy=${boyId}` }}
    />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-foreground">{rec.author.name}</span>
        <span className="text-[11.5px] text-muted-foreground">{rec.relationship_type}</span>
      </div>
      {rec.note && <p className="mt-1 text-[13px] font-light leading-relaxed text-foreground/80">{rec.note}</p>}
    </div>
  </li>
);

const DailyBoyCard = ({
  boy,
  onChat,
}: {
  boy: BaarBoyProfile;
  onChat: (userId: string) => void;
}) => (
  <div className="space-y-5" dir="rtl">
    <div className="flex items-center gap-3">
      {boy.photo_url ? (
        <img src={boy.photo_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
      ) : (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/[0.08] text-[17px] font-light text-primary">
          {boy.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("")}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="text-[21px] font-semibold leading-tight text-foreground">{boy.full_name}</h3>
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

    <div className="flex flex-wrap gap-2">
      {[boy.status && STATUS_OPTIONS.find((o) => o.value === boy.status)?.label, boy.orientation, boy.ethnicity]
        .filter(Boolean)
        .map((tag) => (
          <TagChip key={tag as string}>{tag as string}</TagChip>
        ))}
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
        <p className="mt-1 text-[12.5px] font-light text-muted-foreground">עדיין לא נוסף איש קשר להצעה.</p>
      )}
    </div>

    <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
      <p className="mb-3 text-[15px] font-light text-foreground">
        💗 {boy.recommendation_count} נשים בליבה ממליצות עליו
      </p>
      {boy.recommendations.length === 0 ? (
        <p className="text-[13px] font-light text-muted-foreground">עוד אף אחת לא הוסיפה המלצה.</p>
      ) : (
        <ul className="space-y-3">
          {boy.recommendations.map((rec) => (
            <RecommendationLine key={rec.id} rec={rec} boyId={boy.id} boyName={boy.full_name} onChat={onChat} />
          ))}
        </ul>
      )}
    </div>
  </div>
);

/* --------------------------------- the dialog --------------------------------- */

type Phase =
  | "loading"
  | "entry"
  | "card"
  | "maybe"
  | "friend"
  | "info"
  | "done"
  | "empty"
  | "filterEmpty"
  | "unavailable"
  | "paused";

export default function DailyBaarDialog({
  open,
  onOpenChange,
  onAddBoy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** where "הוספת בחור לבאר" leads on the goodbye screen */
  onAddBoy?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [pick, setPick] = useState<DailyPick | null>(null);
  const [working, setWorking] = useState(false);

  /* friend-share state */
  const [friends, setFriends] = useState<{ userId: string; name: string; seed?: string; avatarUrl?: string | null }[]>([]);
  const [friendChannel, setFriendChannel] = useState<"chat" | "email">("chat");
  const [friendId, setFriendId] = useState<string | null>(null);
  const [friendEmail, setFriendEmail] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  /* info / contact forms */
  const [infoText, setInfoText] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });

  const reset = () => {
    setPhase("loading");
    setPick(null);
    setFriendId(null);
    setFriendEmail("");
    setFriendChannel("chat");
    setMessage(DEFAULT_MESSAGE);
    setInfoText("");
    setContact({ name: "", phone: "", email: "" });
  };

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const st = await fetchDailyState();
      if (!st.authorized) {
        onOpenChange(false);
        return;
      }
      if (!st.active) {
        setPhase("paused");
        return;
      }
      if (st.today) {
        if (st.today.unavailable) {
          setPhase("unavailable");
          return;
        }
        if (st.today.boy) {
          setPick({ status: "ok", exposure_id: st.today.exposure_id, boy: st.today.boy });
          setPhase("entry");
          return;
        }
        setPhase("unavailable");
        return;
      }
      setPhase("entry");
    } catch {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    reset();
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openCard = async (ignoreFilter = false) => {
    setWorking(true);
    try {
      const p = await pickDailyBoy(ignoreFilter);
      if (p.status === "ok") {
        setPick(p);
        setPhase("card");
      } else if (p.status === "filter_empty") {
        setPhase("filterEmpty");
      } else if (p.status === "empty") {
        setPhase("empty");
      } else {
        setPhase("unavailable");
      }
    } catch (e: unknown) {
      toast.error(dailyErrorText((e as { message?: string })?.message || ""));
      onOpenChange(false);
    } finally {
      setWorking(false);
    }
  };

  const answer = async (response: DailyResponse, next: Phase) => {
    if (!pick || pick.status !== "ok") return;
    setWorking(true);
    try {
      await respondDaily(pick.exposure_id, response);
      setPhase(next);
    } catch (e: unknown) {
      toast.error(dailyErrorText((e as { message?: string })?.message || ""));
    } finally {
      setWorking(false);
    }
  };

  const { openChat, openExisting } = useLibaChat();

  const chatWith = (userId: string) => {
    if (!pick || pick.status !== "ok") return;
    void openChat({
      userId,
      sourceType: "baar",
      sourceId: pick.boy.id,
      contextTitle: pick.boy.full_name,
      contextSubtitle: "ההשתדלות היומית · כרטיס בבאר",
      contextLink: `/liba/baar?boy=${pick.boy.id}`,
    });
  };

  /* friends she can reach in liba chat today */
  useEffect(() => {
    if (phase !== "friend") return;
    fetchThreads(40)
      .then((res) => {
        const list = res.items
          .filter((t) => t.other?.user_id)
          .flatMap((t) => t.other?.user_id ? [{ userId: t.other.user_id, name: t.other.name, seed: t.other.seed, avatarUrl: t.other.avatar_url }] : []);
        const seen = new Set<string>();
        setFriends(list.filter((f) => (seen.has(f.userId) ? false : (seen.add(f.userId), true))));
      })
      .catch(() => setFriends([]));
  }, [phase]);

  const sendToFriend = async () => {
    if (!pick || pick.status !== "ok") return;
    const text = message.trim() || DEFAULT_MESSAGE;
    setWorking(true);
    try {
      if (friendChannel === "chat") {
        if (!friendId) {
          toast.error("בחרי חברה שאליה יישלח הכרטיס");
          setWorking(false);
          return;
        }
        const res = await sendDailyCardChat(pick.boy.id, friendId, text);
        if (res?.thread_id) openExisting(res.thread_id);
        toast.success("הכרטיס נשלח בצ׳אט 💗");
        setPhase("done");
      } else {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(friendEmail.trim())) {
          toast.error("כתבי כתובת מייל תקינה");
          setWorking(false);
          return;
        }
        await sendDailyCardEmail(pick.boy.id, friendEmail.trim(), text);
        toast.success("המייל יצא לדרך 💗");
        setPhase("done");
      }
    } catch (e: unknown) {
      toast.error(dailyErrorText((e as { message?: string })?.message || ""));
    } finally {
      setWorking(false);
    }
  };

  const sendInfo = async () => {
    if (!pick || pick.status !== "ok") return;
    const hasContactDraft = contact.name.trim() || contact.phone.trim() || contact.email.trim();
    const contactValid = contact.name.trim().length >= 2 && contact.phone.replace(/[^\d]/g, "").length >= 9 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim());
    if (!hasContactDraft && infoText.trim().length < 5) {
      toast.error("כתבי מה יש לך להוסיף, או מלאי איש קשר להצעה");
      return;
    }
    if (hasContactDraft && !contactValid) {
      toast.error("לאיש הקשר צריך למלא שם מלא, טלפון ומייל");
      return;
    }
    setWorking(true);
    try {
      if (contactValid) {
        await setBaarProposalContact(pick.boy.id, contact);
      }
      if (infoText.trim().length >= 5) {
        await suggestBaarUpdate(pick.boy.id, "info", infoText.trim());
      }
      toast.success("הפרטים נשמרו בכרטיס — תודה 💗");
      setPhase("done");
    } catch {
      toast.error("לא הצלחנו לשמור כרגע");
    } finally {
      setWorking(false);
    }
  };

  const boy = pick?.status === "ok" ? pick.boy : null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      desktopContentClassName="max-w-xl"
      mobileContentClassName="h-[92dvh] max-h-[92dvh]"
    >
      <div dir="rtl" className="popup-scroll flex min-h-0 flex-1 flex-col px-6 pb-0 pt-7 md:px-10">
        {phase === "loading" && (
          <div className="grid flex-1 place-items-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {/* 1 — the greeting */}
        {phase === "entry" && (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <img
              src={dailyBaarEntryArt}
              alt=""
              aria-hidden="true"
              width={512}
              height={384}
              className="mb-3 h-32 w-auto object-contain md:h-36"
            />
            <ScreenTitle>ההשתדלות שלך להיום 💗</ScreenTitle>
            <div className="mt-4 max-w-sm space-y-3">
              <ScreenHint>אולי בשבילך. אולי בשביל מישהי שאת מכירה.</ScreenHint>
              <p className="text-[13px] font-light leading-relaxed text-muted-foreground">
                כרטיס אחד, כמה דקות, והזדמנות לעשות היום השתדלות קטנה.
              </p>
            </div>
            <Button
              onClick={() => void openCard()}
              disabled={working}
              className="mt-8 h-12 w-full max-w-xs rounded-full bg-primary text-[15px] text-primary-foreground shadow-md shadow-primary/20 hover:bg-[hsl(var(--primary-glow))]"
            >
              {working && <Loader2 className="h-4 w-4 animate-spin" />}
              בואי נראה מי מחכה לך
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="mt-4 text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
            >
              לא עכשיו? הכרטיס יחכה לך כאן להמשך היום.
            </button>
          </div>
        )}

        {/* 2 — the card and her five answers */}
        {(phase === "card" || phase === "maybe" || phase === "friend" || phase === "info") && (
          <div className="flex min-h-0 flex-1 flex-col">
            {phase === "card" && (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-primary/15 bg-card p-4 shadow-sm pe-1">
                  {boy && <DailyBoyCard boy={boy} onChat={chatWith} />}
                </div>
                <div className="popup-footer mt-4 -mx-6 px-6 pt-3 md:-mx-10 md:px-10">
                  <p className="mb-1 text-[12.5px] font-light text-muted-foreground">על מה את חושבת?</p>
                  <div className="grid grid-cols-4 gap-2">
                    <ChoiceButton
                    onClick={() => void answer("maybe", "maybe")}
                    disabled={working}
                    title="אולי בשבילי 💗"
                  />
                  <ChoiceButton
                    onClick={() => void answer("friend", "friend")}
                    disabled={working}
                    title="חשבתי על חברה שלי"
                  />
                  <ChoiceButton
                    onClick={() => void answer("info", "info")}
                    disabled={working}
                    title="יש לי פרטים להוסיף לכרטיס"
                  />
                  <ChoiceButton
                    onClick={() => void answer("not_now", "done")}
                    disabled={working}
                    title="הפעם לא"
                  />
                  </div>
                  <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-muted-foreground">
                    רוצה לחשוב עוד
                  </Button>
                </div>
              </>
            )}

            {/* אולי בשבילי — straight to the women who recommended him */}
            {phase === "maybe" && boy && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4">
                  <ScreenTitle>אולי שווה לבדוק 💗</ScreenTitle>
                  <div className="mt-2">
                    <ScreenHint>
                      לא צריך לדעת עכשיו. אם נראה לך שיכול להיות כאן משהו, אפשר פשוט לברר קצת יותר.
                    </ScreenHint>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
                    {boy.recommendations.length === 0 ? (
                      <p className="text-[13px] font-light text-muted-foreground">
                        עוד אף אחת לא הוסיפה המלצה עליו. אפשר לפתוח את הכרטיס המלא בבאר.
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {boy.recommendations.map((rec) => (
                          <li key={rec.id} className="flex items-start gap-3">
                            <MemberAvatar
                              name={rec.author.name}
                              seed={rec.author.seed ?? rec.user_id}
                              imageUrl={rec.author.avatar_url ?? null}
                              size="sm"
                              userId={rec.user_id}
                              context={{ sourceType: "baar", sourceId: boy.id, title: `הבאר · ${boy.full_name}`, subtitle: "המלצה בבאר", link: `/liba/baar?boy=${boy.id}` }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13.5px] font-medium text-foreground">{rec.author.name}</p>
                              {rec.note && (
                                <p className="mt-0.5 text-[12.5px] font-light leading-relaxed text-foreground/75">{rec.note}</p>
                              )}
                              {rec.user_id && ["liba", "both"].includes((rec.contact_mode as string) || "liba") && (
                                <button
                                  onClick={() => { if (rec.user_id) chatWith(rec.user_id); }}
                                  className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-primary/30 px-2.5 py-1 text-[11.5px] text-primary transition-colors hover:bg-primary/[0.08]"
                                >
                                  פנייה דרך ליבה
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      to={`/liba/baar?boy=${boy.id}`}
                      onClick={() => onOpenChange(false)}
                      className="mt-4 block text-center text-[12.5px] font-light text-primary hover:opacity-70"
                    >
                      לכרטיס המלא בבאר
                    </Link>
                  </div>
                </div>
                <Button
                  onClick={() => setPhase("done")}
                  className="mt-5 h-12 w-full rounded-full text-[15px]"
                >
                  לבירור על הבחור
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPhase("done")}
                  className="mt-1 w-full text-muted-foreground"
                >
                  לשמור אותו להמשך
                </Button>
              </div>
            )}

            {/* חשבתי על מישהי — chat or email, no boy details ever leave with the email */}
            {phase === "friend" && boy && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4">
                  <ScreenTitle>חשבת על מישהי? 💗</ScreenTitle>
                  <div className="mt-2">
                    <ScreenHint>איזה כיף. אולי הוא בדיוק יכול להתאים לה.</ScreenHint>
                  </div>
                  <p className="mt-3 text-[13.5px] text-foreground">איך תרצי להעביר לה את הכרטיס?</p>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pe-1">
                  <div className="flex gap-2">
                    <ChoiceButton
                      onClick={() => setFriendChannel("chat")}
                      title="לשלוח לה בליבי"
                      note="אפשר גם לצרף כמה מילים משלך"
                    />
                    <ChoiceButton
                      onClick={() => setFriendChannel("email")}
                      title="לשלוח לה במייל"
                      note="היא תקבל הזמנה אישית להיכנס ולראות את הכרטיס"
                    />
                  </div>
                  {friendChannel === "email" && (
                    <p className="text-[11.5px] font-light text-muted-foreground">הפרטים של הבחור לא יופיעו במייל.</p>
                  )}

                  {friendChannel === "chat" ? (
                    <div>
                      <p className="mb-2 text-[13px] text-foreground">למי לשלוח?</p>
                      {friends.length === 0 ? (
                        <p className="text-[12.5px] font-light text-muted-foreground">
                          עוד אין לך שיחות בליבה. אפשר לשלוח במייל, או לפתוח שיחה מהבאר ולחזור לכאן.
                        </p>
                      ) : (
                        <ul className="max-h-52 space-y-1 overflow-y-auto rounded-2xl border border-border/70 p-1.5">
                          {friends.map((f) => (
                            <li key={f.userId}>
                              <button
                                onClick={() => setFriendId(f.userId)}
                                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start transition-colors ${
                                  friendId === f.userId ? "bg-primary/[0.09]" : "hover:bg-muted/50"
                                }`}
                              >
                                <MemberAvatar name={f.name} seed={f.seed} imageUrl={f.avatarUrl ?? null} size="xs" userId={f.userId} />
                                <span className="flex-1 truncate text-[13.5px] text-foreground">{f.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Field
                      label="כתובת המייל של החברה"
                      value={friendEmail}
                      onChange={setFriendEmail}
                      placeholder="friend@email.com"
                      type="email"
                    />
                  )}

                  {friendChannel === "email" && (
                    <div>
                      <p className="text-[13px] text-foreground">רוצה להוסיף לה משהו?</p>
                      <p className="mt-0.5 text-[11.5px] font-light text-muted-foreground">
                        ההודעה תישלח מליבי, בלי לחשוף את הפרטים שלך.
                      </p>
                    </div>
                  )}
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] text-foreground">ההודעה שתישלח</span>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[14px] font-light leading-relaxed outline-none focus:border-primary"
                    />
                  </label>
                </div>

                <div className="popup-footer -mx-6 mt-4 flex gap-2 px-6 pt-4 md:-mx-10 md:px-10">
                  <Button variant="ghost" onClick={() => setPhase("card")} className="rounded-full">
                    חזרה
                  </Button>
                  <Button
                    onClick={() => void sendToFriend()}
                    disabled={working || (friendChannel === "chat" ? !friendId : !friendEmail.trim())}
                    className="ms-auto h-12 flex-1 rounded-full bg-primary text-[15px] text-primary-foreground shadow-md shadow-primary/20 hover:bg-[hsl(var(--primary-glow))]"
                  >
                    {working && <Loader2 className="h-4 w-4 animate-spin" />}
                    שליחה
                  </Button>
                </div>
              </div>
            )}

            {/* פרטים להוספה לכרטיס — איש הקשר להצעה הוא הפרט המרכזי */}
            {phase === "info" && boy && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4">
                  <p className="text-[11px] text-primary">יש לי פרטים להוסיף לכרטיס</p>
                  <ScreenTitle>מה תרצי להוסיף? 💗</ScreenTitle>
                  <div className="mt-2">
                    <ScreenHint>הפרט החשוב ביותר הוא איש קשר שיכול לקבל פנייה ולהעביר לבחור את ההצעה.</ScreenHint>
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pe-1">
                  <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
                    <p className="mb-3 text-[13px] font-medium text-foreground">איש קשר להצעת ההצעה</p>
                    <div className="space-y-3">
                      <Field label="שם מלא" value={contact.name} onChange={(v) => setContact((c) => ({ ...c, name: v }))} placeholder="שם איש/אשת הקשר" />
                      <Field label="טלפון" value={contact.phone} onChange={(v) => setContact((c) => ({ ...c, phone: v }))} placeholder="05X-XXXXXXX" type="tel" />
                      <Field label="מייל" value={contact.email} onChange={(v) => setContact((c) => ({ ...c, email: v }))} placeholder="name@email.com" type="email" />
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] text-foreground">פרטים נוספים על הבחור</span>
                    <textarea rows={4} value={infoText} onChange={(e) => setInfoText(e.target.value)} placeholder="מידע נוסף שחשוב לעדכן בכרטיס" className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-primary" />
                  </label>
                </div>
                <div className="popup-footer -mx-6 mt-4 flex gap-2 px-6 pt-4 md:-mx-10 md:px-10">
                  <Button variant="ghost" onClick={() => setPhase("card")} className="rounded-full">
                    חזרה
                  </Button>
                  <Button
                    onClick={() => void sendInfo()}
                    disabled={working}
                    className="ms-auto h-12 flex-1 rounded-full bg-primary text-[15px] text-primary-foreground shadow-md shadow-primary/20 hover:bg-[hsl(var(--primary-glow))]"
                  >
                    {working && <Loader2 className="h-4 w-4 animate-spin" />}
                    שמירה
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 3 — the goodbye */}
        {(phase === "done" || phase === "empty" || phase === "filterEmpty" || phase === "unavailable" || phase === "paused") && (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            {phase === "done" && (
              <>
                <img
                  src={dailyBaarSuccessArt}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  width={512}
                  height={384}
                  className="mb-3 h-28 w-auto object-contain md:h-32"
                />
                <ScreenTitle>מדהימה 💗</ScreenTitle>
                <div className="mt-3 max-w-sm">
                  <ScreenHint>עשית את ההשתדלות שלך להיום</ScreenHint>
                </div>
                <p className="mt-7 text-[13.5px] text-foreground">מכאן, לא הכול בידיים שלנו.<br />רוצה לעזור בעוד דרך?</p>
                <p className="mt-1 max-w-xs text-[12.5px] font-light leading-relaxed text-muted-foreground">
                  כל בחור שמוסיפים לבאר יכול להיות משמעותי מאוד למישהי אחרת.
                </p>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    (onAddBoy ?? (() => window.location.assign("/liba/baar?add=1")))();
                  }}
                  className="mt-4 h-12 w-full max-w-xs rounded-full text-[15px]"
                >
                  הוספת בחור לבאר
                </Button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="mt-4 text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
                >
                  סיום
                </button>
              </>
            )}
            {phase === "empty" && (
              <>
                <ScreenTitle>אין היום כרטיס חדש 💗</ScreenTitle>
                <div className="mt-3 max-w-sm">
                  <ScreenHint>כבר הכרנו את כל מי שיש כרגע בבאר. בקרוב יגיעו חדשים — נתראה אז.</ScreenHint>
                </div>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-7 rounded-full px-8">
                  סגירה
                </Button>
              </>
            )}
            {phase === "filterEmpty" && (
              <>
                <ScreenTitle>אין כרטיס שמתאים למסנן שלך</ScreenTitle>
                <div className="mt-3 max-w-sm">
                  <ScreenHint>אפשר להציג גם בחור מחוץ למסנן שבחרת בהגדרות — או לחכות לפעם הבאה.</ScreenHint>
                </div>
                <Button onClick={() => void openCard(true)} disabled={working} className="mt-7 rounded-full px-8">
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  להציג גם מחוץ למסנן
                </Button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="mt-4 text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
                >
                   אולי בפעם הבאה
                </button>
              </>
            )}
            {phase === "unavailable" && (
              <>
                <ScreenTitle>הכרטיס של היום כבר לא זמין</ScreenTitle>
                <div className="mt-3 max-w-sm">
                  <ScreenHint>נראה שהכרטיס הזה ירד מהבאר. בפעם הבאה יחכה לך כרטיס חדש 💗</ScreenHint>
                </div>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-7 rounded-full px-8">
                  סגירה
                </Button>
              </>
            )}
            {phase === "paused" && (
              <>
                <ScreenTitle>ההשתדלות היומית מושהית</ScreenTitle>
                <div className="mt-3 max-w-sm">
                  <ScreenHint>אפשר להפעיל אותה מחדש בהגדרות החשבון, מתי שתרצי.</ScreenHint>
                </div>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-7 rounded-full px-8">
                  סגירה
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
