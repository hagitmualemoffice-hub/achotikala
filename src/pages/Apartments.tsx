import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Home,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LibaHeaderActions from "@/community/v1/LibaHeaderActions";
import LibaTopBar from "@/community/v1/LibaTopBar";
import logo from "@/assets/logo-achoti-kala.png";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCommunitySession } from "@/community/useCommunitySession";
import { cn } from "@/lib/utils";
import AuthDialog from "@/apartments/AuthDialog";
import { signInWithGoogle } from "@/apartments/googleSignIn";
import ListingCard from "@/apartments/ListingCard";
import { fetchSavedListingIds, toggleSavedListing } from "@/apartments/saved";
import ListingDetail from "@/apartments/ListingDetail";
import ListingWizard, { listingToValues, type WizardValues } from "@/apartments/ListingWizard";
import AccessGate, { type AccessState } from "@/apartments/AccessGate";
import { cachedGrant, rememberGrant } from "@/community/v1/accessMemo";
import {
  LISTING_DAYS,
  LISTING_TYPES,
  TYPE_META,
  daysLeft,
  fmtDate,
  typeMeta,
  type Listing,
  type ListingType,
} from "@/apartments/types";

/** כפתור משני אחיד לכל האתר */
const PILL_IDLE =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-light text-foreground transition-colors hover:border-primary/40 hover:text-primary";
const PILL_ACTIVE = "border-primary/40 bg-primary/[0.12] text-primary hover:bg-primary/[0.12] hover:text-primary";


type Filters = {
  type: ListingType | "all";
  city: string;
  area: string;
  minPrice: string;
  maxPrice: string;
  entryBefore: string;
  women: number | null;
};

const emptyFilters: Filters = {
  type: "all",
  city: "",
  area: "",
  minPrice: "",
  maxPrice: "",
  entryBefore: "",
  women: null,
};

const num = (s: string) => (s.trim() === "" ? null : Number(s));

const Apartments = () => {
  const { session, displayName, loading: sessionLoading } = useCommunitySession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"choose" | "code">("choose");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [detail, setDetail] = useState<Listing | null>(null);
  const [mineOpen, setMineOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Listing | null>(null);
  const [wantsPublish, setWantsPublish] = useState(
    () => typeof sessionStorage !== "undefined" && sessionStorage.getItem("ap-wants-publish") === "1",
  );
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  /* she was already let in during this visit — no need to make her wait again */
  const [access, setAccess] = useState<AccessState>(
    cachedGrant<boolean>("dirot") ? "granted" : "loading",
  );
  const [accessCheck, setAccessCheck] = useState(0);

  const userId = session?.user?.id ?? null;
  const authorName =
    (session?.user?.user_metadata?.full_name as string | undefined) ||
    displayName ||
    session?.user?.email ||
    "חברה בקהילה";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("apartment_listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOffline(false);
      setListings((data ?? []) as Listing[]);
    } catch {
      setOffline(true);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** ההרשאה נבדקת בשרת; המסך רק נגזר ממנה. */
  useEffect(() => {
    // אין להציג "אין הרשאה" לפני שהחיבור הקיים נטען
    if (sessionLoading && !userId) {
      setAccess("loading");
      return;
    }
    if (!userId) {
      rememberGrant("dirot", null);
      setAccess("anon");
      setListings([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (!cachedGrant<boolean>("dirot")) setAccess("loading");
    supabase
      .rpc("my_apartment_access")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          const netErr = /fetch|network|failed to fetch/i.test(error.message);
          setOffline(netErr);
          if (!cachedGrant<boolean>("dirot")) setAccess(netErr ? "offline" : "denied");
        } else {
          setOffline(false);
          rememberGrant("dirot", data ? true : null);
          setAccess(data ? "granted" : "denied");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId, accessCheck, sessionLoading]);

  useEffect(() => {
    if (access === "granted") void load();
  }, [load, access]);

  /** אילו מודעות היא שמרה לאזור האישי */
  useEffect(() => {
    if (access !== "granted" || !userId) return;
    let cancelled = false;
    fetchSavedListingIds()
      .then((ids) => {
        if (!cancelled) setSavedIds(ids);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [access, userId]);

  const toggleSave = async (id: string) => {
    const was = savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (was) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      await toggleSavedListing(id, was);
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (was) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  };

  /** Keep the pending-publish intent across a possible full-page sign-in round-trip. */
  useEffect(() => {
    try {
      if (wantsPublish) sessionStorage.setItem("ap-wants-publish", "1");
      else sessionStorage.removeItem("ap-wants-publish");
    } catch {
      /* storage unavailable */
    }
  }, [wantsPublish]);

  /** Resume the publish flow right after a successful sign-in. */
  useEffect(() => {
    if (access === "granted" && wantsPublish) {
      setWantsPublish(false);
      setAuthOpen(false);
      setEditing(null);
      setWizardOpen(true);
    }
  }, [access, wantsPublish]);

  const active = useMemo(
    () =>
      listings.filter(
        (l) => l.status === "active" && new Date(l.expires_at).getTime() > Date.now(),
      ),
    [listings],
  );

  const mine = useMemo(
    () => (userId ? listings.filter((l) => l.author_id === userId) : []),
    [listings, userId],
  );

  const visible = useMemo(() => {
    const min = num(filters.minPrice);
    const max = num(filters.maxPrice);
    return active.filter((l) => {
      if (filters.type !== "all" && l.listing_type !== filters.type) return false;
      if (filters.city && !(l.city ?? "").includes(filters.city.trim())) return false;
      if (filters.area && !(l.area ?? "").includes(filters.area.trim())) return false;
      if (min != null && (l.price ?? 0) < min) return false;
      if (max != null && l.price != null && l.price > max) return false;
      if (filters.entryBefore && l.entry_date && l.entry_date > filters.entryBefore) return false;
      if (filters.women != null) {
        const size = l.total_women ?? l.max_roommates ?? l.current_women ?? 0;
        if (filters.women >= 5 ? size < 5 : size !== filters.women) return false;
      }
      return true;
    });
  }, [active, filters]);

  const filtersActive = JSON.stringify(filters) !== JSON.stringify(emptyFilters);

  const startPublish = () => {
    if (!userId) {
      setWantsPublish(true);
      setAuthOpen(true);
      return;
    }
    setEditing(null);
    setWizardOpen(true);
  };

  const saveListing = async (v: WizardValues) => {
    if (!userId) return false;
    const payload = {
      author_id: userId,
      author_name: authorName,
      listing_type: v.listing_type,
      title: v.title.trim() || null,
      city: v.city.trim() || null,
      area: v.area.trim() || null,
      price: v.price.trim() === "" ? null : Number(v.price),
      entry_date: v.entry_date || null,
      description: v.description.trim() || null,
      phone: v.phone.trim() || null,
      email: v.email.trim() || null,
      current_women: v.listing_type === "roommate_wanted" ? v.current_women : null,
      seeking_count:
        v.listing_type === "roommate_wanted" || v.listing_type === "building_new"
          ? v.seeking_count
          : null,
      total_women: v.listing_type === "seeking_apartment" ? null : v.total_women,
      private_room: v.listing_type === "sublet" ? v.private_room : null,
      sublet_from: v.listing_type === "sublet" ? v.sublet_from || null : null,
      sublet_to: v.listing_type === "sublet" ? v.sublet_to || null : null,
      max_roommates: v.listing_type === "seeking_apartment" ? v.max_roommates || null : null,
    };
    try {
      if (editing) {
        const { error } = await supabase
          .from("apartment_listings")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("המודעה עודכנה");
      } else {
        const { data: created, error } = await supabase
          .from("apartment_listings")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        toast.success(`המודעה פורסמה ותהיה פעילה ${LISTING_DAYS} ימים`);
        if (created?.id) {
          // שליחת מייל לחברות שביקשו התראה על דירות חדשות — לא חוסם את הפרסום
          supabase.functions
            .invoke("apartment-notify", { body: { listingId: created.id } })
            .catch(() => {});
        }
      }
      setEditing(null);
      await load();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        /fetch|network/i.test(msg) ? "פרסום מודעה זמין כשיש חיבור לרשת." : "שמירת המודעה נכשלה",
      );
      return false;
    }
  };

  const closeListing = async (l: Listing) => {
    const { error } = await supabase
      .from("apartment_listings")
      .update({ status: l.status === "closed" ? "active" : "closed" })
      .eq("id", l.id);
    if (error) return toast.error("העדכון נכשל");
    toast.success(l.status === "closed" ? "המודעה חזרה ללוח" : "המודעה סומנה כנסגרה");
    void load();
  };

  const removeListing = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("apartment_listings").delete().eq("id", toDelete.id);
    setToDelete(null);
    if (error) return toast.error("המחיקה נכשלה");
    toast.success("המודעה נמחקה");
    void load();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0" dir="rtl">
      <LibaTopBar
        active="dirot"
        actions={
          access === "granted" ? (
            <LibaHeaderActions
              me={{ displayName: displayName || "חברה" }}
              onSignOut={() => supabase.auth.signOut()}
            />
          ) : undefined
        }
      />

      {/* כותרת הדף — בסגנון ליבה, מכווצת בטלפון */}
      <section className="mx-auto max-w-[1400px] px-4 pt-3 md:px-6 md:pt-8">
        <div className="flex flex-row items-center justify-between gap-2 md:items-end md:gap-4">
          <div className="min-w-0">
            <h1 className="text-[19px] font-light leading-[1.2] text-foreground md:text-[34px]">לוח דירות</h1>
            <p className="mt-1.5 hidden max-w-2xl text-[14.5px] font-light leading-relaxed text-muted-foreground md:block">
              דירות, שותפות ובית שמחכה לך. הלוח פתוח לחברות הקהילה - מזמינות אותך לחפש, וגם לפרסם בשביל אחרות.
            </p>
          </div>
          {access === "granted" && (
            <div className="flex items-center gap-2">
              <Button onClick={startPublish} className="hidden h-9 shrink-0 rounded-full px-5 text-[13px] font-light lg:inline-flex">
                <Plus className="h-4 w-4 me-1.5" />
                פרסמי מודעה
              </Button>
              <button type="button" className={PILL_IDLE} onClick={() => setMineOpen(true)}>
                המודעות שלי
                {mine.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 text-[11px] text-primary">{mine.length}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </section>




      {access !== "granted" ? (
        <AccessGate
          state={access}
          onSignIn={async (m) => {
            if (m === "google") {
              try {
                const done = await signInWithGoogle("/liba/dirot");
                if (done) setAccessCheck((n) => n + 1);
              } catch {
                toast.error("ההתחברות דרך Google לא הושלמה. אפשר להתחבר עם קוד לאימייל.");
              }
              return;
            }
            setAuthMode(m === "code" ? "code" : "choose");
            setAuthOpen(true);
          }}
          onRetry={() => setAccessCheck((n) => n + 1)}
          requestTitle="בקשת גישה ללוח הדירות"
        />
      ) : (
        <>
      {/* כפתור פרסום צף במובייל */}
      <button
        type="button"
        onClick={startPublish}
        aria-label="פרסמי מודעה"
        className="fixed bottom-20 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* filters */}
      <section className="mx-auto max-w-[1400px] px-4 pt-3 md:px-6 md:pt-5">
        <div className="flex items-center gap-2">
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, type: "all" }))}
              className={cn(PILL_IDLE, "shrink-0", filters.type === "all" && PILL_ACTIVE)}
            >
              הכול
            </button>
            {LISTING_TYPES.map((t) => {
              const Icon = TYPE_META[t].icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, type: t }))}
                  className={cn(PILL_IDLE, "shrink-0", filters.type === t && PILL_ACTIVE)}
                >
                  <Icon className="h-4 w-4" />
                  {TYPE_META[t].short}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={cn(PILL_IDLE, "shrink-0", filtersActive && PILL_ACTIVE)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              סינון
            </button>
          </div>
        </div>
      </section>

      {/* board */}
      <section className="mx-auto max-w-[1400px] px-4 pt-4 pb-10 md:px-6 md:pt-5"><div>
        {offline ? (
          <div className="rounded-[28px] border border-border/70 bg-card p-10 text-center">
            <WifiOff className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">לוח הדירות זמין כשיש חיבור לרשת.</p>
            <Button variant="outline" className="mt-4 rounded-full font-light" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4 me-2" />
              נסי שוב
            </Button>
          </div>
        ) : loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-border bg-card/60 p-10 text-center">
            <Home className="h-8 w-8 mx-auto text-primary/60" />
            <p className="mt-3 text-muted-foreground">
              {filtersActive ? "אין מודעות שמתאימות לסינון" : "עוד אין מודעות בלוח"}
            </p>
            {filtersActive && (
              <Button
                variant="outline"
                className="mt-4 rounded-full font-light"
                onClick={() => setFilters(emptyFilters)}
              >
                ניקוי סינון
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                onOpen={() => setDetail(l)}
                saved={savedIds.has(l.id)}
                onToggleSave={userId ? () => void toggleSave(l.id) : undefined}
              />
            ))}
          </div>
        )}
      </div></section>
        </>
      )}


      {/* filters sheet */}
      <ResponsiveDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        desktopContentClassName="max-w-[480px]"
      >
        <div className="px-7 md:px-9 py-8 md:py-9 space-y-5 overflow-y-auto" dir="rtl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">סינון מודעות</h2>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="סגירה"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-city">עיר</Label>
              <Input
                id="f-city"
                value={filters.city}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-area">אזור</Label>
              <Input
                id="f-area"
                value={filters.area}
                onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-min">מחיר מ־</Label>
              <Input
                id="f-min"
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-max">מחיר עד</Label>
              <Input
                id="f-max"
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-entry">כניסה עד תאריך</Label>
            <Input
              id="f-entry"
              type="date"
              value={filters.entryBefore}
              onChange={(e) => setFilters((f) => ({ ...f, entryBefore: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>מספר בנות בדירה</Label>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({ ...f, women: f.women === n ? null : n }))
                  }
                  className={cn(PILL_IDLE, filters.women === n && PILL_ACTIVE)}
                >
                  {n === 5 ? "5 ומעלה" : n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-3">
            <Button
              className="flex-1 h-12 rounded-full font-light"
              onClick={() => setFiltersOpen(false)}
            >
              הצגת {visible.length} מודעות
            </Button>
            <button type="button" className={PILL_IDLE} onClick={() => setFilters(emptyFilters)}>
              ניקוי
            </button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* my listings */}
      <ResponsiveDialog
        open={mineOpen}
        onOpenChange={setMineOpen}
        desktopContentClassName="max-w-[560px]"
      >
        <div className="px-7 md:px-9 py-8 md:py-9 space-y-4 overflow-y-auto" dir="rtl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">המודעות שלי</h2>
            <button
              type="button"
              onClick={() => setMineOpen(false)}
              aria-label="סגירה"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {mine.length === 0 && (
            <p className="text-sm text-muted-foreground">עוד לא פרסמת מודעות.</p>
          )}
          {mine.map((l) => {
            const expired = new Date(l.expires_at).getTime() <= Date.now();
            const meta = typeMeta(l.listing_type);
            return (
              <div key={l.id} className="rounded-3xl border border-border/70 bg-card p-4">
                <div className="text-[11px] text-primary">{meta.short}</div>
                <div className="font-medium">{l.title?.trim() || meta.label}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {expired
                    ? `פג תוקף ב־${fmtDate(l.expires_at)}`
                    : l.status === "closed"
                      ? "נסגרה"
                      : `נותרו ${daysLeft(l.expires_at)} ימים`}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setEditing(l);
                      setMineOpen(false);
                      setWizardOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 me-1.5" />
                    עריכה
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => void closeListing(l)}
                  >
                    {l.status === "closed" ? "החזרה ללוח" : "סימון כנסגרה"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl text-destructive"
                    onClick={() => setToDelete(l)}
                  >
                    <Trash2 className="h-3.5 w-3.5 me-1.5" />
                    מחיקה
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ResponsiveDialog>

      <ListingDetail
        listing={detail}
        onClose={() => setDetail(null)}
        canManage={!!userId && detail?.author_id === userId}
        onEdit={() => {
          if (!detail) return;
          setEditing(detail);
          setDetail(null);
          setWizardOpen(true);
        }}
        onDelete={() => {
          if (!detail) return;
          setToDelete(detail);
          setDetail(null);
        }}
      />

      <AuthDialog
        initialMode={authMode}
        open={authOpen}
        onOpenChange={(o) => {
          setAuthOpen(o);
          if (!o) setWantsPublish(false);
        }}
      />

      {wizardOpen && (
        <ListingWizard
          open={wizardOpen}
          onOpenChange={(o) => {
            setWizardOpen(o);
            if (!o) setEditing(null);
          }}
          initial={editing ? listingToValues(editing) : undefined}
          onSubmit={saveListing}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את המודעה?</AlertDialogTitle>
            <AlertDialogDescription>הפעולה אינה ניתנת לשחזור.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={() => void removeListing()}>מחיקה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      
    </div>
  );
};

export default Apartments;
