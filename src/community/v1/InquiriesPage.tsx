import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleHelp,
  Clock3,
  Filter,
  Hand,
  Grid2X2,
  HandHeart,
  List,
  Loader2,
  Mail,
  MessageSquareQuote,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useLibaChat } from "@/community/v1/LibaMessages";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MemberAvatar, AvatarStack } from "./Avatar";
import type { CommunityProfile } from "./api";
import {
  adminInquiryAction,
  cancelInquiryHelp,
  createInquiry,
  fetchInquiries,
  fetchInquiryThreads,
  offerInquiryHelp,
  notifyInquiry,
  setInquiryStatus,
  thankInquiryOffer,
  updateInquiry,
  type Inquiry,
  type InquiryBackground,
  type InquiryThread,
  type InquiryView,
  type NewInquiry,
} from "./inquiries";

const VIEW_KEY = "achotikala.inquiries.view";
const FILTER_KEY = "achotikala.inquiries.background";
const INFO = [["all_info", "כל פרט יעזור"], ["quality_info", "מידע איכותי"], ["photo", "תמונה"]] as const;
const CONNECTIONS = [
  ["personal", "מכירה אישית"], ["family", "מכירה את המשפחה"], ["heard", "שמעתי / יש לי מידע"],
  ["can_check", "יכולה לברר"], ["photo", "יש לי תמונה"],
] as const;
const LEGACY_INFO_LABELS: Record<string, string> = {
  character: "אופי ומידות",
  family: "משפחה",
  religious: "עולם רוחני",
  health: "בריאות",
  work: "עבודה ופרנסה",
  friends: "חברים וסביבה",
  other: "מידע נוסף",
};
const infoLabel = (key: string) => INFO.find(([id]) => id === key)?.[1] ?? LEGACY_INFO_LABELS[key] ?? "מידע נוסף";
const infoChipClass = (key: string) => {
  if (["all_info", "character", "religious"].includes(key)) return "bg-[hsl(var(--chip-info-bg))] text-[hsl(var(--chip-info))]";
  if (["quality_info", "family", "friends"].includes(key)) return "bg-[hsl(var(--chip-quality-bg))] text-[hsl(var(--chip-quality))]";
  return "bg-[hsl(var(--chip-photo-bg))] text-[hsl(var(--chip-photo))]";
};
const connectionLabel = (key: string) => CONNECTIONS.find(([id]) => id === key)?.[1] ?? key;
const backgroundLabel = (value: InquiryBackground) => value === "ashkenazi" ? "אשכנזי" : "ספרדי";
const inquirySchema = z.object({
  boy_name: z.string().trim().min(2, "צריך למלא שם מלא").max(100),
  background: z.enum(["ashkenazi", "sephardi"]),
  details: z.string().trim().max(1500),
  info_types: z.array(z.enum(["all_info", "quality_info", "photo"])).min(1, "צריך לבחור איזה מידע תרצי לקבל"),
  as_nickname: z.boolean(),
  author_full_name: z.string().trim().max(100),
}).refine((d) => d.as_nickname || d.author_full_name.trim().length >= 2, { message: "צריך למלא את השם המלא שלך (פרטי + משפחה)" });
const timeAgo = (value: string) => {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `לפני ${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "לפני שעה" : `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "אתמול" : `לפני ${days} ימים`;
};

const Choice = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <Button type="button" variant="outline" size="sm" onClick={onClick} aria-pressed={selected} className={`rounded-full px-3.5 text-[12.5px] font-light ${selected ? "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" : "text-muted-foreground"}`}>{children}</Button>
);

const SegmentedFilter = <T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) => (
  <div className="flex h-9 shrink-0 items-center rounded-full border border-border bg-muted/50 p-0.5">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`flex h-full items-center justify-center px-3.5 text-[12.5px] font-light transition-all ${value === opt.value ? "rounded-full bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const CreateDialog = ({ open, onOpenChange, profile, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; profile: CommunityProfile | null; editing: Inquiry | null; onSaved: () => void }) => {
  const emptyDraft: NewInquiry = { boy_name: "", background: "ashkenazi", details: "", info_types: [], as_nickname: false, author_full_name: "" };
  const [draft, setDraft] = useState<NewInquiry>(emptyDraft);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setDraft(editing ? { boy_name: editing.boy_name, background: editing.background, details: editing.details ?? "", info_types: editing.info_types.filter((item) => INFO.some(([id]) => id === item)), as_nickname: editing.author.nickname, author_full_name: editing.author_full_name ?? "" } : { ...emptyDraft, author_full_name: profile?.display_name ?? "" });
  }, [open, editing, profile]);
  const set = <K extends keyof NewInquiry>(key: K, value: NewInquiry[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const validation = inquirySchema.safeParse(draft);
  const submit = async () => {
    if (!validation.success) return toast.error(validation.error.issues[0]?.message ?? "צריך להשלים את הפרטים");
    setSaving(true);
    try {
      const payload: NewInquiry = {
        boy_name: draft.boy_name.trim(),
        background: draft.background,
        details: draft.details.trim(),
        info_types: [...draft.info_types],
        as_nickname: draft.as_nickname,
        author_full_name: draft.author_full_name.trim(),
      };
      if (editing) {
        await updateInquiry(editing.id, payload);
        toast.success("הבירור עודכן");
      } else {
        const id = await createInquiry(payload);
        void notifyInquiry("created", id).catch(() => undefined);
        toast.success("הבירור פורסם בליבה");
      }
      setDraft(emptyDraft);
      onOpenChange(false); onSaved();
    } catch { toast.error(editing ? "לא הצלחנו לעדכן את הבירור" : "לא הצלחנו לפרסם את הבירור"); } finally { setSaving(false); }
  };
  return <ResponsiveDialog open={open} onOpenChange={onOpenChange} desktopContentClassName="max-w-xl">
    <div dir="rtl" className="overflow-y-auto px-8 pb-10 pt-6 md:px-12 md:pt-10">
       <div className="mb-6"><p className="text-[11px] text-primary">{editing ? "עריכת בירור" : "פתיחת בירור"}</p><h2 className="mt-1 text-[22px] font-light text-foreground">את מי תרצי לברר?</h2></div>
      <div className="space-y-5">
        <label className="block"><span className="mb-1.5 block text-[13px] text-foreground">שם מלא *</span><input autoFocus value={draft.boy_name} maxLength={100} onChange={(e) => set("boy_name", e.target.value)} placeholder="שם הבחור" className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary" /></label>
         <div><span className="mb-2 block text-[13px] text-foreground">אשכנזי או ספרדי *</span><div className="flex gap-2"><Choice selected={draft.background === "ashkenazi"} onClick={() => set("background", "ashkenazi")}>אשכנזי</Choice><Choice selected={draft.background === "sephardi"} onClick={() => set("background", "sephardi")}>ספרדי</Choice></div></div>
         <label className="block"><span className="mb-1.5 block text-[13px] text-foreground">מעט פרטים שנדע לזהות אותו <span className="text-muted-foreground">(לא חובה)</span></span><textarea rows={4} value={draft.details} maxLength={1500} onChange={(e) => set("details", e.target.value)} placeholder="למשל: גיל, ישיבה, סטטוס זוגי, עיר ופרטים מזהים נוספים" className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[13.5px] leading-relaxed outline-none focus:border-primary" /></label>
         <div><span className="mb-2 block text-[13px] text-foreground">איזה פרטים תרצי לקבל? *</span><div className="flex flex-wrap gap-2">{INFO.map(([id, label]) => <Choice key={id} selected={draft.info_types.includes(id)} onClick={() => set("info_types", draft.info_types.includes(id) ? draft.info_types.filter((x) => x !== id) : [...draft.info_types, id])}>{label}</Choice>)}</div></div>
         <div><span className="mb-2 block text-[13px] text-foreground">איך הבקשה תופיע?</span><div className="grid grid-cols-2 gap-2"><Choice selected={!draft.as_nickname} onClick={() => set("as_nickname", false)}>בשם {profile?.display_name ?? "שלך"}</Choice><Choice selected={draft.as_nickname} onClick={() => set("as_nickname", true)}>אנונימי</Choice></div></div>
         {!draft.as_nickname && <label className="block"><span className="mb-1.5 block text-[13px] text-foreground">השם המלא שלך (פרטי + משפחה) *</span><input value={draft.author_full_name} maxLength={100} onChange={(e) => set("author_full_name", e.target.value)} placeholder="למשל: חגית מועלם" className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary" /><span className="mt-1 block text-[11px] text-muted-foreground">השם יוצג על הכרטיס כדי שמי שעונה תדע מי שאלה</span></label>}
         <div className="rounded-2xl bg-accent/55 p-4 text-center"><p className="text-[10.5px] text-accent-foreground/70">כך הכרטיס ייראה</p><p className="mt-2 text-[20px] font-semibold text-foreground">{draft.boy_name || "שם הבחור"}</p>{draft.details.trim() && <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">{draft.details}</p>}</div>
      </div>
       <div className="mt-7 flex justify-between"><Button variant="ghost" onClick={() => onOpenChange(false)}>ביטול</Button><Button onClick={submit} disabled={!validation.success || saving} className="rounded-full px-6">{saving && <Loader2 className="animate-spin" />}{editing ? "שמירת השינויים" : "פרסום הבירור"}</Button></div>
    </div>
  </ResponsiveDialog>;
};

export const HelpDialog = ({ inquiry, open, onOpenChange, onChanged }: { inquiry: Inquiry | null; open: boolean; onOpenChange: (v: boolean) => void; onChanged: (q: Inquiry) => void }) => {
  const [connection, setConnection] = useState("personal"); const [mode, setMode] = useState<"share_details" | "liba">("liba"); const [visible, setVisible] = useState(true); const [saving, setSaving] = useState(false);
  useEffect(() => { if (inquiry?.my_offer) { setConnection(inquiry.my_offer.connection_type); setMode(inquiry.my_offer.contact_mode); setVisible(inquiry.my_offer.visible); } }, [inquiry]);
  if (!inquiry) return null;
  const submit = async () => { setSaving(true); try { const q = await offerInquiryHelp(inquiry.id, connection, mode, visible); onChanged(q); void notifyInquiry("offered", inquiry.id).catch(() => undefined); onOpenChange(false); toast.success("העזרה שלך נשלחה"); } catch { toast.error("לא הצלחנו לשמור את ההצעה"); } finally { setSaving(false); } };
  return <ResponsiveDialog open={open} onOpenChange={onOpenChange} desktopContentClassName="max-w-md"><div dir="rtl" className="overflow-y-auto px-8 pb-10 pt-6 md:px-12 md:pt-10"><HandHeart className="h-7 w-7 text-primary"/><h2 className="mt-3 text-[21px] font-light">איך תוכלי לעזור לגבי {inquiry.boy_name}?</h2><div className="mt-5 space-y-5"><div className="flex flex-wrap gap-2">{CONNECTIONS.map(([id,label]) => <Choice key={id} selected={connection===id} onClick={() => setConnection(id)}>{label}</Choice>)}</div><div><p className="mb-2 text-[13px]">איך תרצי לעזור?</p><div className="space-y-2"><Choice selected={mode==="share_details"} onClick={() => setMode("share_details")}>אפשר להעביר לפונה את פרטי הקשר שאישרתי בפרופיל</Choice><Choice selected={mode==="liba"} onClick={() => setMode("liba")}>אני מעדיפה לתקשר דרך ליבה</Choice></div></div><div><p className="mb-2 text-[13px]">מי תראה שאת יכולה לעזור?</p><div className="flex flex-wrap gap-2"><Choice selected={visible} onClick={() => setVisible(true)}>אפשר לראות שאני מכירה</Choice><Choice selected={!visible} onClick={() => setVisible(false)}>להישאר אנונימית</Choice></div></div><p className="rounded-2xl bg-muted/60 p-3 text-[11.5px] leading-relaxed text-muted-foreground">פרטי קשר אינם מוצגים בכרטיס. הם עוברים רק לפונה ורק אם בחרת בכך במפורש.</p></div><div className="mt-7 flex justify-between"><Button variant="ghost" onClick={() => onOpenChange(false)}>ביטול</Button><Button onClick={submit} disabled={saving} className="rounded-full px-6">{saving && <Loader2 className="animate-spin"/>}שליחת העזרה</Button></div></div></ResponsiveDialog>;
};

const ThreadsDialog = ({ inquiry, open, onOpenChange }: { inquiry: Inquiry | null; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { openChat } = useLibaChat();
  const [threads, setThreads] = useState<InquiryThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [thanking, setThanking] = useState<string | null>(null);
  const [openingChat, setOpeningChat] = useState<string | null>(null);
  const load = useCallback(async () => { if (!inquiry) return; setLoading(true); try { setThreads(await fetchInquiryThreads(inquiry.id)); } catch { toast.error("לא הצלחנו לטעון את השיחות"); } finally { setLoading(false); } }, [inquiry]);
  useEffect(() => { if (open) void load(); }, [open, load]);
  useEffect(() => {
    if (!open) return;
    const close = () => onOpenChange(false);
    window.addEventListener("liba:chat-opened", close);
    return () => window.removeEventListener("liba:chat-opened", close);
  }, [open, onOpenChange]);

  const subtitleFor = (t: InquiryThread) => `בקשר להצעת העזרה על ${inquiry?.boy_name ?? "הבחור"} · ${connectionLabel(t.connection_type)}`;

  const writeInLiba = async (t: InquiryThread) => {
    const userId = t.chat_user_id ?? t.helper?.user_id;
    if (!userId) return;
    setOpeningChat(t.offer_id);
    try {
      await openChat({
        userId,
        sourceType: "inquiry",
        sourceId: inquiry?.id ?? null,
        contextTitle: `בירור על ${inquiry?.boy_name ?? ""}`.trim(),
        contextSubtitle: subtitleFor(t),
        contextLink: "/liba?birurim=1",
      });
      onOpenChange(false);
    } finally {
      setOpeningChat(null);
    }
  };

  const thank = async (t: InquiryThread) => {
    if (!inquiry) return;
    setThanking(t.offer_id);
    try {
      await thankInquiryOffer(t.offer_id);
      try { await notifyInquiry("thanked_one", inquiry.id, t.offer_id); } catch { /* the message was sent anyway */ }
      toast.success("התודה נשלחה 💗");
      await load();
    } catch { toast.error("לא הצלחנו לשלוח את התודה"); } finally { setThanking(null); }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} desktopContentClassName="max-w-xl">
      <div dir="rtl" className="overflow-y-auto px-8 pb-10 pt-6 md:px-12 md:pt-10">
        <h2 className="text-[21px] font-light">העזרה לבירור על {inquiry?.boy_name}</h2>
        {loading ? (
          <Loader2 className="mx-auto my-12 h-5 w-5 animate-spin text-primary" />
        ) : (
          <div className="mt-5 space-y-5">
            {threads.map((t) => {
              const email = t.shared_contact?.email;
              const phone = t.shared_contact?.whatsapp;
              const helperName = t.helper?.name ?? "מי שהציעה לעזור";
              return (
                <section key={t.offer_id} className="rounded-2xl border border-border/70 p-5">
                  <div className="flex items-center gap-2.5">
                    {t.helper ? (
                      <MemberAvatar name={t.helper.name} seed={t.helper.seed} imageUrl={t.helper.avatar_url} size="sm" userId={t.helper.user_id} context={{ sourceType: "inquiry", sourceId: inquiry?.id, title: `בירור על ${inquiry?.boy_name ?? ""}`.trim(), subtitle: subtitleFor(t), link: "/liba?birurim=1" }} />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><ShieldCheck className="h-4 w-4" /></span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px]">{t.helper?.name ?? "מסייעת אנונימית"}</p>
                      <p className="text-[11.5px] text-muted-foreground">{connectionLabel(t.connection_type)}</p>
                    </div>
                  </div>

                  {!t.mine && (
                    <div className="mt-5 space-y-3 border-t border-border/60 pt-4">
                      {(t.chat_user_id || t.helper?.user_id) && (
                        <div>
                          <p className="mb-2 text-[12.5px] text-muted-foreground">אפשר לפנות אל {helperName} בליבה</p>
                          <Button type="button" size="sm" disabled={openingChat === t.offer_id} onClick={() => void writeInLiba(t)} className="rounded-full px-4 text-[12.5px] font-normal">
                            {openingChat === t.offer_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquareQuote className="h-3.5 w-3.5" />}
                            פתיחת צ׳אט על {inquiry?.boy_name}
                          </Button>
                        </div>
                      )}
                      {(email || phone) && (
                        <div className="space-y-2">
                          <p className="text-[12.5px] text-muted-foreground">או לפנות אליה בפרטים שאישרה לשתף:</p>
                          <div className="flex flex-wrap gap-2">
                            {email && (
                              <Button asChild variant="outline" size="sm" className="rounded-full text-[12px] font-light">
                                <a href={`mailto:${email}?subject=${encodeURIComponent(`בקשר להצעת העזרה שלך על ${inquiry?.boy_name ?? ""}`)}`}><Mail className="h-3.5 w-3.5" />מייל: {email}</a>
                              </Button>
                            )}
                            {phone && (
                              <Button asChild variant="outline" size="sm" className="rounded-full text-[12px] font-light" dir="ltr">
                                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}><Phone className="h-3.5 w-3.5" />{phone} :טלפון</a>
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="border-t border-border/60 pt-3">
                        <Button type="button" variant="outline" size="sm" disabled={!!t.thanked_at || thanking === t.offer_id} onClick={() => void thank(t)} className="rounded-full border-primary/40 px-4 text-[12.5px] font-normal text-primary hover:bg-primary/[0.07] hover:text-primary">
                          {thanking === t.offer_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandHeart className="h-3.5 w-3.5" />}
                          {t.thanked_at ? "התודה נשלחה 💗" : "תודה שעזרת לי 💗"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    {t.messages.map((m) => (
                      <p key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] ${m.mine ? "ms-auto bg-primary/10 text-foreground" : "bg-muted text-foreground"}`}>{m.body}</p>
                    ))}
                  </div>

                </section>
              );
            })}
            {threads.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">עוד אין הצעות עזרה לבירור הזה.</p>}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
};

const InquiryCard = ({ inquiry, compact, onHelp, onThreads, onEdit, onChanged, onRemoved }: { inquiry: Inquiry; compact: boolean; onHelp: () => void; onThreads: () => void; onEdit: () => void; onChanged: (q: Inquiry) => void; onRemoved: () => void }) => {
  const people = inquiry.helpers.filter((h) => !h.anonymous && h.name).map((h) => ({ name: h.name ?? "חברה", seed: h.seed, imageUrl: h.avatar_url }));
  const setStatus = async (status: "closed"|"resolved"|"removed", thank = false) => {
    if (status === "removed" && !window.confirm("למחוק את הבירור?")) return;
    try {
      const next = await setInquiryStatus(inquiry.id,status);
      if (status === "removed") onRemoved(); else onChanged(next);
      if (thank) {
        try {
          await notifyInquiry("thanked", inquiry.id);
          toast.success("הבירור נסגר ותודה נשלחה לכל מי שעזרה");
        } catch {
          toast.warning("הבירור נסגר, אבל הודעת התודה לא נשלחה. אפשר לנסות שוב מהתפריט.");
        }
      } else {
        toast.success(status === "removed" ? "הבירור נמחק" : "הבירור עודכן");
      }
    } catch { toast.error("לא הצלחנו לעדכן את הבירור"); }
  };
  const helperLabel = inquiry.help_count === 0 ? "אף אחת עוד לא ענתה" : inquiry.help_count === 1 ? "אחת ענתה" : `${inquiry.help_count} ענו`;
  if (compact) return <article className="flex items-center gap-3 py-4">
    <div className="min-w-0 flex-1"><h3 className="truncate text-[16px] font-semibold text-foreground">{inquiry.boy_name}</h3>{!inquiry.mine && !inquiry.author.nickname && (inquiry.author_full_name ?? inquiry.author.name) && <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">שאלה: {inquiry.author_full_name ?? inquiry.author.name}</p>}{inquiry.details && <p className="mt-1 truncate text-[12px] text-muted-foreground">{inquiry.details}</p>}</div>
    <Button variant="ghost" size="sm" onClick={onThreads} className={inquiry.help_count ? "gap-1 text-primary" : "gap-1 text-muted-foreground"}><Hand className="h-4 w-4"/>{inquiry.help_count}</Button>
    {!inquiry.mine && inquiry.status === "open" && <Button variant={inquiry.my_offer ? "default" : "outline"} size="sm" onClick={onHelp} className={`rounded-full ${inquiry.my_offer ? "" : "border-primary bg-card text-primary hover:bg-primary/5 hover:text-primary"}`}><HandHeart className="h-4 w-4"/>{inquiry.my_offer ? "עדכון העזרה" : "אני מכירה"}</Button>}
  </article>;
  return <article className="relative mx-auto flex min-h-[270px] w-full max-w-none flex-col rounded-3xl border border-border/80 bg-card/90 px-5 pb-4 pt-10 text-center shadow-[var(--shadow-soft)] md:mx-0 md:max-w-[280px]">
    {(inquiry.mine || inquiry.can_moderate) && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="absolute left-3 top-3 h-8 w-8 text-muted-foreground" aria-label="פעולות בבירור"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="direction-rtl text-right">
      {inquiry.mine && <DropdownMenuItem onSelect={onEdit}><Pencil className="ml-2 h-4 w-4"/>עריכה</DropdownMenuItem>}
      {inquiry.status === "open" && <DropdownMenuItem onSelect={() => void setStatus("resolved")}><CheckCircle2 className="ml-2 h-4 w-4"/>סימון כנפתר</DropdownMenuItem>}
      {inquiry.status === "open" && <DropdownMenuItem onSelect={() => void setStatus("closed")}><XCircle className="ml-2 h-4 w-4"/>סגירה</DropdownMenuItem>}
      {inquiry.help_count > 0 && <DropdownMenuItem onSelect={() => void setStatus("resolved", true)}><HandHeart className="ml-2 h-4 w-4"/>תודה שעזרתן לי</DropdownMenuItem>}
      {inquiry.can_moderate && <DropdownMenuItem onSelect={() => void adminInquiryAction(inquiry.id,"pin",{value:!inquiry.pinned}).then(onChanged).catch(() => toast.error("הפעולה לא הושלמה"))}><CheckCircle2 className="ml-2 h-4 w-4"/>{inquiry.pinned ? "ביטול נעיצה" : "נעיצה"}</DropdownMenuItem>}
      <DropdownMenuSeparator/><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void setStatus("removed")}><Trash2 className="ml-2 h-4 w-4"/>מחיקה</DropdownMenuItem>
    </DropdownMenuContent></DropdownMenu>}
    <div className="mx-auto flex-1"><h3 className="text-[22px] font-semibold text-foreground">{inquiry.boy_name}</h3>{!inquiry.mine && !inquiry.author.nickname && (inquiry.author_full_name ?? inquiry.author.name) && <div className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground"><MemberAvatar name={inquiry.author_full_name ?? inquiry.author.name ?? ""} seed={inquiry.author.seed ?? inquiry.author.name ?? ""} imageUrl={inquiry.author.avatar_url ?? null} size="sm" userId={inquiry.author.profile_id ?? undefined} context={{ sourceType: "inquiry", sourceId: inquiry.id, title: `בירור על ${inquiry.boy_name}`, link: "/liba?birurim=1" }} /><span>שאלה: <span className="font-medium text-foreground">{inquiry.author_full_name ?? inquiry.author.name}</span></span></div>}<div className="mt-2.5 flex flex-wrap justify-center gap-1.5"><span className="inline-flex rounded-full bg-muted px-3 py-1 text-[11.5px] font-light text-muted-foreground">{backgroundLabel(inquiry.background)}</span>{inquiry.info_types.map((x) => <span key={x} className={`rounded-full px-3 py-1 text-[11.5px] ${infoChipClass(x)}`}>{infoLabel(x)}</span>)}</div>{inquiry.details && <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-[13px] font-light leading-relaxed text-muted-foreground">{inquiry.details}</p>}</div>
    {!inquiry.mine && inquiry.status === "open" && <Button variant={inquiry.my_offer ? "default" : "outline"} onClick={onHelp} className={`mx-auto mt-4 h-11 w-full max-w-[230px] rounded-full text-[15px] font-light ${inquiry.my_offer ? "" : "border-primary bg-card text-primary hover:bg-primary/5 hover:text-primary"}`}><HandHeart className="h-5 w-5"/>{inquiry.my_offer ? "עדכון העזרה" : "אני מכירה"}</Button>}
    {inquiry.mine && <p className="mt-4 text-[12px] text-muted-foreground">הבקשה פורסמה {inquiry.author.nickname ? "באופן אנונימי" : "בשם שלך"}</p>}
    <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3"><Button type="button" variant="ghost" size="sm" onClick={onThreads} className={`h-auto gap-2 px-0 text-[11.5px] font-light hover:bg-transparent ${inquiry.help_count ? "text-primary hover:text-primary" : "text-muted-foreground"}`}>{people.length > 0 && <AvatarStack people={people} total={inquiry.help_count} max={3}/>}<Hand className="h-4 w-4"/><span>{helperLabel}</span></Button><span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground"><Clock3 className="h-4 w-4"/>{timeAgo(inquiry.created_at)}</span></div>
    {inquiry.my_offer && <Button variant="ghost" size="sm" onClick={async () => { try { onChanged(await cancelInquiryHelp(inquiry.id)); toast.success("הצעת העזרה בוטלה"); } catch { toast.error("לא הצלחנו לבטל"); } }} className="mx-auto mt-1 h-7 text-[11px] font-light text-muted-foreground hover:text-destructive">ביטול העזרה שלי</Button>}
  </article>;
};

export default function InquiriesPage({ profile, isAdmin = false, initialQuery = "" }: { profile: CommunityProfile | null; isAdmin?: boolean; initialQuery?: string }) {
  const [items,setItems]=useState<Inquiry[]>([]); const [loading,setLoading]=useState(true); const [query,setQuery]=useState(initialQuery); const [background,setBackground]=useState(() => { try{return localStorage.getItem(FILTER_KEY)??"all"}catch{return "all"} }); const [helpStatus,setHelpStatus]=useState("all"); const [view,setView]=useState<InquiryView>(()=>{try{return localStorage.getItem(VIEW_KEY)==="list"?"list":"cards"}catch{return "cards"}}); const [createOpen,setCreateOpen]=useState(false); const [filtersOpen,setFiltersOpen]=useState(false); const [editing,setEditing]=useState<Inquiry|null>(null); const [helping,setHelping]=useState<Inquiry|null>(null); const [threading,setThreading]=useState<Inquiry|null>(null);
  const load=useCallback(async()=>{setLoading(true);try{setItems(await fetchInquiries({query,background,helpStatus,all:isAdmin}))}catch{toast.error("לא הצלחנו לטעון את הבירורים")}finally{setLoading(false)}},[query,background,helpStatus,isAdmin]);
  useEffect(()=>{const t=window.setTimeout(()=>void load(),query?250:0);return()=>window.clearTimeout(t)},[load,query]);
  useEffect(()=>{try{localStorage.setItem(VIEW_KEY,view);localStorage.setItem(FILTER_KEY,background)}catch{/* ignore */}},[view,background]);
  const patch=(q:Inquiry)=>setItems((xs)=>xs.map((x)=>x.id===q.id?q:x));
  const countText=useMemo(()=>items.length===1?"בירור פתוח אחד":`${items.length} בירורים`,[items.length]);
  return <section dir="rtl" className="relative pb-20 md:pb-0">
    <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-border/50 bg-background/95 px-4 pb-4 pt-2 backdrop-blur-sm md:-mx-6 md:px-6">
      <div className="mb-4 hidden flex-wrap items-center justify-between gap-4 md:flex">
        <h1 className="text-[22px] font-light text-foreground md:text-[28px]"><span className="text-primary">אולי את מכירה?</span><span className="mx-2 text-muted-foreground">|</span>פורום הבירורים</h1>
        <Button onClick={()=>setCreateOpen(true)} className="rounded-full px-5"><Plus className="h-4 w-4"/>פתיחת בירור</Button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="hidden h-9 shrink-0 rounded-full border border-border bg-muted/50 p-0.5 md:flex">
            <Button type="button" variant="ghost" size="sm" onClick={()=>setHelpStatus("all")} className={`h-full rounded-full px-4 text-[12.5px] font-light ${helpStatus==="all"?"bg-background text-primary shadow-sm hover:bg-background hover:text-primary":"text-muted-foreground"}`}>הכול</Button>
            <Button type="button" variant="ghost" size="sm" onClick={()=>setHelpStatus("waiting")} className={`h-full rounded-full px-4 text-[12.5px] font-light ${helpStatus==="waiting"?"bg-background text-primary shadow-sm hover:bg-background hover:text-primary":"text-muted-foreground"}`}>בקשות שמחכות לעזרה שלך</Button>
          </div>
          <div className="hidden md:block"><SegmentedFilter
            value={background}
            onChange={(v) => setBackground(v)}
            options={[
              { value: "all", label: "הכול" },
              { value: "ashkenazi", label: "אשכנזים" },
              { value: "sephardi", label: "ספרדים" },
            ]}
          /></div>
          <label className="relative min-w-0 flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="חיפוש לפי שם, עיר, ישיבה או פרט" className="h-9 w-full rounded-full border border-border bg-card py-2 pe-4 ps-10 text-[13px] outline-none focus:border-primary"/>
          </label>
          <Button variant="outline" size="icon" onClick={()=>setFiltersOpen(true)} className="h-9 w-9 shrink-0 rounded-full md:hidden" aria-label="סינון"><Filter className="h-4 w-4"/></Button>
          <div className="flex h-9 shrink-0 items-center rounded-full bg-muted/60 p-0.5">
            <Button variant="ghost" size="icon" onClick={()=>setView("cards")} className={`h-8 w-8 rounded-full ${view==="cards"?"bg-background text-primary shadow-sm":"text-muted-foreground"}`} title="כרטיסים"><Grid2X2 className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" onClick={()=>setView("list")} className={`h-8 w-8 rounded-full ${view==="list"?"bg-background text-primary shadow-sm":"text-muted-foreground"}`} title="רשימה"><List className="h-4 w-4"/></Button>
          </div>
        </div>
        <p className="text-[11.5px] text-muted-foreground">{countText}</p>
      </div>

    </div>
    <Button type="button" size="icon" onClick={()=>setCreateOpen(true)} aria-label="פתיחת בירור" className="fixed bottom-20 left-4 z-40 h-14 w-14 rounded-full shadow-[var(--shadow-card)] md:hidden"><Plus className="h-6 w-6"/></Button>
    <ResponsiveDialog open={filtersOpen} onOpenChange={setFiltersOpen} mobileContentClassName="h-[78vh]">
      <div dir="rtl" className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-lg font-medium">סינון</h2><Button variant="ghost" size="sm" onClick={()=>{setBackground("all");setHelpStatus("all")}}>ניקוי</Button></div>
        <div className="flex-1 overflow-y-auto px-5">
          <div className="border-b border-border/70 py-5"><p className="mb-3 text-sm">מי מחכה לעזרה?</p><div className="flex flex-wrap gap-2"><Choice selected={helpStatus==="all"} onClick={()=>setHelpStatus("all")}>כל הבירורים</Choice><Choice selected={helpStatus==="waiting"} onClick={()=>setHelpStatus("waiting")}>מחכות לעזרה</Choice></div></div>
          <div className="border-b border-border/70 py-5"><p className="mb-3 text-sm">עדה</p><div className="flex flex-wrap gap-2"><Choice selected={background==="all"} onClick={()=>setBackground("all")}>הכול</Choice><Choice selected={background==="ashkenazi"} onClick={()=>setBackground("ashkenazi")}>אשכנזים</Choice><Choice selected={background==="sephardi"} onClick={()=>setBackground("sephardi")}>ספרדים</Choice></div></div>
        </div>
        <div className="border-t border-border bg-muted/40 p-4"><Button onClick={()=>setFiltersOpen(false)} className="h-12 w-full rounded-md">הצגת תוצאות</Button></div>
      </div>
    </ResponsiveDialog>
    {loading?<p className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin"/></p>:items.length===0?(query||background!=="all"||helpStatus!=="all"?<EmptyState icon={CircleHelp} title="לא מצאנו בירור שמתאים לחיפוש הזה" description="אפשר לנקות את החיפוש והסינונים ולראות את כל הבירורים הפתוחים." action={{label:"ניקוי חיפוש וסינונים",onClick:()=>{setQuery("");setBackground("all");setHelpStatus("all")}}}/>:<EmptyState icon={CircleHelp} title="אין כרגע בירורים פתוחים" description="בירור הוא בקשה לעזרה בבדיקה על בחור. אם את מחפשת מידע — אפשר לפתוח בירור והקהילה תנסה לעזור." action={{label:"פתיחת בירור",onClick:()=>{setEditing(null);setCreateOpen(true)}}}/>):<div className={view==="cards"?"grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fill,minmax(230px,280px))] md:justify-start":"divide-y divide-border/60"}>{items.map((q)=><InquiryCard key={q.id} inquiry={q} compact={view==="list"} onHelp={()=>setHelping(q)} onThreads={()=>setThreading(q)} onEdit={()=>{setEditing(q);setCreateOpen(true)}} onChanged={patch} onRemoved={()=>setItems((xs)=>xs.filter((x)=>x.id!==q.id))}/>)}</div>}
    <CreateDialog open={createOpen} onOpenChange={(next) => {
      if (next) {
        const exact = query.trim() && items.some((item) => item.boy_name.trim().toLocaleLowerCase("he") === query.trim().toLocaleLowerCase("he"));
        if (exact) toast("כבר קיים בירור בשם הזה. כדאי לבדוק אם מדובר באותו אדם.");
      }
      setCreateOpen(next); if (!next) setEditing(null);
    }} profile={profile} editing={editing} onSaved={load}/><HelpDialog inquiry={helping} open={!!helping} onOpenChange={(v)=>!v&&setHelping(null)} onChanged={patch}/><ThreadsDialog inquiry={threading} open={!!threading} onOpenChange={(v)=>!v&&setThreading(null)}/>
  </section>;
}
