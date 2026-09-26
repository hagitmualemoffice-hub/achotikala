import { useState } from "react";
import { ArrowRight, Loader2, Minus, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LISTING_TYPES, TYPE_META, type Listing, type ListingType } from "./types";

export type WizardValues = {
  listing_type: ListingType;
  title: string;
  city: string;
  area: string;
  price: string;
  entry_date: string;
  description: string;
  phone: string;
  email: string;
  current_women: number;
  seeking_count: number;
  total_women: number;
  private_room: boolean;
  sublet_from: string;
  sublet_to: string;
  max_roommates: number;
};

const empty = (t: ListingType): WizardValues => ({
  listing_type: t,
  title: "",
  city: "",
  area: "",
  price: "",
  entry_date: "",
  description: "",
  phone: "",
  email: "",
  current_women: 2,
  seeking_count: 1,
  total_women: 3,
  private_room: true,
  sublet_from: "",
  sublet_to: "",
  max_roommates: 3,
});

export const listingToValues = (l: Listing): WizardValues => ({
  ...empty((l.listing_type as ListingType) ?? "seeking_apartment"),
  title: l.title ?? "",
  city: l.city ?? "",
  area: l.area ?? "",
  price: l.price != null ? String(l.price) : "",
  entry_date: l.entry_date ?? "",
  description: l.description ?? "",
  phone: l.phone ?? "",
  email: l.email ?? "",
  current_women: l.current_women ?? 2,
  seeking_count: l.seeking_count ?? 1,
  total_women: l.total_women ?? 3,
  private_room: l.private_room ?? true,
  sublet_from: l.sublet_from ?? "",
  sublet_to: l.sublet_to ?? "",
  max_roommates: l.max_roommates ?? 3,
});

const Stepper = ({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) => (
  <div className="flex items-center justify-between rounded-2xl bg-card border border-border/60 px-4 py-3">
    <span className="text-sm">{label}</span>
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="פחות"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-8 w-8 rounded-full bg-card border grid place-items-center hover:bg-accent"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center font-medium">{value}</span>
      <button
        type="button"
        aria-label="עוד"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-8 w-8 rounded-full bg-card border grid place-items-center hover:bg-accent"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);

const Chips = ({
  options,
  value,
  onChange,
}: {
  options: { value: number; label: string }[];
  value: number;
  onChange: (n: number) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={cn(
          "rounded-full px-4 py-2 text-sm border transition-colors",
          value === o.value
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card hover:bg-accent border-border",
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const ListingWizard = ({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** provided when editing an existing listing */
  initial?: WizardValues;
  onSubmit: (v: WizardValues) => Promise<boolean>;
}) => {
  const [values, setValues] = useState<WizardValues | null>(initial ?? null);
  const [saving, setSaving] = useState(false);
  const editing = !!initial;
  const v = values;
  const set = (patch: Partial<WizardValues>) => setValues((cur) => (cur ? { ...cur, ...patch } : cur));

  const close = (o: boolean) => {
    if (!o) setValues(initial ?? null);
    onOpenChange(o);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v) return;
    if (!v.city.trim()) {
      toast.error("נא למלא עיר");
      return;
    }
    if (!v.phone.trim() && !v.email.trim()) {
      toast.error("יש להשאיר לפחות דרך אחת ליצירת קשר.");
      return;
    }
    setSaving(true);
    const ok = await onSubmit(v);
    setSaving(false);
    if (ok) close(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={close}
      mobileContentClassName="h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto" dir="rtl">
        {!v ? (
          <div className="px-10 md:px-14 py-11 md:py-14">
            <h2 className="text-xl font-medium text-center">מה את רוצה לפרסם?</h2>
            <p className="text-sm text-muted-foreground text-center mt-2">
              בחרי סוג מודעה ונמשיך לטופס קצר
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {LISTING_TYPES.map((t) => {
                const meta = TYPE_META[t];
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setValues(empty(t))}
                    className="text-right rounded-[24px] border border-border/70 bg-card p-5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] transition-all"
                  >
                    <span
                      className={`h-12 w-12 rounded-2xl grid place-items-center ring-1 ${meta.chip} ${meta.ring}`}
                    >
                      <Icon className="h-6 w-6" strokeWidth={1.6} />
                    </span>
                    <div className="mt-3 font-medium leading-snug">{meta.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{meta.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6 px-5 pb-24 pt-5 md:px-14 md:py-12">
            <div className="flex items-center gap-2">
              {!editing && (
                <button
                  type="button"
                  onClick={() => setValues(null)}
                  className="text-muted-foreground hover:text-primary"
                  aria-label="חזרה לבחירת סוג"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
              <h2 className="text-lg font-medium">{TYPE_META[v.listing_type].label}</h2>
            </div>

            <div className="rounded-2xl bg-accent/70 text-accent-foreground text-sm px-4 py-3 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
              המודעה תפורסם למשך שבועיים. בסיום התקופה תוכלי לחדש אותה במידת הצורך.
            </div>

            {/* type specific */}
            {v.listing_type === "roommate_wanted" && (
              <div className="space-y-2.5">
                <Stepper
                  label="כמה בנות גרות בדירה כרגע"
                  value={v.current_women}
                  onChange={(n) => set({ current_women: n })}
                />
                <Stepper
                  label="כמה שותפות מחפשות"
                  value={v.seeking_count}
                  onChange={(n) => set({ seeking_count: n })}
                />
                <Stepper
                  label="כמה בנות יהיו בדירה בסך הכול"
                  value={v.total_women}
                  onChange={(n) => set({ total_women: n })}
                />
              </div>
            )}

            {v.listing_type === "building_new" && (
              <div className="space-y-2.5">
                <Stepper
                  label="כמה שותפות את מחפשת"
                  value={v.seeking_count}
                  onChange={(n) => set({ seeking_count: n })}
                />
                <Stepper
                  label="עד כמה בנות בדירה בסך הכול"
                  value={v.total_women}
                  onChange={(n) => set({ total_women: n })}
                />
              </div>
            )}

            {v.listing_type === "sublet" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="w-from">מתאריך</Label>
                    <Input
                      id="w-from"
                      type="date"
                      value={v.sublet_from}
                      onChange={(e) => set({ sublet_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="w-to">עד תאריך</Label>
                    <Input
                      id="w-to"
                      type="date"
                      value={v.sublet_to}
                      onChange={(e) => set({ sublet_to: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>סוג החדר</Label>
                  <div className="flex gap-2">
                    {[
                      { val: true, label: "חדר פרטי" },
                      { val: false, label: "שיתוף חדר" },
                    ].map((o) => (
                      <button
                        key={String(o.val)}
                        type="button"
                        onClick={() => set({ private_room: o.val })}
                        className={cn(
                          "flex-1 rounded-2xl px-4 py-2.5 text-sm border transition-colors",
                          v.private_room === o.val
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card hover:bg-accent border-border",
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Stepper
                  label="כמה בנות בדירה בתקופת הסאבלט"
                  value={v.total_women}
                  onChange={(n) => set({ total_women: n })}
                />
              </div>
            )}

            {v.listing_type === "seeking_apartment" && (
              <div className="space-y-2">
                <Label>עד כמה שותפות את פתוחה שיהיו בדירה</Label>
                <Chips
                  value={v.max_roommates}
                  onChange={(n) => set({ max_roommates: n })}
                  options={[
                    { value: 2, label: "עד 2" },
                    { value: 3, label: "עד 3" },
                    { value: 4, label: "עד 4" },
                    { value: 5, label: "5 ומעלה" },
                    { value: 0, label: "לא משנה לי" },
                  ]}
                />
              </div>
            )}

            {/* shared */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="w-city">עיר</Label>
                <Input
                  id="w-city"
                  value={v.city}
                  onChange={(e) => set({ city: e.target.value })}
                  placeholder="ירושלים"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-area">אזור / שכונה</Label>
                <Input
                  id="w-area"
                  value={v.area}
                  onChange={(e) => set({ area: e.target.value })}
                  placeholder="נחלאות"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-price">
                  {v.listing_type === "seeking_apartment" ? "תקציב לחודש" : "מחיר לחודש"}
                </Label>
                <Input
                  id="w-price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={v.price}
                  onChange={(e) => set({ price: e.target.value })}
                  placeholder="2500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-entry">תאריך כניסה</Label>
                <Input
                  id="w-entry"
                  type="date"
                  value={v.entry_date}
                  onChange={(e) => set({ entry_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="w-title">כותרת קצרה (לא חובה)</Label>
              <Input
                id="w-title"
                value={v.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="דירה מוארת בנחלאות"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="w-desc">תיאור קצר</Label>
              <Textarea
                id="w-desc"
                rows={3}
                value={v.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="כמה מילים על הדירה, האווירה ומה חשוב לך"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="w-phone">טלפון</Label>
                <Input
                  id="w-phone"
                  dir="ltr"
                  inputMode="tel"
                  value={v.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-email">מייל</Label>
                <Input
                  id="w-email"
                  dir="ltr"
                  type="email"
                  value={v.email}
                  onChange={(e) => set({ email: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">יש להשאיר לפחות דרך אחת ליצירת קשר.</p>

            <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border/60 bg-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_hsl(var(--foreground)/0.06)] md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
              <Button type="submit" className="h-12 w-full rounded-full bg-primary font-light text-primary-foreground shadow-md shadow-primary/20 hover:bg-[hsl(var(--primary-glow))]" disabled={saving}>
                {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {editing ? "שמירת השינויים" : "פרסום המודעה"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </ResponsiveDialog>
  );
};

export default ListingWizard;
