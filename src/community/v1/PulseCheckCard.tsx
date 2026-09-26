import { useEffect, useMemo, useState } from "react";
import { Activity, Check, Loader2, Lock, MoreHorizontal, RotateCcw, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import {
  removePulseResponse,
  respondPulse,
  setPulseState,
  toggleReaction,
  votePulse,
  type PulseCheck,
  type ReactionKind,
} from "@/community/v1/api";
import { MemberAvatar } from "@/community/v1/Avatar";
import ReactionsRow from "@/community/v1/ReactionsRow";
import { spaceById, accentBg, accentColor } from "@/community/v1/spaces";

const AXIS = [0, 25, 50, 75, 100];

/**
 * "בדיקת דופק" — a wide, quiet stop where the community sees where it is.
 * Results open only after she shared her own answer, drawn as one chart with
 * percentage axes so it is immediately clear where most hearts are.
 * Nothing about who voted for what ever reaches this component.
 */
export default function PulseCheckCard({
  pulse,
  onChange,
  onEdit,
}: {
  pulse: PulseCheck;
  onChange: (next: PulseCheck) => void;
  onEdit?: (p: PulseCheck) => void;
}) {
  const space = spaceById(pulse.space);
  const [picked, setPicked] = useState<string[]>(pulse.my_options);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [note, setNote] = useState(pulse.my_response ?? "");
  const [savingNote, setSavingNote] = useState(false);
  /** she decides, every time, whether her name comes along */
  const [shareAnon, setShareAnon] = useState(
    pulse.my_response_anonymous ?? pulse.followup_anonymous ?? true,
  );
  const [menu, setMenu] = useState(false);
  const [reveal, setReveal] = useState(pulse.results_visible);
  /** she asked to change her mind: go back to the choosing state */
  const [editingVote, setEditingVote] = useState(false);

  useEffect(() => {
    setPicked(pulse.my_options);
    setNote(pulse.my_response ?? "");
    if (pulse.my_response) setShareAnon(pulse.my_response_anonymous ?? true);
  }, [pulse.my_options, pulse.my_response]);

  useEffect(() => {
    if (pulse.results_visible) {
      const t = window.setTimeout(() => setReveal(true), 80);
      return () => window.clearTimeout(t);
    }
    setReveal(false);
  }, [pulse.results_visible]);

  const topVotes = useMemo(
    () => Math.max(0, ...pulse.options.map((o) => o.votes ?? 0)),
    [pulse.options],
  );

  const choosing = (!pulse.voted || editingVote) && pulse.is_open;

  const toggle = (id: string) => {
    if (!choosing) return;
    setPicked((cur) =>
      pulse.multi
        ? cur.includes(id)
          ? cur.filter((x) => x !== id)
          : [...cur, id]
        : cur.includes(id)
          ? [] // one tap again = unpick
          : [id],
    );
  };

  const submit = async () => {
    if (picked.length === 0) return;
    setSending(true);
    try {
      const next = await votePulse(pulse.id, picked);
      setEditingVote(false);
      setThanks(true);
      onChange(next);
      window.setTimeout(() => setThanks(false), 5000);
    } catch {
      toast.error("ההצבעה לא נשמרה. אפשר לנסות שוב");
    } finally {
      setSending(false);
    }
  };

  /** withdraw completely — her choice and her written words both leave */
  const clearVote = async () => {
    setClearing(true);
    try {
      const next = await votePulse(pulse.id, []);
      setEditingVote(false);
      setThanks(false);
      onChange(next);
      toast.success("הבחירה שלך בוטלה");
    } catch {
      toast.error("הביטול לא הושלם. אפשר לנסות שוב");
    } finally {
      setClearing(false);
    }
  };

  const saveNote = async () => {
    if (note.trim().length < 2) return;
    setSavingNote(true);
    try {
      onChange(await respondPulse(pulse.id, note.trim(), shareAnon));
      toast.success("תודה ששיתפת במילים שלך");
    } catch {
      toast.error("השיתוף לא נשמר. אפשר לנסות שוב");
    } finally {
      setSavingNote(false);
    }
  };

  /** one reaction per woman, on any shared answer */
  const react = async (responseId: string, kind: ReactionKind) => {
    try {
      const map = await toggleReaction("pulse_response", responseId, kind);
      onChange({
        ...pulse,
        responses: pulse.responses.map((r) =>
          r.id === responseId ? { ...r, reactions: map ?? {} } : r,
        ),
      });
    } catch {
      toast.error("התגובה לא נשמרה");
    }
  };

  const adminAction = async (patch: Parameters<typeof setPulseState>[1]) => {
    setMenu(false);
    try {
      onChange(await setPulseState(pulse.id, patch));
    } catch {
      toast.error("הפעולה לא הושלמה");
    }
  };

  return (
    <article
      dir="rtl"
      className="relative mb-6 overflow-hidden rounded-[34px] border border-primary/20 bg-gradient-to-b from-primary/[0.05] via-card to-card"
      style={{ boxShadow: "0 26px 60px -40px hsl(var(--primary) / 0.55)" }}
    >
      {/* concept chrome: pink pulse ribbon + a soft glow behind the question */}
      <div className="h-[4px] w-full bg-gradient-to-l from-primary via-primary/40 to-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 start-1/2 h-56 w-[420px] -translate-x-1/2 rounded-full bg-primary/[0.13] blur-3xl"
      />

      <div className="relative px-6 py-8 sm:px-10 sm:py-11">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11.5px] tracking-[0.22em] text-primary">
              <span className="relative flex h-6 w-6 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
                <Activity className="relative h-4 w-4" />
              </span>
              בדיקת דופק
              {!pulse.is_open && (
                <span className="text-[10.5px] tracking-normal text-muted-foreground">
                  ההצבעה נסגרה
                </span>
              )}
            </p>

            <h2 className="mt-4 max-w-2xl text-[25px] font-light leading-[1.25] text-foreground sm:text-[32px]">
              {pulse.title}
            </h2>
            {pulse.intro && (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-[14.5px] font-light leading-relaxed text-muted-foreground">
                {pulse.intro}
              </p>
            )}
          </div>

          {pulse.can_moderate && (
            <div className="relative shrink-0">
              <button
                onClick={() => setMenu((m) => !m)}
                aria-label="ניהול בדיקת הדופק"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menu && (
                <div className="absolute end-0 top-10 z-20 w-52 overflow-hidden rounded-2xl border border-border/70 bg-card py-1 text-[13px] shadow-[var(--shadow-card)]">
                  {onEdit && (
                    <button
                      onClick={() => {
                        setMenu(false);
                        onEdit(pulse);
                      }}
                      className="block w-full px-4 py-2 text-start font-light hover:bg-muted"
                    >
                      עריכה
                    </button>
                  )}
                  <button
                    onClick={() => adminAction({ pinned: !pulse.pinned })}
                    className="block w-full px-4 py-2 text-start font-light hover:bg-muted"
                  >
                    {pulse.pinned ? "ביטול נעיצה" : "נעיצה למעלה"}
                  </button>
                  <button
                    onClick={() => adminAction({ featured: !pulse.featured })}
                    className="block w-full px-4 py-2 text-start font-light hover:bg-muted"
                  >
                    {pulse.featured ? 'הסרה מ״הכול״' : 'הצגה ב״הכול״'}
                  </button>
                  <button
                    onClick={() => adminAction({ status: pulse.status === "open" ? "closed" : "open" })}
                    className="block w-full px-4 py-2 text-start font-light hover:bg-muted"
                  >
                    {pulse.status === "open" ? "סגירת ההצבעה" : "פתיחת ההצבעה"}
                  </button>
                  <button
                    onClick={() => adminAction({ status: "archived" })}
                    className="block w-full px-4 py-2 text-start font-light text-muted-foreground hover:bg-muted"
                  >
                    העברה לארכיון
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {pulse.anonymous && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3.5 py-1.5 text-[11.5px] font-light text-muted-foreground">
              <Lock className="h-3 w-3" /> ההצבעה אנונימית
            </span>
          )}
          {pulse.multi && (
            <span className="rounded-full bg-muted/70 px-3.5 py-1.5 text-[11.5px] font-light text-muted-foreground">
              אפשר לבחור יותר מאפשרות אחת
            </span>
          )}
          {choosing && (
            <span className="rounded-full bg-muted/70 px-3.5 py-1.5 text-[11.5px] font-light text-muted-foreground">
              לחיצה נוספת מבטלת את הבחירה
            </span>
          )}
        </div>

        {/* --------------------------- choosing state --------------------------- */}
        {choosing ? (
          <div className="mt-7 rounded-3xl border border-border/60 bg-background/60 px-5 py-6 sm:px-7">
            <div className="relative">
              {/* axis only — bars stay empty until she votes */}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-0">
                {AXIS.map((a) => (
                  <span
                    key={a}
                    className="absolute top-0 bottom-0 border-e border-dashed border-border/50"
                    style={{ right: `${a}%` }}
                  />
                ))}
              </div>

              <ul className="relative space-y-5">
                {pulse.options.map((o) => {
                  const chosen = picked.includes(o.id);
                  return (
                    <li key={o.id}>
                      <button
                        onClick={() => toggle(o.id)}
                        aria-pressed={chosen}
                        className="group w-full text-start"
                      >
                        <div
                          className={`rounded-xl px-3 py-2 transition-colors ${
                            chosen
                              ? "bg-primary/[0.06]"
                              : "group-hover:bg-muted/40"
                          }`}
                        >
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-[14.5px] text-foreground">
                              <span className="font-semibold">{o.label}</span>
                              {o.note && (
                                <span className="text-[12.5px] font-normal text-muted-foreground">
                                  {o.note}
                                </span>
                              )}
                            </span>
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                chosen
                                  ? "border-primary bg-primary"
                                  : "border-border group-hover:border-primary/50"
                              }`}
                            >
                              {chosen && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </span>
                          </span>
                          <div className="mt-2 h-3.5 w-full overflow-hidden rounded-full bg-muted/70" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : (
          /* ----------------------------- results chart ----------------------- */
          <div className="mt-7">
            {reveal ? (
              <div className="relative rounded-3xl border border-border/60 bg-background/60 px-5 py-6 sm:px-7">
                {/* quiet gridlines — the numbers themselves tell the story */}
                <div aria-hidden className="pointer-events-none absolute inset-x-5 bottom-6 top-6 sm:inset-x-7">
                  {AXIS.map((a) => (
                    <span
                      key={a}
                      className="absolute top-0 bottom-0 border-e border-dashed border-border/50"
                      style={{ right: `${a}%` }}
                    />
                  ))}
                </div>

                <ul className="relative space-y-4">
                  {pulse.options.map((o) => {
                    const votes = o.votes ?? 0;
                    const share = topVotes > 0 ? Math.round((votes / topVotes) * 100) : 0;
                    const mine = pulse.my_options.includes(o.id);
                    const top = votes > 0 && votes === topVotes;
                    return (
                      <li key={o.id}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-[14.5px] text-foreground">
                            <span className="font-semibold">{o.label}</span>
                            {o.note && (
                              <span className="text-[12.5px] font-normal text-muted-foreground">
                                {o.note}
                              </span>
                            )}
                            {mine && (
                              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] text-primary">
                                הבחירה שלי
                              </span>
                            )}
                            {top && (
                              <span className="text-[10.5px] font-light text-muted-foreground">
                                הכי הרבה
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-[13px] font-light text-primary">
                            {votes}
                            <span className="ms-1.5 text-muted-foreground">
                              {votes === 1 ? "בחרה" : "בחרו"}
                            </span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-3.5 w-full overflow-hidden rounded-full bg-muted/70">
                          <div
                            className={`h-full rounded-full transition-[width] duration-[900ms] ease-out ${
                              top
                                ? "bg-gradient-to-l from-primary to-[hsl(var(--primary-glow))]"
                                : mine
                                  ? "bg-primary/60"
                                  : "bg-primary/30"
                            }`}
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <p className="mt-5 text-[12px] font-light text-muted-foreground">
                  {pulse.total_voters === 1 ? "אחת שיתפה" : `${pulse.total_voters} נשים שיתפו`}
                </p>
              </div>
            ) : (
              <p className="rounded-3xl border border-dashed border-border/70 px-5 py-6 text-[13.5px] font-light text-muted-foreground">
                התוצאות נפתחות אחרי שגם את משתפת.
              </p>
            )}
          </div>
        )}

        {/* ------------------------------ actions ----------------------------- */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {choosing && (
            <button
              onClick={submit}
              disabled={picked.length === 0 || sending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-[14px] text-primary-foreground transition-all hover:bg-[hsl(var(--primary-glow))] disabled:opacity-40"
            >
              {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pulse.voted ? "עדכון הבחירה שלי" : "שיתוף התחושה שלי"}
            </button>
          )}

          {pulse.voted && pulse.is_open && !editingVote && (
            <button
              onClick={() => setEditingVote(true)}
              className="rounded-full border border-border px-5 py-2.5 text-[13px] font-light text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
            >
              שינוי הבחירה
            </button>
          )}

          {pulse.voted && pulse.is_open && (
            <button
              onClick={clearVote}
              disabled={clearing}
              className="inline-flex items-center gap-1.5 text-[13px] font-light text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              {clearing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              ביטול הבחירה שלי
            </button>
          )}

          {editingVote && (
            <button
              onClick={() => {
                setEditingVote(false);
                setPicked(pulse.my_options);
              }}
              className="text-[13px] font-light text-muted-foreground transition-colors hover:text-foreground"
            >
              חזרה לתוצאות
            </button>
          )}
        </div>

        {thanks && (
          <p className="mt-5 whitespace-pre-line rounded-3xl bg-primary/[0.07] px-5 py-4 text-[14px] font-light leading-relaxed text-foreground/85">
            {"תודה ששיתפת.\nעכשיו אפשר לראות מה שלום הלב של כולנו."}
          </p>
        )}

        {/* ------------------------ words of her own --------------------------- */}
        {pulse.voted && !editingVote && pulse.followup_question && (
          <div className="mt-8 border-t border-border/60 pt-6">
            <p className="text-[15px] font-normal text-foreground">{pulse.followup_question}</p>
            <p className="mt-1 text-[11.5px] font-light text-muted-foreground">
              את בוחרת אם לשתף בשם שלך או בעילום שם
            </p>
            {pulse.is_open && (
              <>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={pulse.followup_placeholder ?? "במילים שלי..."}
                  className="mt-3 w-full resize-none rounded-3xl border border-border bg-background px-5 py-4 text-[14px] font-light leading-relaxed outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[
                    { anon: false, label: "בשם שלי", icon: <User className="h-3.5 w-3.5" /> },
                    { anon: true, label: "בעילום שם", icon: <Lock className="h-3 w-3" /> },
                  ].map((o) => (
                    <button
                      key={String(o.anon)}
                      type="button"
                      onClick={() => setShareAnon(o.anon)}
                      aria-pressed={shareAnon === o.anon}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                        shareAnon === o.anon
                          ? "border-primary/50 bg-primary/[0.08] text-primary"
                          : "border-border/70 font-light text-muted-foreground hover:border-primary/35"
                      }`}
                    >
                      {o.icon}
                      {o.label}
                    </button>
                  ))}
                  <button
                    onClick={saveNote}
                    disabled={note.trim().length < 2 || savingNote}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-5 py-2 text-[13px] font-light text-primary transition-colors hover:bg-primary/[0.06] disabled:opacity-40"
                  >
                    {savingNote && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {pulse.my_response ? "עדכון מה שכתבתי" : "שיתוף"}
                  </button>
                </div>
              </>
            )}

            {pulse.responses.length > 0 && (
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {pulse.responses.map((r) => (
                  <li
                    key={r.id}
                    className="group relative rounded-3xl bg-muted/50 px-5 py-4 text-[14px] font-light leading-relaxed text-foreground/85"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {r.author ? (
                        <>
                          <MemberAvatar
                            name={r.author.name}
                            seed={r.author.seed}
                            imageUrl={r.author.avatar_url}
                            nickname={r.author.nickname}
                            online={r.author.online}
                            size="sm"
                            userId={r.author.profile_id}
                            context={{ sourceType: "direct", title: pulse.title, subtitle: r.body.slice(0, 60) }}
                          />
                          <span className="text-[13px] text-foreground">{r.author.name}</span>
                        </>
                      ) : (
                        <>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-[13px] font-light text-muted-foreground">
                            שיתוף בעילום שם
                          </span>
                        </>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{r.body}</p>
                    <div className="mt-2">
                      <ReactionsRow
                        targetType="pulse_response"
                        targetId={r.id}
                        reactions={r.reactions}
                        size="sm"
                        onReact={(kind) => void react(r.id, kind)}
                      />
                    </div>
                    {pulse.can_moderate && (
                      <button
                        onClick={async () => {
                          try {
                            await removePulseResponse(r.id);
                            onChange({
                              ...pulse,
                              responses: pulse.responses.filter((x) => x.id !== r.id),
                            });
                          } catch {
                            toast.error("ההסרה לא הושלמה");
                          }
                        }}
                        aria-label="הסרת התשובה"
                        className="absolute end-2.5 top-2.5 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-card group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

          </div>
        )}
      </div>
    </article>
  );
}
