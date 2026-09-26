import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Copy, Loader2, Megaphone, Plus, Puzzle, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import CoverImagePicker from "@/admin/components/CoverImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import {
  archiveRotatingContent,
  duplicateRotatingContent,
  fetchRotatingAdmin,
  saveRotatingContent,
  type RotatingContent,
  type RotatingKind,
  type RotatingStatus,
} from "@/community/v1/rotatingContent";

const schema = z.object({
  tabLabel: z.string().trim().min(2, "יש להזין שם לטאב").max(30, "עד 30 תווים"),
  title: z.string().trim().min(2, "יש להזין כותרת").max(120, "עד 120 תווים"),
  body: z.string().trim().min(2, "יש להזין תוכן"),
});

const localValue = (iso: string | null | undefined) => {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const statusLabel = (item: RotatingContent) => {
  if (item.status === "archived") return "הוסר";
  if (item.status === "draft") return "טיוטה";
  const now = Date.now();
  if (item.starts_at && new Date(item.starts_at).getTime() > now) return "מתוזמן";
  if (item.ends_at && new Date(item.ends_at).getTime() <= now) return "פג תוקף";
  return "מוצג עכשיו";
};

const emptyForm = {
  id: null as string | null,
  kind: "announcement" as RotatingKind,
  tabLabel: "חדש בליבה",
  title: "",
  body: "",
  coverImage: null as string | null,
  status: "draft" as RotatingStatus,
  startsAt: "",
  endsAt: "",
  config: {} as Record<string, unknown>,
};

const quizOptions = (config: Record<string, unknown>) => {
  const options = Array.isArray(config.options) ? config.options : [];
  return ["א", "ב", "ג", "ד"].map((id) => {
    const found = options.find((option) => typeof option === "object" && option !== null && "id" in option && option.id === id);
    return { id, text: found && "text" in found && typeof found.text === "string" ? found.text : "" };
  });
};

export default function AdminRotatingContent() {
  const [items, setItems] = useState<RotatingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchRotatingAdmin());
    } catch {
      toast.error("לא הצלחנו לטעון את התוכן המתחלף");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()),
    [items],
  );

  const edit = (item: RotatingContent) => {
    setForm({
      id: item.id,
      kind: item.kind,
      tabLabel: item.tab_label,
      title: item.title,
      body: item.body,
      coverImage: item.cover_image,
      status: item.status ?? "draft",
      startsAt: localValue(item.starts_at),
      endsAt: localValue(item.ends_at),
      config: item.config ?? {},
    });
    setOpen(true);
  };

  const chooseDuration = (days: number) => {
    const start = form.startsAt ? new Date(form.startsAt) : new Date();
    const end = new Date(start.getTime() + days * 86_400_000);
    setForm((current) => ({ ...current, startsAt: localValue(start.toISOString()), endsAt: localValue(end.toISOString()) }));
  };

  const save = async (status: RotatingStatus) => {
    const valid = schema.safeParse(form);
    if (!valid.success) return toast.error(valid.error.issues[0]?.message ?? "יש להשלים את הפרטים");
    if (status === "published" && (!form.startsAt || !form.endsAt)) return toast.error("יש לבחור זמן התחלה וסיום");
    setSaving(true);
    try {
      await saveRotatingContent({
        id: form.id,
        kind: form.kind,
        tabLabel: valid.data.tabLabel,
        title: valid.data.title,
        body: valid.data.body,
        coverImage: form.coverImage,
        status,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        config: form.config,
      });
      toast.success(status === "published" ? "הפרסום נשמר ויוצג בזמן שנבחר" : "הטיוטה נשמרה");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "השמירה לא הושלמה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-medium"><Megaphone className="h-5 w-5 text-primary" />תוכן מתחלף בליבה</h1>
          <p className="mt-1 text-sm text-muted-foreground">פרסומים וחידות שמופיעים זמנית בראש הפיד ונעלמים אוטומטית.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpen(true); }}><Plus className="me-1.5 h-4 w-4" />פרסום חדש</Button>
      </div>

      {loading ? (
        <p className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></p>
      ) : (
        <div className="space-y-3">
          {sorted.map((item) => (
            <article key={item.id} className="rounded-lg border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                    {item.kind === "quiz" ? <Puzzle className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-medium text-foreground">{item.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.kind === "quiz" ? "תבנית חידה" : "פרסום / אירוע"} · {statusLabel(item)}
                      {item.starts_at && item.ends_at ? ` · ${new Date(item.starts_at).toLocaleString("he-IL")}–${new Date(item.ends_at).toLocaleString("he-IL")}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(item)}>עריכה</Button>
                  <Button size="sm" variant="outline" onClick={async () => { await duplicateRotatingContent(item.id); toast.success("נוצר עותק כטיוטה"); await load(); }}><Copy className="me-1 h-3.5 w-3.5" />שכפול</Button>
                  {item.status !== "archived" && <Button size="sm" variant="ghost" onClick={async () => { await archiveRotatingContent(item.id); toast.success("הוסר מהתצוגה"); await load(); }}><Archive className="me-1 h-3.5 w-3.5" />הסרה</Button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ResponsiveDialog open={open} onOpenChange={setOpen} desktopContentClassName="max-w-2xl" mobileContentClassName="h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)]">
        <div className="px-5 pb-28 pt-4 md:px-8 md:pb-8" dir="rtl">
          <div className="mb-5 pe-10">
            <h2 className="text-xl font-medium">{form.id ? "עריכת תוכן" : "פרסום חדש"}</h2>
            <p className="text-sm text-muted-foreground">אפשר לשמור כטיוטה או לפרסם לזמן מוגדר.</p>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">סוג
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as RotatingKind })} disabled={form.kind === "quiz"} className="h-10 w-full rounded-md border bg-background px-3">
                  <option value="announcement">פרסום / אירוע</option><option value="quiz">חידה</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">שם קצר בטאב<Input maxLength={30} value={form.tabLabel} onChange={(e) => setForm({ ...form, tabLabel: e.target.value })} /></label>
            </div>
            <label className="block space-y-1 text-sm">אפקט בטאב (כדי שישימו לב)
              <select
                value={typeof form.config.tab_effect === "string" ? form.config.tab_effect : form.kind === "quiz" ? "eyes" : "heart"}
                onChange={(e) => setForm({ ...form, config: { ...form.config, tab_effect: e.target.value } })}
                className="h-10 w-full rounded-md border bg-background px-3"
              >
                <option value="heart">לב ליבה פועם</option>
                <option value="eyes">עיניים מצמצות</option>
                <option value="none">בלי אפקט</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">כותרת<Input maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label className="block space-y-1 text-sm">תוכן<Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
            {form.kind === "quiz" && (
              <div className="space-y-3 rounded-md border border-border/70 p-4">
                <p className="text-sm font-medium">אפשרויות החידה</p>
                {quizOptions(form.config).map((option) => (
                  <label key={option.id} className="grid gap-2 text-sm md:grid-cols-[2rem_1fr] md:items-start">
                    <span className="pt-2 font-medium">{option.id}</span>
                    <Textarea
                      rows={3}
                      value={option.text}
                      onChange={(e) => {
                        const options = quizOptions(form.config).map((current) => current.id === option.id ? { ...current, text: e.target.value } : current);
                        setForm({ ...form, config: { ...form.config, options } });
                      }}
                    />
                  </label>
                ))}
                <label className="block max-w-40 space-y-1 text-sm">התשובה הנכונה
                  <select
                    value={typeof form.config.correct_answer === "string" ? form.config.correct_answer : "ג"}
                    onChange={(e) => setForm({ ...form, config: { ...form.config, correct_answer: e.target.value } })}
                    className="h-10 w-full rounded-md border bg-background px-3"
                  >
                    {["א", "ב", "ג", "ד"].map((id) => <option key={id} value={id}>{id}</option>)}
                  </select>
                </label>
              </div>
            )}
            {form.kind === "announcement" && <div><p className="mb-1 text-sm">תמונת קאבר</p><CoverImagePicker value={form.coverImage} onChange={(coverImage) => setForm({ ...form, coverImage })} aiContext={`${form.title}\n${form.body}`} contentType="event" /></div>}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">התחלה<Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
              <label className="space-y-1 text-sm">סיום<Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label>
            </div>
            <div className="flex flex-wrap gap-2"><span className="self-center text-xs text-muted-foreground">משך מההתחלה:</span>{[1,2,3,7].map((days) => <Button key={days} type="button" size="sm" variant="outline" onClick={() => chooseDuration(days)}>{days === 1 ? "יום" : days === 2 ? "יומיים" : `${days} ימים`}</Button>)}</div>
          </div>
          <div className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-end gap-2 border-t bg-background/95 px-5 py-3 backdrop-blur md:static md:mt-7 md:border-0 md:bg-transparent md:px-0 md:py-0">
            <Button variant="outline" disabled={saving} onClick={() => void save("draft")}>שמירה כטיוטה</Button>
            <Button disabled={saving} onClick={() => void save("published")}>{saving && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}פרסום</Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}