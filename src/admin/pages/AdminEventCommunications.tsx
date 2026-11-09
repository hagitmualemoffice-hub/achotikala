import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Save, Send, MessageCircle, Plus, Trash2, Upload, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { loadWhatsappImage } from "@/admin/lib/whatsappShare";
import { uploadToMedia } from "@/admin/lib/media";
import { tickchakLink, whatsappMessage, bodyToHtml, plannedInstant, type CommunicationDraft } from "@/admin/lib/eventCommunication";
import type { DbRow } from "@/hooks/useEvents";
import brandLogo from "@/assets/logo-achoti-kala.png";

type SendStatus = { total: number; sent: number; remaining: number; next_wave: number; next_wave_size: number; waves: { wave: number; count: number; at: string }[]; older_version_sent: boolean };

const invokeSend = async (body: Record<string, unknown>): Promise<SendStatus & { error?: string }> => {
  const { data, error } = await supabase.functions.invoke("event-communication-send", { body });
  if (error) {
    const detail = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    try { const parsed = JSON.parse(detail); if (parsed?.total != null) return parsed; throw new Error(parsed?.error ?? detail); }
    catch (e) { if (e instanceof SyntaxError) throw new Error(detail); throw e; }
  }
  return data;
};

const localTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AdminEventCommunications() {
  const { id } = useParams();
  const [event, setEvent] = useState<DbRow | null>(null);
  const [draft, setDraft] = useState<CommunicationDraft | null>(null);
  const [history, setHistory] = useState<CommunicationDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<SendStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [dirty, setDirty] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // Wraps the selected text in a mark: bold (**…**) or a larger line (## …).
  const mark = (kind: "bold" | "large") => {
    const el = bodyRef.current;
    if (!el || !draft) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    let next: string;
    if (kind === "bold") next = value.slice(0, a) + "**" + (value.slice(a, b) || "טקסט מודגש") + "**" + value.slice(b);
    else { const lineStart = value.lastIndexOf("\n", a - 1) + 1; next = value.startsWith("## ", lineStart) ? value.slice(0, lineStart) + value.slice(lineStart + 3) : value.slice(0, lineStart) + "## " + value.slice(lineStart); }
    change({ body: next });
    requestAnimationFrame(() => el.focus());
  };
  // WhatsApp: send the event picture itself with the text, so the chat shows the site image, not the Tickchak link preview.
  useEffect(() => {
    setShareFile(null);
    const cover = event?.cover_image;
    if (!cover) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    void loadWhatsappImage(cover, controller.signal).then(file => {
      if (!controller.signal.aborted) setShareFile(file);
    });
    return () => { controller.abort(); clearTimeout(timer); };
  }, [event?.cover_image]);
  const shareWhatsapp = () => {
    if (!draft || !event) return;
    const text = whatsappMessage(draft, event);
    if (shareFile && navigator.canShare?.({ files: [shareFile], text })) {
      // Invoke from the click itself: awaiting a download loses mobile share permission.
      void navigator.share({ files: [shareFile], text }).catch(error => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setShareOpen(true);
      });
      return;
    }
    setShareOpen(true);
  };
  const downloadShareImage = () => {
    if (!shareFile) return;
    const url = URL.createObjectURL(shareFile);
    const a = document.createElement("a"); a.href = url; a.download = shareFile.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const change = (patch: Partial<CommunicationDraft>) => { setDirty(true); setDraft(current => current ? { ...current, ...patch } : current); };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      supabase.from("events_db").select("*").eq("id", id).single(),
      supabase.from("event_communications").select("*").eq("event_id", id).order("created_at", { ascending: false }),
    ]).then(([ev, messages]) => {
      if (cancelled) return;
      if (ev.error || messages.error) { setFailed(true); toast.error(ev.error?.message ?? messages.error?.message); return; }
      const row = ev.data as unknown as DbRow;
      setEvent(row);
      const existing = (messages.data ?? []) as unknown as CommunicationDraft[];
      setHistory(existing);
      setDraft(existing[0] ?? { event_id: id, subject: row.title, title: row.title, body: row.description ?? "", registration_url: row.registration?.url ?? "", brand_logo_url: "", show_brand_logo: true, extra_logos: row.partner_logo ? [row.partner_logo] : [], audience: "website", google_label: "", message_kind: "announcement", planned_at: null });
    });
    return () => { cancelled = true; };
  }, [id]);

  const save = async (): Promise<string | null> => {
    if (!draft) return null;
    if (!draft.subject.trim() || !draft.title.trim()) { toast.error("יש להזין נושא וכותרת"); return null; }
    const { id: draftId, ...fields } = draft;
    if (fields.show_brand_logo && !fields.brand_logo_url) {
      const response = await fetch(brandLogo);
      if (!response.ok) throw new Error("הלוגו לא נטען");
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) { bitmap.close(); throw new Error("הלוגו לא נטען"); }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.86));
      if (!blob || blob.size > 500000) throw new Error("הלוגו גדול מדי");
      fields.brand_logo_url = (await uploadToMedia(blob, "achoti-kala-logo.webp", "אחותי כלה")).url;
    }
    const payload = { ...fields, extra_logos: fields.extra_logos, status: "draft" };
    const query = draftId ? supabase.from("event_communications").update(payload).eq("id", draftId) : supabase.from("event_communications").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error || !data) { toast.error(error?.message ?? "השמירה נכשלה"); return null; }
    const saved = data as unknown as CommunicationDraft;
    setDraft(saved);
    setHistory(previous => [saved, ...previous.filter(item => item.id !== saved.id)]);
    toast.success("הטיוטה נשמרה; טרם נקבעה שליחה");
    return data.id;
  };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try { await action(); } catch (error) { toast.error(error instanceof Error ? error.message : "הפעולה נכשלה"); }
    finally { setBusy(false); }
  };
  const sendTest = async () => {
    const recipient = z.string().trim().email().max(254).safeParse(testEmail);
    if (!recipient.success) { toast.error("יש להזין כתובת מייל תקינה לבדיקה"); return; }
    if (!draft || !tickchakLink(draft.registration_url)) { toast.error("יש להזין קישור HTTPS לטיקצ׳אק"); return; }
    const draftId = await save();
    if (!draftId) return;
    const { data, error } = await supabase.functions.invoke("event-communication-test", { body: { draft_id: draftId, recipient: recipient.data } });
    if (error) {
      const detail = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
      throw new Error(detail);
    }
    toast.success(`מייל הבדיקה נשלח ל־${data.recipient}`);
  };
  const refreshStatus = async (draftId: string) => setStatus(await invokeSend({ draft_id: draftId, mode: "status" }));
  useEffect(() => { setStatus(null); setDirty(false); if (draft?.id) void refreshStatus(draft.id).catch(() => undefined); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);
  // Step 1: save and show where the list stands; nothing is sent until the dialog is confirmed.
  const prepareSend = async () => {
    if (!draft || !tickchakLink(draft.registration_url)) { toast.error("יש להזין קישור HTTPS לטיקצ׳אק"); return; }
    const draftId = await save();
    if (!draftId) return;
    setDirty(false);
    const current = await invokeSend({ draft_id: draftId, mode: "status" });
    setStatus(current);
    if (!current.remaining) { toast.info("כל הרשימה כבר קיבלה את ההודעה הזאת"); return; }
    setConfirming(true);
  };
  const confirmSend = async () => {
    if (!draft?.id || !status) return;
    setConfirming(false);
    const result = await invokeSend({ draft_id: draft.id, mode: "send", confirm_wave: status.next_wave });
    if (result.error) { setStatus(result); throw new Error(result.error); }
    await refreshStatus(draft.id);
    toast.success(`גל ${status.next_wave} נשלח`);
  };
  const uploadLogo = async (file: File | undefined) => {
    if (!file || !draft) return;
    if (!file.type.startsWith("image/")) throw new Error("יש לבחור תמונה");
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) { bitmap.close(); throw new Error("התמונה לא נטענה"); }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob || blob.size > 500000) throw new Error("התמונה גדולה מדי; יש לבחור תמונה קטנה יותר");
    const uploaded = await uploadToMedia(blob, "event-logo.webp", "לוגו אירוע");
    change({ extra_logos: [...draft.extra_logos, { url: uploaded.url, alt: "לוגו נוסף" }] });
  };

  if (failed) return <p role="alert">לא ניתן לפתוח את האירוע.</p>;
  if (!event || !draft) return <Loader2 aria-label="טוענת" className="h-6 w-6 animate-spin" />;
  return <div dir="rtl" className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><Button asChild variant="ghost" size="sm"><Link to="/admin/events"><ArrowRight className="h-4 w-4" />אירועים</Link></Button><h1 className="text-2xl font-medium">פרסום ותזכורות</h1><p className="text-sm text-muted-foreground">{event.title}</p></div>
      <Button variant="outline" disabled={busy} onClick={() => setDraft({ ...draft, id: undefined, planned_at: null })}><Plus className="h-4 w-4 me-2" />הודעה נוספת</Button>
    </header>
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="min-w-0 space-y-5">
        {history.length > 0 && <div className="space-y-2"><Label>טיוטות שמורות</Label><Select value={draft.id ?? "new"} onValueChange={value => { const item = history.find(item => item.id === value); if (item) setDraft(item); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">הודעה חדשה</SelectItem>{history.map(item => <SelectItem key={item.id} value={item.id ?? ""}>{item.subject}</SelectItem>)}</SelectContent></Select></div>}
        <div className="space-y-2"><Label htmlFor="message-kind">סוג הודעה</Label><Select value={draft.message_kind} onValueChange={message_kind => change({ message_kind })}><SelectTrigger id="message-kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="announcement">פרסום האירוע</SelectItem><SelectItem value="early_end">סיום הרשמה מוקדמת</SelectItem><SelectItem value="update">עדכון נוסף</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="email-subject">נושא המייל</Label><Input id="email-subject" maxLength={255} value={draft.subject} onChange={e => change({ subject: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="message-title">כותרת בהודעה</Label><Input id="message-title" maxLength={500} value={draft.title} onChange={e => change({ title: e.target.value })} /></div>
        <div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor="message-body">טקסט</Label><div className="flex gap-1"><Button type="button" variant="outline" size="sm" onClick={() => mark("bold")} className="font-bold">הדגשה</Button><Button type="button" variant="outline" size="sm" onClick={() => mark("large")}>גופן גדול</Button></div></div><p className="text-xs text-muted-foreground">מסמנים מילים ולוחצים "הדגשה". "גופן גדול" מגדיל את כל השורה. אותו עיצוב יופיע במייל ובוואטסאפ (בוואטסאפ שורה גדולה מופיעה מודגשת).</p><Textarea ref={bodyRef} id="message-body" className="min-h-48" maxLength={20000} value={draft.body} onChange={e => change({ body: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="registration-link">קישור לטיקצ׳אק</Label><Input dir="ltr" id="registration-link" value={draft.registration_url} onChange={e => change({ registration_url: e.target.value })} />{draft.registration_url && !tickchakLink(draft.registration_url) && <p className="text-sm text-destructive">יש להזין קישור HTTPS לטיקצ׳אק</p>}</div>
        <div className="flex items-center justify-between"><Label htmlFor="brand-logo">לוגו אחותי כלה מעל התמונה</Label><Switch id="brand-logo" checked={draft.show_brand_logo} onCheckedChange={show_brand_logo => change({ show_brand_logo })} /></div>
        <div className="space-y-2"><Label htmlFor="brand-logo-url">קישור ללוגו אחותי כלה במייל</Label><Input id="brand-logo-url" dir="ltr" placeholder="https://" value={draft.brand_logo_url} onChange={e => change({ brand_logo_url: e.target.value })} /></div>
        <div className="space-y-3"><div className="flex items-center justify-between"><Label>לוגואים נוספים</Label><Button asChild variant="outline" size="sm" disabled={busy || draft.extra_logos.length >= 8}><label className="cursor-pointer"><Upload className="h-4 w-4 me-2" />העלאת לוגו<input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={e => { const file = e.target.files?.[0]; void run(() => uploadLogo(file)); e.target.value = ""; }} /></label></Button></div>{draft.extra_logos.map((logo, index) => <div key={index} className="flex items-center gap-2"><img src={logo.url} alt={logo.alt} className="h-12 w-16 object-contain" /><Input aria-label={`תיאור לוגו ${index + 1}`} value={logo.alt} onChange={e => change({ extra_logos: draft.extra_logos.map((item, i) => i === index ? { ...item, alt: e.target.value } : item) })} /><Button variant="ghost" size="icon" aria-label={`הסרת לוגו ${index + 1}`} onClick={() => change({ extra_logos: draft.extra_logos.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
        <div className="space-y-2"><Label htmlFor="audience">נמענות</Label><Select value={draft.audience} onValueChange={audience => change({ audience })}><SelectTrigger id="audience"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="website">רשימת התפוצה באתר</SelectItem><SelectItem value="google">אנשי קשר בגוגל</SelectItem><SelectItem value="both">שתי הרשימות</SelectItem></SelectContent></Select></div>
        {draft.audience !== "website" && <div className="space-y-2"><Label htmlFor="google-label">תווית אנשי הקשר בגוגל</Label><Input id="google-label" value={draft.google_label} onChange={e => change({ google_label: e.target.value })} /><p className="text-xs text-muted-foreground">קריאת אנשי הקשר בגוגל עדיין אינה מחוברת.</p></div>}
        <div className="space-y-2"><Label htmlFor="planned-send">מועד שליחה מבוקש — טיוטה בלבד</Label><Input id="planned-send" type="datetime-local" value={localTime(draft.planned_at)} onChange={e => change({ planned_at: plannedInstant(e.target.value) })} /><p className="text-sm text-muted-foreground">המועד נשמר בטיוטה ולא מפעיל שליחה אוטומטית. השליחה עצמה נעשית בלחיצה על "שליחה לתפוצה".</p></div>
        <div className="space-y-2"><Label htmlFor="test-email">כתובת מייל לבדיקה</Label><div className="flex flex-wrap gap-2"><Input id="test-email" type="email" dir="ltr" maxLength={254} placeholder="name@example.com" className="min-w-0 flex-1 basis-56" value={testEmail} disabled={busy} onChange={e => setTestEmail(e.target.value)} /><Button variant="outline" disabled={busy || !z.string().trim().email().max(254).safeParse(testEmail).success || !tickchakLink(draft.registration_url)} onClick={() => void run(sendTest)}><Send className="h-4 w-4 me-2" />שליחת מייל בדיקה</Button></div></div>
        <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void run(save)}><Save className="h-4 w-4 me-2" />שמירת טיוטה</Button><Button type="button" variant="outline" disabled={busy} onClick={shareWhatsapp}><MessageCircle className="h-4 w-4 me-2" />שיתוף בוואטסאפ</Button><Button variant="secondary" disabled={busy || !tickchakLink(draft.registration_url)} onClick={() => void run(prepareSend)}><Users className="h-4 w-4 me-2" />שליחה לתפוצה</Button></div>
        <p className="text-xs text-muted-foreground">כל שליחה לתפוצה יוצאת תמיד בעותק מוסתר, אין אפשרות אחרת — אף נמענת לא רואה את הכתובות האחרות. כל מייל כולל קישור להסרה מרשימת התפוצה. הרשימה נשלחת בגלים: גל אחד היום, גל שני אחר כך, עד שהכול יצא.</p>
        {status && <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm" aria-live="polite">
          <p className="font-medium">מצב השליחה לתפוצה{dirty ? " (לפני השמירה של השינויים)" : ""}</p>
          {status.older_version_sent && <p className="text-primary">גרסה קודמת של ההודעה כבר נשלחה. הטקסט שונה, ולכן זו הודעה חדשה שתישלח מההתחלה לכל הרשימה.</p>}
          <div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full bg-primary" style={{ width: `${status.total ? (status.sent / status.total) * 100 : 0}%` }} /></div>
          <p>נשלח ל־{status.sent} מתוך {status.total} · עוד לא נשלח ל־{status.remaining}</p>
          {status.waves.length === 0 ? <p className="text-muted-foreground">עוד לא נשלח לאף אחת.</p> : <ul className="space-y-1">{status.waves.map(w => <li key={w.wave}>✓ גל {w.wave} נשלח ל־{w.count} נמענות · {new Date(w.at).toLocaleString("he-IL")}</li>)}</ul>}
          {status.remaining > 0 ? <p>הגל הבא: גל {status.next_wave} ל־{status.next_wave_size} נמענות.</p> : status.sent > 0 && <p className="font-medium">כל הרשימה קיבלה את ההודעה. אי אפשר לשלוח אותה שוב בלי לשנות את הטקסט.</p>}
        </div>}
        <AlertDialog open={shareOpen} onOpenChange={setShareOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader><AlertDialogTitle>שיתוף בוואטסאפ</AlertDialogTitle><AlertDialogDescription>{shareFile ? "תמונת האירוע והטקסט מוכנים לשיתוף בנפרד." : "התמונה אינה מוכנה לשיתוף כרגע; אפשר לפתוח את ההודעה בוואטסאפ ללא תמונה."}</AlertDialogDescription></AlertDialogHeader>
            <Textarea aria-label="טקסט לשיתוף בוואטסאפ" readOnly value={whatsappMessage(draft, event)} className="max-h-64" />
            <AlertDialogFooter className="flex-wrap gap-2">
              <AlertDialogCancel>סגירה</AlertDialogCancel>
              {shareFile && <Button variant="outline" onClick={downloadShareImage}>הורדת תמונת האירוע</Button>}
              <Button asChild><a href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage(draft, event))}`} target="_blank" rel="noopener noreferrer">פתיחת הטקסט בוואטסאפ</a></Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>לשלוח את גל {status?.next_wave}?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-right">
                {status?.waves.map(w => <span key={w.wave} className="block">✓ גל {w.wave} כבר נשלח ל־{w.count} נמענות ({new Date(w.at).toLocaleString("he-IL")}).</span>)}
                <span className="block">עכשיו יישלח בעותק מוסתר ל־{status?.next_wave_size} נמענות שעוד לא קיבלו. מי שכבר קיבלה לא תקבל שוב.</span>
                {status && status.remaining > status.next_wave_size && <span className="block">אחרי הגל הזה יישארו {status.remaining - status.next_wave_size} לגל הבא.</span>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={() => void run(confirmSend)}>{status?.waves.length ? `מאשרת: הגל הקודם נשלח — שלחי את גל ${status.next_wave}` : "מאשרת — שלחי את גל 1"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
      <section className="min-w-0"><h2 className="mb-3 text-sm font-medium text-muted-foreground">תצוגה מקדימה</h2><article className="overflow-hidden rounded-lg border bg-background">
        <div className="flex flex-wrap items-center justify-center gap-4 p-5">{draft.show_brand_logo && <img src={draft.brand_logo_url || brandLogo} alt="אחותי כלה" className="h-16 w-28 object-contain" />}{draft.extra_logos.map((logo, i) => <img key={i} src={logo.url} alt={logo.alt} className="h-16 w-24 object-contain" />)}</div>
        {event.cover_image && <img src={event.cover_image} alt={event.title} className="w-full object-cover" />}
        <div className="space-y-5 p-6"><h2 className="whitespace-pre-line break-words text-2xl font-semibold">{draft.title}</h2><p className="text-sm text-muted-foreground">{new Date(event.event_date).toLocaleDateString("he-IL")} · {event.event_time}<br />{event.location} {event.city}</p><p className="break-words text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: bodyToHtml(draft.body) }} /><div className="flex flex-wrap gap-4">{event.early_price != null && <p className="text-primary">רישום מוקדם: ₪{event.early_price}{event.early_price_deadline ? ` · עד ${new Date(event.early_price_deadline).toLocaleDateString("he-IL")}` : ""}</p>}{event.regular_price != null && <p>רישום רגיל: ₪{event.regular_price}</p>}</div><Button asChild className="w-full" disabled={!tickchakLink(draft.registration_url)}><a href={tickchakLink(draft.registration_url) ? draft.registration_url : undefined} target="_blank" rel="noopener noreferrer">להרשמה בטיקצ׳אק</a></Button></div>
      </article></section>
    </div>
  </div>;
}