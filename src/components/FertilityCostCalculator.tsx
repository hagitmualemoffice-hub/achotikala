import { useMemo, useState } from "react";
import { Plus, Trash2, Calculator, Heart, Scale, Check, Crown, Sparkles, TrendingDown, ShieldPlus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  KUPOT,
  MEDICATIONS,
  PROTOCOLS,
  HOSPITALS_DATA,
  MEDICAL_FUNDING,
  BASKET_LIMITS,
  getMedication,
  computeProcedureFee,
  isAgeEligible,
  type ProtocolItem,
  type InsurancePlan,
} from "@/data/fertilityPricing";

const fmt = (n: number) =>
  new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(Math.round(n));

const FertilityCostCalculator = () => {
  const [medicalFunding, setMedicalFunding] = useState(false);
  const [age, setAge] = useState<number | "">(38);
  const [kupahId, setKupahId] = useState<string>("clalit");
  const [planId, setPlanId] = useState<string>("platinum");
  const [hospitalId, setHospitalId] = useState<string>("ein-kerem");
  const [mode, setMode] = useState<"protocol" | "custom">("protocol");
  const [protocolId, setProtocolId] = useState<string>("pergoveris-38");
  const [items, setItems] = useState<ProtocolItem[]>(
    PROTOCOLS.find((p) => p.id === "pergoveris-38")!.items.map((i) => ({ ...i })),
  );

  const kupah = KUPOT.find((k) => k.id === kupahId)!;
  const basePlan = kupah.plans.find((p) => p.id === planId) ?? kupah.plans[0];
  const hospital = HOSPITALS_DATA.find((h) => h.id === hospitalId) ?? HOSPITALS_DATA[0];
  const numericAge = typeof age === "number" ? age : undefined;
  const eligibleForBase = isAgeEligible(basePlan, numericAge);

  // אם פעיל מימון רפואי - מבטל את חישובי הקופה. אם לא זכאית בגיל זה - מחירים לפי "אחר"
  const effectivePlan: InsurancePlan = eligibleForBase
    ? basePlan
    : (kupah.plans.find((p) => p.id === "other") ?? basePlan);
  const effectiveDiscount = medicalFunding ? MEDICAL_FUNDING.medicationDiscount : effectivePlan.medicationDiscount;
  const effectiveProcedureFee = medicalFunding ? MEDICAL_FUNDING.procedureFee : computeProcedureFee(effectivePlan, hospital);
  const puahApplied = !medicalFunding && !!(effectivePlan.allowsPuahDiscount && hospital.puahDiscountPrice);

  const handleKupahChange = (id: string) => {
    setKupahId(id);
    const k = KUPOT.find((x) => x.id === id)!;
    const best = [...k.plans].sort((a, b) => b.medicationDiscount - a.medicationDiscount)[0];
    setPlanId(best.id);
  };

  const handleProtocolChange = (id: string) => {
    setProtocolId(id);
    const p = PROTOCOLS.find((x) => x.id === id)!;
    setItems(p.items.map((i) => ({ ...i })));
  };

  const updateQty = (idx: number, q: number) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(0, q) } : it)));

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const addItem = (medId: string) =>
    setItems((prev) => [...prev, { medId, quantity: 1 }]);

  const breakdown = useMemo(() => {
    const rows = items.map((it) => {
      const med = getMedication(it.medId);
      const fullTotal = med.fullPrice * it.quantity;
      const afterDiscount = fullTotal * (1 - effectiveDiscount);
      return { ...it, med, fullTotal, afterDiscount };
    });
    const medsFull = rows.reduce((s, r) => s + r.fullTotal, 0);
    const medsAfter = rows.reduce((s, r) => s + r.afterDiscount, 0);
    const total = medsAfter + effectiveProcedureFee;
    return { rows, medsFull, medsAfter, total };
  }, [items, effectiveDiscount, effectiveProcedureFee]);

  // השוואה בין קופות לפי רמת ביטוח מקבילה - בלי מימון רפואי
  const isPremiumTier = basePlan.medicationDiscount > 0;
  const comparison = useMemo(() => {
    if (medicalFunding) return [];
    return KUPOT.map((k) => {
      const preferred = isPremiumTier
        ? [...k.plans].sort((a, b) => b.medicationDiscount - a.medicationDiscount)[0]
        : k.plans.find((p) => p.id === "other") ?? k.plans[k.plans.length - 1];
      const eligible = isAgeEligible(preferred, numericAge);
      // אם לא זכאית בגיל הנתון לרמה המורחבת - נחזור ל"אחר" (מחיר מלא)
      const equivalent = eligible
        ? preferred
        : (k.plans.find((p) => p.id === "other") ?? preferred);
      const medsAfter = breakdown.medsFull * (1 - equivalent.medicationDiscount);
      const fee = computeProcedureFee(equivalent, hospital);
      const total = medsAfter + fee;
      const isCurrent = k.id === kupah.id && equivalent.id === effectivePlan.id;
      const diff = total - breakdown.total;
      return { kupah: k, plan: equivalent, preferred, eligible, medsAfter, fee, total, isCurrent, diff };
    }).sort((a, b) => a.total - b.total);
  }, [breakdown, kupah, effectivePlan, isPremiumTier, hospital, medicalFunding, numericAge]);

  return (
    <section
      id="calculator"
      className="relative w-full pt-[3.9rem] pb-[3.25rem] md:pt-[6.5rem] md:pb-16 px-[42px] md:px-6 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/40 blur-3xl" />
      </div>

      <div className="w-full md:w-[min(1000px,72%)] mx-auto" dir="rtl">
        <div className="text-right mb-6 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-3 border border-primary/15">
            <Calculator className="w-4 h-4" />
            <span className="text-xs md:text-sm font-medium tracking-wider">
              מחשבון עלות אישי
            </span>
          </div>
          <h2 className="text-foreground text-[1.75rem] md:text-5xl font-light leading-tight mb-2 md:mb-3">
            כמה זה <span className="text-primary font-normal">באמת</span> יעלה לך?
          </h2>
          <p className="text-foreground/70 text-sm md:text-lg font-light">
            הזיני את פרטי הביטוח והפרוטוקול, וקבלי הערכת עלות לסבב שימור פוריות.
          </p>
        </div>

        {/* פאנל מימון רפואי - נפרד למעלה */}
        <div
          className={`mb-5 rounded-2xl border-2 transition-all overflow-hidden ${
            medicalFunding
              ? "border-emerald-400/60 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-[0_10px_30px_-15px_rgba(16,185,129,0.4)]"
              : "border-dashed border-emerald-300/50 bg-emerald-50/30 hover:bg-emerald-50/60"
          }`}
        >
          <label className="flex items-start gap-3 p-4 md:p-5 cursor-pointer">
            <input
              type="checkbox"
              checked={medicalFunding}
              onChange={(e) => setMedicalFunding(e.target.checked)}
              className="mt-1 w-5 h-5 accent-emerald-600 cursor-pointer shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ShieldPlus className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-semibold text-emerald-900 text-sm md:text-base">
                  יש לי מימון רפואי
                </span>
                <span className="text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  מסלול נפרד
                </span>
              </div>
              <p className="text-xs md:text-sm text-emerald-900/80 leading-relaxed">
                {MEDICAL_FUNDING.description}
              </p>
              <p className="text-[11px] md:text-xs text-emerald-800/70 mt-1.5">
                ℹ️ {MEDICAL_FUNDING.eligibilityNote}
              </p>
            </div>
          </label>
        </div>

        <Card className="p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-[0_25px_60px_-25px_hsl(343_58%_58%/0.25)] border-primary/10 bg-gradient-to-br from-card via-card to-accent/20">
          {/* גיל - לבדיקת זכאות */}
          <div className={`mb-5 transition-opacity ${medicalFunding ? "opacity-50 pointer-events-none" : ""}`}>
            <Field label="הגיל שלך (לבדיקת זכאות למימון)">
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={18}
                  max={50}
                  value={age}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAge(v === "" ? "" : Number(v));
                  }}
                  className="w-24 h-10 text-center text-base"
                />
                <p className="text-[11px] md:text-xs text-foreground/60 leading-relaxed flex-1">
                  טווח הגיל למימון משתנה בין הקופות: כללית 30-37, מכבי 31-38, מאוחדת ולאומית 30-41.
                </p>
              </div>
            </Field>
          </div>

          {/* בחירות בסיסיות */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-6 transition-opacity ${medicalFunding ? "opacity-50 pointer-events-none" : ""}`}>
            <Field label="קופת חולים">
              <Select value={kupahId} onValueChange={handleKupahChange} disabled={medicalFunding}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KUPOT.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="רמת ביטוח">
              <Select value={planId} onValueChange={setPlanId} disabled={medicalFunding}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {kupah.plans.map((p) => {
                    const ok = isAgeEligible(p, numericAge);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}{!ok ? " - לא זכאית בגיל זה" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>

            <Field label="בית חולים">
              <Select value={hospitalId} onValueChange={setHospitalId} disabled={medicalFunding}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOSPITALS_DATA.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} - {fmt(h.fullPrice)} ₪
                      {h.puahDiscountPrice ? ` (דרך פועה ${fmt(h.puahDiscountPrice)} ₪)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hospital.puahDiscountPrice && (
                <p className="text-[11px] text-primary/80 mt-1.5 leading-relaxed">
                  ℹ️ ב{hospital.name} המחיר המלא הוא <strong>{fmt(hospital.fullPrice)} ₪</strong>. דרך
                  מכון פועה אפשר לקבל הנחה ולשלם <strong>{fmt(hospital.puahDiscountPrice)} ₪</strong> בלבד -
                  רק כשמשלמים מחיר מלא (ללא מימון של הקופה, אין כפל מבצעים).
                </p>
              )}
              {hospital.affiliatedKupah === kupahId && (
                <p className="text-[11px] text-primary/80 mt-1.5 leading-relaxed">
                  ℹ️ {hospital.name} הוא בית חולים בהסדר של {kupah.name}.
                </p>
              )}
            </Field>
          </div>

          {/* אזהרת אי-זכאות לפי גיל */}
          {!medicalFunding && !eligibleForBase && basePlan.ageEligibility && (
            <div className="mb-5 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-[12px] md:text-sm text-amber-900 leading-relaxed">
              <strong className="font-semibold">שימי לב:</strong> בגיל {numericAge} את לא זכאית למימון ב{basePlan.label}
              {" "}(טווח הזכאות: {basePlan.ageEligibility.min}-{basePlan.ageEligibility.max}).
              החישוב למטה משתמש ב{effectivePlan.label} (מחיר מלא). אם רוב הקופות לא ממנות בגיל הזה -
              כדאי לבדוק את <strong>מאוחדת שיא</strong> או <strong>לאומית זהב</strong> שמכסות 30-41.
            </div>
          )}

          {/* פרטי המסלול וההגבלות */}
          {!medicalFunding && <PlanDetails plan={basePlan} />}
          {!medicalFunding && !eligibleForBase && basePlan.id !== effectivePlan.id && (
            <PlanDetails plan={effectivePlan} />
          )}

          {/* פרוטוקול */}
          <div className="mb-2 mt-6">
            <p className="text-sm font-medium text-foreground mb-3">פרוטוקול תרופות</p>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "protocol" | "custom")}>
              <TabsList className="grid grid-cols-2 w-full md:w-auto">
                <TabsTrigger value="protocol">פרוטוקול טיפוסי</TabsTrigger>
                <TabsTrigger value="custom">תרופות מדויקות</TabsTrigger>
              </TabsList>

              <TabsContent value="protocol" className="mt-4">
                <Select value={protocolId} onValueChange={handleProtocolChange}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROTOCOLS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-foreground/60 mt-2">
                  ניתן לערוך כמויות או להוסיף תרופות בטבלה למטה.
                </p>
              </TabsContent>

              <TabsContent value="custom" className="mt-4">
                <p className="text-xs text-foreground/60">
                  התחילי מטבלה ריקה והוסיפי תרופות לפי המרשם שלך.
                </p>
                {items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setItems([])}
                    className="mt-2 text-foreground/60"
                  >
                    נקי טבלה
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* טבלת תרופות - עם מחיר מלא ואחרי הנחה לכל שורה */}
          <div className="mt-4 border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 md:px-4 py-2.5 bg-accent/40 text-[11px] md:text-sm font-medium text-foreground/70">
              <div className="col-span-3 md:col-span-5">תרופה</div>
              <div className="col-span-3 md:col-span-2 text-center">כמות</div>
              <div className="col-span-3 md:col-span-2 text-center">מחיר מלא</div>
              <div className="col-span-3 md:col-span-2 text-center">אחרי הנחה</div>
              <div className="col-span-0 md:col-span-1"></div>
            </div>

            {breakdown.rows.length === 0 && (
              <div className="px-4 py-8 text-center text-foreground/50 text-sm">
                אין תרופות. הוסיפי תרופה למטה ↓
              </div>
            )}

            {breakdown.rows.map((row, idx) => {
              const discounted = effectiveDiscount > 0;
              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center px-3 md:px-4 py-2.5 border-t border-border text-[11px] md:text-sm"
                >
                  <div className="col-span-3 md:col-span-5 truncate">
                    <div className="font-medium text-foreground/90 truncate">{row.med.name}</div>
                    <div className="text-[10px] text-foreground/50">{fmt(row.med.fullPrice)} ₪ ליחידה</div>
                  </div>
                  <div className="col-span-3 md:col-span-2 text-center">
                    <Input
                      type="number"
                      min={0}
                      value={row.quantity}
                      onChange={(e) => updateQty(idx, Number(e.target.value))}
                      className="h-8 text-center text-sm md:text-xs px-1 w-full"
                    />
                  </div>
                  <div className={`col-span-3 md:col-span-2 text-center ${discounted ? "text-foreground/45 line-through" : "text-foreground/80 font-medium"}`}>
                    {fmt(row.fullTotal)} ₪
                  </div>
                  <div className="col-span-3 md:col-span-2 text-center">
                    <span className={`font-semibold ${discounted ? "text-primary" : "text-foreground"}`}>
                      {fmt(row.afterDiscount)} ₪
                    </span>
                  </div>
                  <div className="hidden md:flex md:col-span-1 justify-center">
                    <button
                      onClick={() => removeItem(idx)}
                      aria-label="מחק"
                      className="text-foreground/40 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="border-t border-border p-3 md:p-4 bg-accent/20">
              <Select value="" onValueChange={(v) => v && addItem(v)}>
                <SelectTrigger className="h-9 text-xs md:text-sm">
                  <div className="flex items-center gap-2 text-foreground/70">
                    <Plus className="w-4 h-4" />
                    <span>הוסיפי תרופה</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {MEDICATIONS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} - {fmt(m.fullPrice)} ₪
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* סיכום */}
          <div
            className="mt-6 relative rounded-2xl overflow-hidden text-primary-foreground p-5 md:p-7 shadow-[0_20px_50px_-20px_hsl(343_58%_58%/0.55)]"
            style={{
              background: medicalFunding
                ? "linear-gradient(90deg, hsl(160 60% 45%) 0%, hsl(175 60% 42%) 100%)"
                : "linear-gradient(90deg, hsl(5 79% 74%) 0%, hsl(354 76% 74%) 25%, hsl(344 75% 72%) 50%, hsl(335 75% 70%) 75%, hsl(326 75% 69%) 100%)",
            }}
          >
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-end">
              <div className="space-y-1.5 text-sm md:text-[15px]">
                <SumRow label="מחיר תרופות מלא" value={`${fmt(breakdown.medsFull)} ₪`} muted />
                <SumRow
                  label={`אחרי הנחה (${Math.round(effectiveDiscount * 100)}%)`}
                  value={`${fmt(breakdown.medsAfter)} ₪`}
                />
                <SumRow
                  label={
                    medicalFunding
                      ? "עלות תהליך - חינם דרך מימון רפואי"
                      : basePlan.useHospitalPrice
                        ? `עלות תהליך ב${hospital.name}${puahApplied ? " (דרך מכון פועה)" : ""}`
                        : "השתתפות עצמית בתהליך"
                  }
                  value={effectiveProcedureFee > 0 ? `${fmt(effectiveProcedureFee)} ₪` : "חינם"}
                />
              </div>
              <div className="text-right md:text-left border-t md:border-t-0 md:border-r border-white/25 pt-4 md:pt-0 md:pr-6">
                <div className="text-[11px] md:text-xs uppercase tracking-widest text-primary-foreground/80 mb-1">
                  סה״כ מוערך לסבב
                </div>
                <div className="text-3xl md:text-5xl font-light leading-none">
                  {fmt(breakdown.total)}
                  <span className="text-xl md:text-2xl mr-1 opacity-80">₪</span>
                </div>
              </div>
            </div>
            {!medicalFunding && kupah.contact && (
              <p className="relative text-[11px] md:text-xs text-primary-foreground/80 mt-4 pt-3 border-t border-white/20">
                לפרטים מדויקים: {kupah.contact}
              </p>
            )}
          </div>

          {/* השוואה בין קופות - רק כשלא במימון רפואי */}
          {!medicalFunding && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-semibold text-foreground leading-tight">
                      השוואה בין קופות
                    </p>
                    <p className="text-[11px] text-foreground/55">
                      {isPremiumTier ? "רמת ביטוח מורחבת" : "ללא ביטוח משלים"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {comparison.map((c, idx) => {
                  const isCheapest = idx === 0;
                  return (
                    <div
                      key={c.kupah.id}
                      className={`relative rounded-2xl border p-4 md:p-5 transition-all ${
                        c.isCurrent
                          ? "border-primary/40 bg-primary/[0.06] shadow-[0_8px_24px_-12px_hsl(343_58%_58%/0.4)]"
                          : isCheapest
                            ? "border-primary/25 bg-gradient-to-br from-accent/40 to-card hover:shadow-[0_8px_24px_-12px_hsl(343_58%_58%/0.3)]"
                            : "border-border bg-card/60 hover:border-primary/20"
                      }`}
                    >
                      {isCheapest && !c.isCurrent && (
                        <div className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium shadow-sm">
                          <Crown className="w-3 h-3" />
                          הכי משתלם
                        </div>
                      )}
                      {c.isCurrent && (
                        <div className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground text-background text-[10px] font-medium shadow-sm">
                          <Check className="w-3 h-3" />
                          הביטוח שלי
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">{c.kupah.name}</div>
                          <div className="text-[11px] text-foreground/55 truncate">
                            {c.plan.label}
                            {!c.eligible && c.preferred.id !== c.plan.id && (
                              <span className="text-amber-700"> · לא זכאית בגיל {numericAge} ל{c.preferred.label}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <div className="text-xl md:text-2xl font-semibold text-foreground leading-none">
                            {fmt(c.total)} ₪
                          </div>
                          {!c.isCurrent && (
                            <div
                              className={`text-[11px] mt-1 inline-flex items-center gap-0.5 ${
                                c.diff < 0 ? "text-primary font-medium" : "text-foreground/40"
                              }`}
                            >
                              {c.diff < 0 ? (
                                <>
                                  <TrendingDown className="w-3 h-3" />
                                  חיסכון {fmt(-c.diff)} ₪
                                </>
                              ) : (
                                `+${fmt(c.diff)} ₪`
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] md:text-xs text-foreground/65 pt-3 border-t border-border/60">
                        <span>תרופות: <strong className="text-foreground/85 font-medium">{fmt(c.medsAfter)} ₪</strong></span>
                        <span className="w-px h-3 bg-border" />
                        <span>תהליך: <strong className="text-foreground/85 font-medium">{c.fee > 0 ? `${fmt(c.fee)} ₪` : "חינם"}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] md:text-xs text-foreground/55 mt-3 leading-relaxed">
                * עלות הסבב בלאומית ובקופות ללא השתתפות עצמית קבועה תלויה במחיר בית החולים.
                לגבי אכשרה: שנה ברמת ביטוח גבוהה בכל קופה - במעבר בין קופות ניתן לקבל מימון מיידית.
                מימון רפואי הוא מסלול נפרד למי שזכאית.
              </p>
            </div>
          )}

          {/* הצעה לחיסכון - ההכי משתלם - לא כולל מימון רפואי */}
          {!medicalFunding && (() => {
            const cheapest = comparison[0];
            if (!cheapest || cheapest.isCurrent || cheapest.diff >= -50) return null;
            const saving = -cheapest.diff;
            return (
              <div className="mt-8">
                <div
                  className="relative rounded-3xl overflow-hidden p-[2px] shadow-[0_25px_60px_-25px_hsl(343_58%_58%/0.55)]"
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(5 79% 74%) 0%, hsl(354 76% 74%) 25%, hsl(344 75% 72%) 50%, hsl(335 75% 70%) 75%, hsl(326 75% 69%) 100%)",
                  }}
                >
                  <div className="relative rounded-[calc(1.5rem-2px)] bg-card p-5 md:p-7 overflow-hidden">
                    <div
                      className="absolute -top-16 -left-16 w-48 h-48 rounded-full opacity-30 blur-3xl pointer-events-none"
                      style={{ background: "linear-gradient(90deg, hsl(5 79% 74%), hsl(326 75% 69%))" }}
                    />
                    <div className="relative flex items-center gap-2 mb-4">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
                        style={{ background: "linear-gradient(135deg, hsl(5 79% 74%), hsl(326 75% 69%))" }}
                      >
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] md:text-xs uppercase tracking-widest text-foreground/55 leading-none mb-1">
                          הצעה לחיסכון
                        </p>
                        <p className="text-sm md:text-base font-semibold text-foreground leading-none">
                          ההכי משתלם בשבילך
                        </p>
                      </div>
                    </div>

                    <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-end">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium mb-2">
                          <Crown className="w-3 h-3" />
                          {cheapest.kupah.name} · {cheapest.plan.label}
                        </div>
                        <p className="text-sm md:text-[15px] text-foreground/75 leading-relaxed">
                          סבב דומה ב{cheapest.kupah.name} ברמת <strong className="text-foreground font-semibold">{cheapest.plan.label}</strong> צפוי לעלות{" "}
                          <strong className="text-foreground font-semibold">{fmt(cheapest.total)} ₪</strong> - לעומת {fmt(breakdown.total)} ₪ במצב הנוכחי.
                          {cheapest.plan.note && <span className="block text-[12px] text-foreground/55 mt-1.5">{cheapest.plan.note}</span>}
                          <span className="block text-[11px] text-foreground/50 mt-1.5">שימי לב לתקופת אכשרה ולעלות הסבב בבית החולים.</span>
                        </p>
                      </div>
                      <div className="text-right md:text-left border-t md:border-t-0 md:border-r border-border pt-4 md:pt-0 md:pr-6 shrink-0">
                        <div className="text-[11px] md:text-xs uppercase tracking-widest text-foreground/55 mb-1">
                          חיסכון לסבב
                        </div>
                        <div
                          className="text-3xl md:text-5xl font-light leading-none bg-clip-text text-transparent"
                          style={{ backgroundImage: "linear-gradient(90deg, hsl(5 79% 64%) 0%, hsl(326 75% 59%) 100%)" }}
                        >
                          {fmt(saving)}
                          <span className="text-xl md:text-2xl mr-1 opacity-80">₪</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* מסגרת סל הבריאות */}
          <div className="mt-6 rounded-xl border border-border/70 bg-accent/20 p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-foreground/60 mt-0.5 shrink-0" />
              <div className="text-[12px] md:text-xs text-foreground/70 leading-relaxed">
                <strong className="text-foreground/85">מסגרת סל הבריאות לשימור פוריות חברתי:</strong>{" "}
                {BASKET_LIMITS.ageRange} · {BASKET_LIMITS.maxCycles} · {BASKET_LIMITS.maxEggs}.
                קופות מסוימות מציעות מסלולים מורחבים (למשל מאוחדת שיא - עד 6 סבבים / 30 ביציות).
              </div>
            </div>
          </div>

          <p className="text-[11px] md:text-xs text-foreground/50 mt-4 leading-relaxed flex gap-2">
            <Heart className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
            המידע במחשבון נועד להערכה כללית בלבד. המחירים ותנאי הזכאות עשויים להשתנות, ולכן חשוב לבדוק את הנתונים העדכניים מול קופת החולים ובית החולים לפני תחילת התהליך. אין לראות במידע ייעוץ רפואי, משפטי או ביטוחי.
          </p>
        </Card>
      </div>
    </section>
  );
};

const PlanDetails = ({ plan }: { plan: InsurancePlan }) => {
  if (!plan.limits && !plan.note) return null;
  const l = plan.limits;
  return (
    <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">פרטים והגבלות במסלול {plan.label}</p>
      </div>
      {plan.note && <p className="text-[12px] md:text-sm text-foreground/75 mb-2">{plan.note}</p>}
      {l && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[12px] md:text-[13px] text-foreground/75">
          {l.ageRange && <li><strong className="text-foreground/85">גילאים:</strong> {l.ageRange}</li>}
          {l.maxCycles && <li><strong className="text-foreground/85">סבבים:</strong> {l.maxCycles}</li>}
          {l.maxEggs && <li><strong className="text-foreground/85">ביציות:</strong> {l.maxEggs}</li>}
          {l.qualifyingPeriod && <li><strong className="text-foreground/85">אכשרה:</strong> {l.qualifyingPeriod}</li>}
          {l.hospitals && <li className="md:col-span-2"><strong className="text-foreground/85">בתי חולים:</strong> {l.hospitals}</li>}
          {l.other?.map((o, i) => (
            <li key={i} className="md:col-span-2">• {o}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs md:text-sm font-medium text-foreground/70 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const SumRow = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className={muted ? "text-primary-foreground/55" : "text-primary-foreground/85"}>
      {label}
    </span>
    <span className={muted ? "text-primary-foreground/55 line-through" : "text-primary-foreground font-medium"}>
      {value}
    </span>
  </div>
);

export default FertilityCostCalculator;
