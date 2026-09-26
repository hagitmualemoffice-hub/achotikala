import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { syncOfflineContent } from "@/admin/lib/offlineSync";
import { Loader2, Save, ArrowRight, LayoutTemplate, Upload, Eye } from "lucide-react";
import CoverImagePicker from "@/admin/components/CoverImagePicker";
import { uploadToMedia } from "@/admin/lib/media";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const MECHOLELOT_LOGO_URL = "/__l5e/assets-v1/c55f08c4-64dd-4c6a-af41-247164517830/mecholelot-kehila.png";
import levHairLogo from "@/assets/lev-hair-logo.png.asset.json";
const LEV_HAIR_LOGO_URL = levHairLogo.url;
const LEV_HAIR_LOGO_ALT = "מנהל קהילתי לב העיר";

const empty = {
  title: "", description: "", event_date: "", end_date: "", event_time: "", end_time: "",
  hebrew_date: "", location: "", city: "", cover_image: null as string | null,
  capacity: "", early_price: "", regular_price: "", early_price_deadline: "",
  registration_type: "tickchak", registration_url: "", registration_email: "",
  registration_whatsapp: "", registration_label: "",
  tag: "", featured: false, status: "draft", registration_status: "open",
  event_type: "" as "" | "meeting" | "event" | "workshop" | "save_the_date",
  menu: "",
  partner_logo_url: "",
  partner_logo_alt: "",
  partner_mecholelot: false,
  poster_fit: "cover" as "cover" | "contain",
  poster_pos_x: 50,
  poster_pos_y: 50,
  poster_scale: 100,
};


type State = typeof empty;

export default function AdminEventEditor() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const templateId = search.get("template");
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [ev, setEv] = useState<State>(empty);
  const [loading, setLoading] = useState(!isNew || !!templateId);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("event_templates").select("id,name").order("name")
      .then(({ data }) => setTemplates(data ?? []));
  }, []);

  useEffect(() => {
    (async () => {
      if (isNew && templateId) {
        const { data } = await supabase.from("event_templates").select("*").eq("id", templateId).single();
        if (data) {
          const d = (data.defaults ?? {}) as Partial<State>;
          setEv({ ...empty, ...d, cover_image: data.cover_image ?? null });
        }
        setLoading(false);
        return;
      }
      if (isNew) { setLoading(false); return; }
      const { data, error } = await supabase.from("events_db").select("*").eq("id", id!).single();
      if (error) toast.error(error.message);
      else if (data) {
        const r = (data.registration ?? {}) as Record<string, string>;
        const pLogo = (data as unknown as { partner_logo?: { url?: string; alt?: string } | null }).partner_logo;
        const isMecholelot = pLogo?.url === MECHOLELOT_LOGO_URL;
        setEv({
          title: data.title, description: data.description ?? "",
          event_date: data.event_date,
          end_date: (data as { end_date?: string | null }).end_date ?? "",
          event_time: data.event_time ?? "",
          end_time: data.end_time ?? "", hebrew_date: data.hebrew_date ?? "",
          location: data.location ?? "", city: data.city ?? "",
          cover_image: data.cover_image, capacity: data.capacity?.toString() ?? "",
          early_price: data.early_price?.toString() ?? "",
          regular_price: data.regular_price?.toString() ?? "",
          early_price_deadline: data.early_price_deadline ?? "",
          registration_type: r.type ?? "tickchak",
          registration_url: r.url ?? "",
          registration_email: r.email ?? "",
          registration_whatsapp: r.whatsapp ?? "",
          registration_label: r.label ?? "",
          tag: data.tag ?? "", featured: data.featured ?? false,
          status: data.status,
          registration_status: (data as { registration_status?: string }).registration_status ?? "open",
          event_type: ((data as { event_type?: string }).event_type ?? "") as "" | "meeting" | "event" | "workshop" | "save_the_date",
          menu: (data as { menu?: string }).menu ?? "",
          partner_logo_url: pLogo?.url ?? "",
          partner_logo_alt: pLogo?.alt ?? "",
          partner_mecholelot: isMecholelot,
          poster_fit: ((data as { poster_style?: { objectFit?: "cover" | "contain" } }).poster_style?.objectFit ?? "cover"),
          poster_pos_x: (data as { poster_style?: { positionX?: number } }).poster_style?.positionX ?? 50,
          poster_pos_y: (data as { poster_style?: { positionY?: number } }).poster_style?.positionY ?? 50,
          poster_scale: (data as { poster_style?: { scale?: number } }).poster_style?.scale ?? 100,
        });

      }
      setLoading(false);
    })();
  }, [id, isNew, templateId]);

  const buildPayload = () => {
    const logoUrl = ev.partner_mecholelot ? MECHOLELOT_LOGO_URL : ev.partner_logo_url.trim();
    const logoAlt = ev.partner_mecholelot ? "מחוללות קהילה" : ev.partner_logo_alt.trim();
    return {
      title: ev.title.trim(),
      description: ev.description || null,
      event_date: ev.event_date,
      end_date: ev.end_date || null,
      event_time: ev.event_time || null,
      end_time: ev.end_time || null,
      hebrew_date: ev.hebrew_date || null,
      location: ev.location || null,
      city: ev.city || null,
      cover_image: ev.cover_image,
      capacity: ev.capacity ? parseInt(ev.capacity) : null,
      early_price: ev.early_price ? parseFloat(ev.early_price) : null,
      regular_price: ev.regular_price ? parseFloat(ev.regular_price) : null,
      early_price_deadline: ev.early_price_deadline || null,
      registration: {
        type: ev.registration_type,
        ...(ev.registration_url && { url: ev.registration_url }),
        ...(ev.registration_email && { email: ev.registration_email }),
        ...(ev.registration_whatsapp && { whatsapp: ev.registration_whatsapp }),
        ...(ev.registration_label && { label: ev.registration_label }),
      },
      tag: ev.tag || null,
      featured: ev.featured,
      status: ev.status,
      registration_status: ev.registration_status,
      event_type: ev.event_type || null,
      menu: ev.menu || null,
      partner_logo: logoUrl ? { url: logoUrl, alt: logoAlt || "לוגו שותף" } : null,
      poster_style: ev.event_type === "save_the_date" ? {
        objectFit: ev.poster_fit,
        positionX: ev.poster_pos_x,
        positionY: ev.poster_pos_y,
        scale: ev.poster_scale,
      } : null,
    };
  };


  const save = async (statusOverride?: string) => {
    if (!ev.title || !ev.event_date) return toast.error("חסרים כותרת ותאריך");
    setSaving(true);
    try {
      const payload = { ...buildPayload(), ...(statusOverride && { status: statusOverride }) };
      if (isNew) {
        const { data, error } = await supabase.from("events_db").insert(payload).select("id").single();
        if (error) throw error;
        toast.success("נוצר");
        void syncOfflineContent();
        navigate(`/admin/events/${data.id}`, { replace: true });
      } else {
        const { error } = await supabase.from("events_db").update(payload).eq("id", id!);
        if (error) throw error;
        toast.success("נשמר");
        void syncOfflineContent();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally { setSaving(false); }
  };

  const saveAsTemplate = async () => {
    const name = prompt("שם התבנית:");
    if (!name) return;
    const { registration_type, ...rest } = ev;
    const { error } = await supabase.from("event_templates").insert({
      name,
      cover_image: ev.cover_image,
      defaults: { ...rest, registration_type },
    });
    if (error) return toast.error(error.message);
    toast.success("נשמרה כתבנית");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { url } = await uploadToMedia(file, file.name, ev.partner_logo_alt || "לוגו שותף");
      setEv({ ...ev, partner_logo_url: url });
      toast.success("הלוגו הועלה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהעלאת לוגו");
    } finally {
      setUploadingLogo(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const aiContext = `${ev.title} - ${ev.description}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/events")}>
            <ArrowRight className="h-4 w-4 me-1" />חזרה
          </Button>
          <h1 className="text-xl font-medium">{isNew ? "אירוע חדש" : "עריכת אירוע"}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href="/?preview=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium border border-primary/30"
          >
            <Eye className="h-4 w-4" />
            <span>תצוגה מקדימה</span>
          </a>
          {isNew && templates.length > 0 && (
            <Select onValueChange={(v) => navigate(`/admin/events/new?template=${v}`)}>
              <SelectTrigger className="w-48">
                <LayoutTemplate className="h-4 w-4 me-1" />
                <SelectValue placeholder="טעינה מתבנית" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={saveAsTemplate}>שמירה כתבנית</Button>
          <Button variant="outline" onClick={() => save("draft")} disabled={saving}>טיוטה</Button>
          <Button onClick={() => save("published")} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
            <Save className="h-4 w-4 me-1" />פרסום
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Field label="כותרת"><Input value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} /></Field>
          <Field label="תיאור"><Textarea rows={6} value={ev.description} onChange={(e) => setEv({ ...ev, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="תאריך"><Input type="date" value={ev.event_date} onChange={(e) => setEv({ ...ev, event_date: e.target.value })} /></Field>
            <Field label="תאריך סיום (אירוע רב־יומי, אופציונלי)"><Input type="date" value={ev.end_date} onChange={(e) => setEv({ ...ev, end_date: e.target.value })} /></Field>
            <Field label="תאריך עברי"><Input value={ev.hebrew_date} onChange={(e) => setEv({ ...ev, hebrew_date: e.target.value })} placeholder='ה" באב' /></Field>
            <Field label="שעת התחלה"><Input value={ev.event_time} onChange={(e) => setEv({ ...ev, event_time: e.target.value })} placeholder="19:30" /></Field>
            <Field label="שעת סיום"><Input value={ev.end_time} onChange={(e) => setEv({ ...ev, end_time: e.target.value })} placeholder="22:00" /></Field>
            <Field label="מיקום"><Input value={ev.location} onChange={(e) => setEv({ ...ev, location: e.target.value })} /></Field>
            <Field label="עיר"><Input value={ev.city} onChange={(e) => setEv({ ...ev, city: e.target.value })} /></Field>
            <Field label="קיבולת"><Input type="number" value={ev.capacity} onChange={(e) => setEv({ ...ev, capacity: e.target.value })} /></Field>
            <Field label="תג (למשל 'סדנה השבוע')"><Input value={ev.tag} onChange={(e) => setEv({ ...ev, tag: e.target.value })} /></Field>
            <Field label="מחיר רגיל"><Input type="number" value={ev.regular_price} onChange={(e) => setEv({ ...ev, regular_price: e.target.value })} /></Field>
            <Field label="מחיר מוקדם"><Input type="number" value={ev.early_price} onChange={(e) => setEv({ ...ev, early_price: e.target.value })} /></Field>
            <Field label="דדליין מחיר מוקדם"><Input type="date" value={ev.early_price_deadline} onChange={(e) => setEv({ ...ev, early_price_deadline: e.target.value })} /></Field>
          </div>
          <Field label="כיבוד / מה להביא">
            <Input value={ev.menu} onChange={(e) => setEv({ ...ev, menu: e.target.value })} placeholder="קפה ונשנוש" />
          </Field>


          <div className="bg-background border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">הרשמה</h3>
            <Field label="סוג">
              <Select value={ev.registration_type} onValueChange={(v) => setEv({ ...ev, registration_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tickchak">טיקצ׳אק</SelectItem>
                  <SelectItem value="email">מייל</SelectItem>
                  <SelectItem value="whatsapp">וואטסאפ</SelectItem>
                  <SelectItem value="external">קישור חיצוני</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {(ev.registration_type === "tickchak" || ev.registration_type === "external") && (
              <Field label="URL"><Input dir="ltr" value={ev.registration_url} onChange={(e) => setEv({ ...ev, registration_url: e.target.value })} /></Field>
            )}
            {ev.registration_type === "email" && (
              <Field label="כתובת מייל"><Input dir="ltr" value={ev.registration_email} onChange={(e) => setEv({ ...ev, registration_email: e.target.value })} /></Field>
            )}
            {ev.registration_type === "whatsapp" && (
              <Field label="מספר וואטסאפ"><Input dir="ltr" value={ev.registration_whatsapp} onChange={(e) => setEv({ ...ev, registration_whatsapp: e.target.value })} /></Field>
            )}
            <Field label="תווית לכפתור"><Input value={ev.registration_label} onChange={(e) => setEv({ ...ev, registration_label: e.target.value })} placeholder="להרשמה" /></Field>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-background border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">תמונת קאבר</h3>
            <CoverImagePicker
              value={ev.cover_image}
              onChange={(url) => setEv({ ...ev, cover_image: url })}
              aiContext={aiContext}
              contentType="event"
            />
          </div>
          <div className="bg-background border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">סוג</h3>
            <Select
              value={ev.event_type || "none"}
              onValueChange={(v) => setEv({ ...ev, event_type: (v === "none" ? "" : v) as "" | "meeting" | "event" | "workshop" | "save_the_date" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                <SelectItem value="meeting">מפגש</SelectItem>
                <SelectItem value="event">אירוע</SelectItem>
                <SelectItem value="workshop">סדנה</SelectItem>
                <SelectItem value="save_the_date">Save the Date (שמרו תאריך)</SelectItem>
              </SelectContent>
            </Select>
            {ev.event_type === "save_the_date" && (
              <p className="text-xs text-muted-foreground">
                כרטיס מצומצם: רק תאריך, כותרת ותיאור. בלי מחירים / כפתור הרשמה. מומלץ להגדיר מצב הרשמה: טרם נפתחה.
              </p>
            )}
          </div>
          {ev.event_type === "save_the_date" && (
            <div className="bg-background border rounded-lg p-4 space-y-4">
              <div>
                <h3 className="font-medium text-sm">מיקום וחיתוך פוסטר</h3>
                <p className="text-xs text-muted-foreground mt-1">שליטה על אופן הצגת תמונת ה-Save the Date בכרטיס.</p>
              </div>

              {/* Live preview */}
              {ev.cover_image && (
                <div className="rounded-lg overflow-hidden border bg-white" style={{ aspectRatio: "16 / 9" }}>
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${ev.cover_image})`,
                      backgroundSize: ev.poster_fit === "contain"
                        ? `${ev.poster_scale}% auto`
                        : (ev.poster_scale === 100 ? "cover" : `${ev.poster_scale}% auto`),
                      backgroundPosition: `${ev.poster_pos_x}% ${ev.poster_pos_y}%`,
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">אופן חיתוך</Label>
                <Select value={ev.poster_fit} onValueChange={(v) => setEv({ ...ev, poster_fit: v as "cover" | "contain" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">מילוי מלא (חיתוך אפשרי)</SelectItem>
                    <SelectItem value="contain">כל התמונה נראית (עם רווח לבן)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <Label>מיקום אופקי</Label>
                  <span className="text-muted-foreground">{ev.poster_pos_x}%</span>
                </div>
                <Slider min={0} max={100} step={1} value={[ev.poster_pos_x]}
                  onValueChange={([v]) => setEv({ ...ev, poster_pos_x: v })} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <Label>מיקום אנכי</Label>
                  <span className="text-muted-foreground">{ev.poster_pos_y}%</span>
                </div>
                <Slider min={0} max={100} step={1} value={[ev.poster_pos_y]}
                  onValueChange={([v]) => setEv({ ...ev, poster_pos_y: v })} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <Label>זום</Label>
                  <span className="text-muted-foreground">{ev.poster_scale}%</span>
                </div>
                <Slider min={50} max={300} step={5} value={[ev.poster_scale]}
                  onValueChange={([v]) => setEv({ ...ev, poster_scale: v })} />
              </div>

              <Button type="button" variant="ghost" size="sm"
                onClick={() => setEv({ ...ev, poster_fit: "cover", poster_pos_x: 50, poster_pos_y: 50, poster_scale: 100 })}>
                איפוס
              </Button>
            </div>
          )}
          <div className="bg-background border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">מצב הרשמה</h3>
            <Select value={ev.registration_status} onValueChange={(v) => setEv({ ...ev, registration_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">פתוחה</SelectItem>
                <SelectItem value="not_open">טרם נפתחה (אירוע עתידי)</SelectItem>
                <SelectItem value="closed_full">סגורה - האירוע מלא</SelectItem>
                <SelectItem value="closed">סגורה</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              דדליין רישום מוקדם: אם לא צוין, מוגדר אוטומטית לחצות שלפני יום האירוע.
            </p>
          </div>
          <div className="bg-background border rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">מומלץ (Featured)</div>
              <div className="text-xs text-muted-foreground">להצגה מובלטת</div>
            </div>
            <Switch checked={ev.featured} onCheckedChange={(v) => setEv({ ...ev, featured: v })} />
          </div>
          <div className="bg-background border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">לוגו שותף על המודעה</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">מחוללות קהילה</div>
                <div className="text-xs text-muted-foreground">להציג את לוגו מחוללות קהילה</div>
              </div>
              <Switch
                checked={ev.partner_mecholelot}
                onCheckedChange={(v) => setEv({
                  ...ev,
                  partner_mecholelot: v,
                  partner_logo_url: v ? MECHOLELOT_LOGO_URL : (ev.partner_logo_url === MECHOLELOT_LOGO_URL ? "" : ev.partner_logo_url),
                  partner_logo_alt: v ? "מחוללות קהילה" : (ev.partner_logo_alt === "מחוללות קהילה" ? "" : ev.partner_logo_alt),
                })}
              />
            </div>
            {!ev.partner_mecholelot && (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEv({ ...ev, partner_logo_url: LEV_HAIR_LOGO_URL, partner_logo_alt: LEV_HAIR_LOGO_ALT })}
                  >
                    <img src={LEV_HAIR_LOGO_URL} alt="" className="h-5 w-auto me-2" />
                    מנהל קהילתי לב העיר
                  </Button>
                </div>
                <Field label="URL לוגו (או השאר ריק)">
                  <div className="flex gap-2">
                    <Input
                      dir="ltr"
                      value={ev.partner_logo_url}
                      onChange={(e) => setEv({ ...ev, partner_logo_url: e.target.value })}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => logoFileRef.current?.click()}
                      disabled={uploadingLogo}
                      title="העלאת לוגו מהמחשב"
                    >
                      {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                </Field>
                <Field label="תיאור לוגו (alt)">
                  <Input
                    value={ev.partner_logo_alt}
                    onChange={(e) => setEv({ ...ev, partner_logo_alt: e.target.value })}
                    placeholder="שם השותף"
                  />
                </Field>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </>
            )}
            {ev.partner_logo_url && !ev.partner_mecholelot && (
              <div className="pt-2 border-t">
                <img src={ev.partner_logo_url} alt={ev.partner_logo_alt} className="h-8 w-auto object-contain" />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
