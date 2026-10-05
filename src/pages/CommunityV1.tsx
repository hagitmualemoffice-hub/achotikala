import LibaHeartIcon from "@/community/v1/LibaHeartIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Pin,
  Bookmark,
  Wrench,
  MessageSquareQuote,
  FileSpreadsheet,
  FileText,
  Link2,
  File,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Rows3,
  Loader2,
  ShieldCheck,
  LogOut,
  Heart,
  ChevronDown,
  LayoutGrid,
  Activity,
  Users,
  Plus,
  MessageCircle,
  
} from "lucide-react";
import ResponsiveDialog from "@/components/ResponsiveDialog";
import LibaOnboarding from "@/community/v1/LibaOnboarding";
import QuizCard from "@/community/v1/QuizCard";
import RotatingAnnouncement from "@/community/v1/RotatingAnnouncement";
import { fetchActiveRotatingContent, type RotatingContent } from "@/community/v1/rotatingContent";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import logo from "@/assets/logo-achoti-kala.png";
import { supabase } from "@/integrations/supabase/client";
import AccessGate, { type AccessState } from "@/apartments/AccessGate";
import AuthDialog from "@/apartments/AuthDialog";
import { signInWithGoogle } from "@/apartments/googleSignIn";
import PostCard from "@/community/v1/PostCard";
import NewEventPopup from "@/community/v1/NewEventPopup";
import DailyBaarPromoPopup from "@/community/v1/DailyBaarPromoPopup";
import DailyBaarDialog from "@/community/v1/DailyBaarDialog";
import DailyBaarPreferences from "@/community/v1/DailyBaarPreferences";
import { fetchDailyState } from "@/community/v1/dailyBaar";
import { SPACES, setLibaAdmin, accentBg, accentColor, spaceById, type SpaceId } from "@/community/v1/spaces";
import {
  bootstrap,
  fetchFeed,
  openAttachment,
  recommendTool,
  isOffline,
  touchPresence,
  fileUrl,
  type ApiPost,
  type Bootstrap,
  type SinceLastVisit,
} from "@/community/v1/api";
import { fetchPulseChecks, type PulseCheck } from "@/community/v1/api";
import PulseCheckCard from "@/community/v1/PulseCheckCard";
import { ReinforcementHeart, useReinforce } from "@/community/v1/reinforcement";
import Composer from "@/community/v1/Composer";
import { CompactRow, FeedCard } from "@/community/v1/FeedViews";
import InlineComposer from "@/community/v1/InlineComposer";
import { MasteritStrip } from "@/community/v1/Masterit";
import { emptyPref, fetchSpacePrefs, type SpacePrefsState } from "@/community/v1/spacePrefs";
import AccountSettings, { NamePrompt } from "@/community/v1/AccountSettings";
import { MemberAvatar } from "@/community/v1/Avatar";
import type { CommunityProfile } from "@/community/v1/api";
import { growthMessage, takeLevelGrowth } from "@/community/v1/hearts";
import { markActivitySeen } from "@/community/v1/activity";
import { useCommunitySession } from "@/community/useCommunitySession";
import { cachedGrant, rememberGrant } from "@/community/v1/accessMemo";

import AdminPanel from "@/community/v1/AdminPanel";
import { MemberProfileHost } from "@/community/v1/MemberProfile";
import CommunityAgreementModal from "@/components/CommunityAgreementModal";
import { acceptAgreement } from "@/community/v1/api";
import InquiriesPage from "@/community/v1/InquiriesPage";
import { fetchInquiries, isInquiryNew } from "@/community/v1/inquiries";
import LibaHeaderActions from "@/community/v1/LibaHeaderActions";
import LibaTopBar from "@/community/v1/LibaTopBar";
import LibaPulsePanel from "@/community/v1/LibaPulsePanel";

type Filter = "all" | SpaceId;
type ViewMode = "feed" | "compact";

const VIEW_KEY = "achotikala.community.view";
const PAGE = 20;
const PROFILE_CACHE = "achotikala.community.profile";


const toolIcon = (kind: string) =>
  kind === "excel" ? FileSpreadsheet : kind === "pdf" ? FileText : kind === "link" ? Link2 : File;

/** "מאז שהיית כאן" — turns the server counters into human lines. */
const sinceLines = (s: SinceLastVisit | undefined) => {
  if (!s) return [];
  if (s.first_visit) return [{ key: "first_visit", text: "זו הפעם הראשונה שלך כאן. כל מה שכתוב פה נכתב בשבילך." }];
  const out: { key: string; text: string }[] = [];
  if (s.replies_to_me) out.push({ key: "replies_to_me", text: `${s.replies_to_me} תגובות חדשות למה שכתבת` });
  if (s.in_my_threads) out.push({ key: "in_my_threads", text: `${s.in_my_threads} שיחות שהשתתפת בהן התעוררו מחדש` });
  if (s.new_posts) out.push({ key: "new_posts", text: `${s.new_posts} פוסטים חדשים בקהילה` });
  if (s.hearts_on_my_posts) out.push({ key: "hearts_on_my_posts", text: `${s.hearts_on_my_posts} לבבות למה שכתבת` });
  if (s.me_too_on_my_posts) out.push({ key: "me_too_on_my_posts", text: `${s.me_too_on_my_posts} כתבו לך ״גם אני״` });
  if (s.new_tools) out.push({ key: "new_tools", text: `${s.new_tools} כלים חדשים נוספו למדף` });
  if (out.length === 0) out.push({ key: "quiet", text: "היה כאן שקט מאז הביקור שלך." });
  return out;
};

/** two playful eyes that blink every few seconds — for the quiz chip */
const BlinkingEyes = () => (
  <span className="inline-flex items-center gap-[2.5px]" aria-hidden>
    <style>{`@keyframes liba-blink{0%,88%,100%{transform:scaleY(1)}92%,96%{transform:scaleY(.08)}}`}</style>
    {[0, 1].map((i) => (
      <span
        key={i}
        className="flex h-[13px] w-[10px] items-center justify-center rounded-full bg-card shadow-[inset_0_0_2px_hsl(var(--foreground)/0.15)]"
        style={{ animation: "liba-blink 3.6s ease-in-out infinite", animationDelay: `${i * 0.07}s` }}
      >
        <span className="h-[5px] w-[5px] rounded-full bg-foreground/75" />
      </span>
    ))}
  </span>
);

/** Liba heart that beats with a soft pulse ring — for announcement chips */
const BeatingHeart = () => (
  <span className="relative inline-flex h-[14px] w-[14px] items-center justify-center" aria-hidden>
    <style>{`@keyframes liba-beat{0%,40%,100%{transform:scale(1)}10%,30%{transform:scale(1.28)}20%{transform:scale(1.05)}}@keyframes liba-ring{0%{transform:scale(.6);opacity:.55}70%,100%{transform:scale(2.1);opacity:0}}`}</style>
    <span className="absolute inset-0 rounded-full bg-primary/40" style={{ animation: "liba-ring 1.8s ease-out infinite" }} />
    <LibaHeartIcon className="relative h-[14px] w-[14px]" style={{ animation: "liba-beat 1.8s ease-in-out infinite" }} />
  </span>
);

const tabEffect = (item: { kind: string; config?: Record<string, unknown> | null }) => {
  const v = item.config?.tab_effect;
  if (v === "none" || v === "eyes" || v === "heart") return v;
  return item.kind === "quiz" ? "eyes" : "heart";
};

const CommunityBody = () => {
  const { session, loading: sessionLoading } = useCommunitySession();
  const rememberedBoot = cachedGrant<Bootstrap>("liba");
  const [access, setAccess] = useState<AccessState>(rememberedBoot?.authorized ? "granted" : "loading");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"choose" | "code">("choose");
  const [boot, setBoot] = useState<Bootstrap | null>(rememberedBoot);
  const [reload, setReload] = useState(0);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "compact";
    try {
      return localStorage.getItem(VIEW_KEY) === "feed" ? "feed" : "compact";
    } catch {
      return "compact";
    }
  });
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [pulses, setPulses] = useState<PulseCheck[]>([]);
  /** the dedicated "בדיקת דופק" chip — the only place a pulse-check is shown */
  const [pulseOnly, setPulseOnly] = useState(false);
  const [rotatingItems, setRotatingItems] = useState<RotatingContent[]>([]);
  const [activeRotatingId, setActiveRotatingId] = useState<string | null>(null);
  /** announcement that pops up on entry — shown once per item per device */
  const [popupRotating, setPopupRotating] = useState<RotatingContent | null>(null);
  const quizOnly = rotatingItems.find((item) => item.id === activeRotatingId)?.kind === "quiz";
  const [inquiriesOnly, setInquiriesOnly] = useState(false);
  /** when arriving from the sidebar on a specific בירור, open the list focused on him */
  const [inquiryFocus, setInquiryFocus] = useState("");
  const [spacePrefs, setSpacePrefs] = useState<SpacePrefsState | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (searchParams.get("borerim")) setInquiriesOnly(true);
  }, [searchParams]);
  const [hasNewInquiries, setHasNewInquiries] = useState(false);
  useEffect(() => {
    if (access !== "granted") return;
    let cancelled = false;
    fetchInquiries({ limit: 1 })
      .then((items) => {
        if (cancelled) return;
        setHasNewInquiries(items.length > 0 && isInquiryNew(items[0].created_at));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [access]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* private mode — the choice simply won't persist */
    }
  }, [view]);

  useEffect(() => {
    const handleBack = (event: PopStateEvent) => {
      const state = event.state as { libaPostId?: string } | null;
      setOpenPostId(state?.libaPostId ?? null);
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    };
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, []);

  const openPost = openPostId ? posts.find((p) => p.id === openPostId) ?? null : null;



  const [spacesDrawerOpen, setSpacesDrawerOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSpace, setComposerSpace] = useState<SpaceId>("discussions");
  const [recommended, setRecommended] = useState<ApiPost | null>(null);
  const [recNote, setRecNote] = useState("");
  const [recSending, setRecSending] = useState(false);
  const [sinceOpen, setSinceOpen] = useState(false);
  const [seenSinceKeys, setSeenSinceKeys] = useState<Set<string>>(() => new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  /* ההשתדלות היומית — נפתחת מעצמה פעם ביום כשהכרטיס מחכה */
  const [dailyOpen, setDailyOpen] = useState(false);
  const [dailyPreferencesOpen, setDailyPreferencesOpen] = useState(false);
  const [dailyHidden, setDailyHidden] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const st = await fetchDailyState();
        if (cancelled) return;
        setDailyHidden(!!st.hidden);
        if (!st.authorized || !st.active || st.hidden || st.cadence === "muted" || st.today) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        const dateParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
        const part = (name: string) => dateParts.find((p) => p.type === name)?.value ?? "";
        const today = `${part("year")}-${part("month")}-${part("day")}`;
        const key = `liba:daily-baar-prompt:${user.id}`;
        const previous = localStorage.getItem(key);
        const last = [previous, st.last_shown_date].filter((v): v is string => !!v).sort().at(-1);
        const days = last ? Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${last}T12:00:00Z`)) / 86400000) : Infinity;
        if (days >= (st.cadence === "daily" ? 1 : 2)) {
          localStorage.setItem(key, today);
          setDailyOpen(true);
        }
      } catch { /* the side entry remains available when offline */ }
    }, 2500);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, []);
  const [settingsTab, setSettingsTab] = useState<
    "profile" | "about" | "heart" | "updates" | undefined
  >();
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  // her own details are cached, so the offline folder can still show her name and photo
  const [profile, setProfile] = useState<CommunityProfile | null>(() => {
    try {
      const raw = localStorage.getItem(PROFILE_CACHE);
      return raw ? (JSON.parse(raw) as CommunityProfile) : null;
    } catch {
      return null;
    }
  });
  const [showAllTools, setShowAllTools] = useState(false);
  const feedTop = useRef<HTMLDivElement>(null);
  const reinforce = useReinforce();

  // Composer defaults to the space you're currently viewing (else discussions)
  useEffect(() => {
    if (filter !== "all") setComposerSpace(filter);
  }, [filter]);

  // First-entry community agreement
  useEffect(() => {
    if (boot?.requires_agreement) setAgreementOpen(true);
  }, [boot?.requires_agreement]);

  /* -------------------- membership + sidebar (server) -------------------- */
  useEffect(() => {
    if (sessionLoading) return;
    if (!session?.user) {
      rememberGrant("liba", null);
      setAccess("anon");
      setBoot(null);
      setPosts([]);
      setFeedLoading(false);
      return;
    }
    let cancelled = false;
    if (!cachedGrant<Bootstrap>("liba")) setAccess("loading");
    bootstrap()
      .then((b) => {
        if (cancelled) return;
        setBoot(b);
        setLibaAdmin(!!b?.is_admin);
        rememberGrant("liba", b.authorized ? b : null);
        setAccess(b.authorized ? "granted" : "denied");
      })
      .catch((e) => {
        if (cancelled) return;
        if (!cachedGrant<Bootstrap>("liba")) setAccess(isOffline(e) ? "offline" : "denied");
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, sessionLoading, reload]);

  /* ---- arriving from the avatar menu elsewhere: הגדרות / הלב שלי ---- */
  useEffect(() => {
    if (access !== "granted") return;
    const s = searchParams.get("settings");
    if (!s) return;
    setSettingsTab(
      s === "heart" || s === "about" || s === "updates" || s === "profile" ? s : undefined,
    );
    setSettingsOpen(true);
  }, [access, searchParams]);

  /* --------- arriving from the personal area: open a post / בירורים -------- */
  useEffect(() => {
    if (access !== "granted") return;
    const params = searchParams;
    if (params.get("birurim") === "1") {
      setInquiryFocus(params.get("q") ?? "");
      setInquiriesOnly(true);
      return;
    }
    const pid = params.get("post");
    if (!pid) return;
    setOpenPostId(pid);
    fetchFeed({ limit: 100 })
      .then((all) => {
        const found = all.find((p) => p.id === pid);
        if (found) setPosts((cur) => (cur.some((p) => p.id === pid) ? cur : [found, ...cur]));
      })
      .catch(() => undefined);
  }, [access, searchParams]);

  /* ---------------------------------- feed -------------------------------- */
  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const data = await fetchFeed({
        space: filter === "all" ? null : filter,
        query: query.trim() || null,
        saved: savedOnly,
        limit: PAGE,
      });
      setPosts(data);
      setHasMore(data.length === PAGE);
    } catch {
      setPosts([]);
      setHasMore(false);
    } finally {
      setFeedLoading(false);
    }
  }, [filter, query, savedOnly]);

  useEffect(() => {
    if (access === "granted") void loadFeed();
  }, [access, loadFeed]);

  useEffect(() => {
    if (access !== "granted") return;
    fetchActiveRotatingContent().then(setRotatingItems).catch(() => setRotatingItems([]));
  }, [access, reload]);

  /* pop the newest active announcement once per device when entering ליבה */
  useEffect(() => {
    const item = rotatingItems.find((x) => x.kind === "announcement");
    if (!item) return;
    const key = `liba-popup-seen-${item.id}-${item.starts_at ?? ""}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* private mode — the popup may reappear, acceptable */
    }
    setPopupRotating(item);
  }, [rotatingItems]);

  /* --------------------------- pulse checks (סקרים) ------------------------ */
  const loadPulses = useCallback(async () => {
    try {
      setPulses(await fetchPulseChecks(null));
    } catch {
      setPulses([]);
    }
  }, []);

  useEffect(() => {
    if (access === "granted") void loadPulses();
  }, [access, loadPulses, reload]);

  useEffect(() => {
    if (access !== "granted" || !profile?.show_online) return;
    const touch = () => void touchPresence().catch(() => undefined);
    touch();
    const timer = window.setInterval(touch, 120_000);
    return () => window.clearInterval(timer);
  }, [access, profile?.show_online]);

  const loadMore = async () => {
    setMore(true);
    try {
      const data = await fetchFeed({
        space: filter === "all" ? null : filter,
        query: query.trim() || null,
        saved: savedOnly,
        limit: PAGE,
        offset: posts.length,
      });
      setPosts((p) => [...p, ...data]);
      setHasMore(data.length === PAGE);
    } catch {
      toast.error("לא הצלחנו לטעון עוד");
    } finally {
      setMore(false);
    }
  };

  const refreshAll = () => {
    setReload((r) => r + 1);
    void loadFeed();
  };

  // the server is the truth while online; the cache carries her identity offline
  useEffect(() => {
    if (!boot?.profile) return;
    setProfile(boot.profile);
    try {
      localStorage.setItem(PROFILE_CACHE, JSON.stringify(boot.profile));
    } catch {
      /* ignore */
    }
  }, [boot?.profile]);

  useEffect(() => {
    if (boot?.profile?.needs_name) setNamePromptOpen(true);
  }, [boot?.profile?.needs_name]);

  // a quiet moment when her heart in Liba grew — shown once, never a "level up"
  useEffect(() => {
    const grown = takeLevelGrowth(profile?.hearts?.level ?? null);
    if (grown) toast(growthMessage(grown), { icon: grown.emoji, duration: 6000 });
  }, [profile?.hearts?.level?.key]);

  const saveProfile = (p: CommunityProfile) => {
    setProfile(p);
    try {
      localStorage.setItem(PROFILE_CACHE, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  };

  const me = useMemo(
    () => ({
      displayName: profile?.display_name ?? "חברה בקהילה",
      initials: profile?.initials ?? "?",
      nickname: profile?.nickname ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      avatarInNicknameMode: !!profile?.avatar_in_nickname_mode,
    }),
    [profile],
  );

  const activeSpace = filter === "all" ? null : spaceById(filter);

  // per-space update preferences + מאסטריות (quiet, one read per visit)
  useEffect(() => {
    let alive = true;
    fetchSpacePrefs()
      .then((p) => alive && setSpacePrefs(p))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  // a pulse-check lives 24 hours from the moment it was published, then it is gone
  const visiblePulses = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return pulses
      .filter((p) => p.is_open && new Date(p.created_at).getTime() > cutoff)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [pulses]);
  const hasPulse = visiblePulses.length > 0;
  /** one chip, its own place — with a heartbeat that asks to be touched */
  const pulseChip = hasPulse ? (
    <button
      onClick={() => { setPulseOnly((v) => !v); setInquiriesOnly(false); setActiveRotatingId(null); }}
      aria-pressed={pulseOnly}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
        pulseOnly
          ? "bg-primary text-primary-foreground"
          : "border border-primary/40 font-light text-primary hover:bg-primary/[0.07]"
      }`}
    >
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <span
          aria-hidden
          className={`absolute inset-0 animate-ping rounded-full ${
            pulseOnly ? "bg-primary-foreground/40" : "bg-primary/30"
          }`}
        />
        <Activity className="relative h-3.5 w-3.5" />
      </span>
      בדיקת דופק
    </button>
  ) : null;
  const rotatingChips = rotatingItems.map((item) => {
    const active = activeRotatingId === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveRotatingId(active ? null : item.id);
          setPulseOnly(false);
          setInquiriesOnly(false);
          setOpenPostId(null);
        }}
        aria-pressed={active}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${active ? "bg-primary text-primary-foreground" : "border border-primary/40 font-light text-primary hover:bg-primary/[0.07]"}`}
      >
        {tabEffect(item) === "eyes" && <BlinkingEyes />}
        {tabEffect(item) === "heart" && <BeatingHeart />}
        {item.tab_label}
      </button>
    );
  });
  const activeRotating = rotatingItems.find((item) => item.id === activeRotatingId) ?? null;
  const since = sinceLines(boot?.since).filter((item) => !seenSinceKeys.has(item.key));
  const openSinceItem = (key: string) => {
    if (key === "new_tools") {
      document.getElementById("community-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setInquiriesOnly(false);
      setPulseOnly(false);
      setActiveRotatingId(null);
      setSavedOnly(false);
      setFilter("all");
      setQuery("");
      feedTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    void markActivitySeen().catch(() => undefined);
    setSeenSinceKeys((current) => new Set(current).add(key));
  };
  const notices = boot?.notices ?? [];
  const events = boot?.events ?? [];
  const tools = boot?.tools ?? [];
  const talking = boot?.talking_now ?? [];
  const pending = (boot?.admin_pending?.tools ?? 0) + (boot?.admin_pending?.reports ?? 0);

  const openThread = (id: string | null) => {
    if (id) {
      if (window.history.state?.libaPostId) {
        window.history.replaceState({ libaPostId: id }, "");
      } else {
        window.history.pushState({ libaPostId: id }, "");
      }
    } else if (window.history.state?.libaPostId) {
      window.history.replaceState({}, "");
    }
    setOpenPostId(id);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  if (access !== "granted") {
    return (
      <div dir="rtl" className="min-h-screen bg-background">
        <LibaTopBar active="forum" sticky={false} />
        <AccessGate
          state={access}
          onSignIn={async (m) => {
            if (m === "google") {
              try {
                const done = await signInWithGoogle("/liba");
                if (done) setReload((r) => r + 1);
              } catch {
                toast.error("ההתחברות דרך Google לא הושלמה. אפשר להתחבר עם קוד לאימייל.");
              }
              return;
            }
            setAuthMode(m === "code" ? "code" : "choose");
            setAuthOpen(true);
          }}
          onRetry={() => setReload((r) => r + 1)}
          offlineTitle="הקהילה זמינה כשיש חיבור לרשת"
          gateTitle="המרחב מיועד לחברות הקהילה"
          requestTitle="בקשת גישה לליבה"
        />
        <AuthDialog
          initialMode={authMode}
          open={authOpen}
          onOpenChange={setAuthOpen}
          title="כמה טוב שאת כאן"
          description="ההתחברות היא רק כדי שנדע שזו את — אותו חשבון, אותה קהילה, גם מהאתר וגם מהתיקייה שבמחשב."
          redirectPath="/liba"
        />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Slim community bar */}
      <LibaTopBar
        active={inquiriesOnly ? "birurim" : "forum"}
        onBirurim={() => {
          setInquiriesOnly(true);
          setSavedOnly(false);
          setPulseOnly(false);
          setOpenPostId(null);
          feedTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        actions={
          <LibaHeaderActions
            me={me}
            onSaved={() => {
              setSavedOnly((v) => !v);
              setInquiriesOnly(false);
            }}
            savedActive={savedOnly}
            isAdmin={!!boot?.is_admin}
            adminPending={pending}
            onAdmin={() => setAdminOpen(true)}
            onSettings={() => {
              setSettingsTab(undefined);
              setSettingsOpen(true);
            }}
            onSignOut={() => supabase.auth.signOut()}
            onQuickLook={() => document.getElementById("quick-look")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        }
      />

      <div className="mx-auto grid max-w-[1560px] grid-cols-1 gap-8 px-4 py-5 lg:px-6 lg:py-8 xl:px-10 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_260px] xl:gap-10">
        {/* RIGHT — community spaces */}
        <aside className="order-2 hidden lg:order-1 lg:block lg:sticky lg:top-24 lg:self-start">
          <nav className="space-y-5">

            <div>
              <p className="mb-2.5 whitespace-nowrap px-3 text-[11px] tracking-[0.18em] text-muted-foreground">
                המרחבים בפורום
              </p>
              <ul className="space-y-1">
                <li>
                <button
                    onClick={() => {
                      setInquiriesOnly(false);
                      setPulseOnly(false);
                      setActiveRotatingId(null);
                      setSavedOnly(false);
                      setOpenPostId(null);
                      setQuery("");
                      setFilter("all");
                    }}
                    className={`relative flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start transition-all duration-200 ${
                      filter === "all" && !savedOnly && !inquiriesOnly
                        ? "bg-primary/[0.12] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.38)]"
                        : ""
                    }`}
                  >
                    {filter === "all" && !savedOnly && !inquiriesOnly && (
                      <span
                        className="absolute right-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-l-full bg-primary"
                        aria-hidden
                      />
                    )}
                    <LayoutGrid
                      className="h-3.5 w-3.5 shrink-0"
                      opacity={filter === "all" && !savedOnly && !inquiriesOnly ? 1 : 0.65}
                    />
                    <span className="min-w-0">
                      <span
                        className={`block truncate whitespace-nowrap text-[13px] leading-snug ${
                          filter === "all" && !savedOnly && !inquiriesOnly
                            ? "font-medium text-primary"
                            : "font-light text-foreground/80"
                        }`}
                      >
                        הכל
                      </span>
                    </span>
                  </button>
                </li>
                {SPACES.map((s) => {
                  const Icon = s.icon;
                  const active = filter === s.id && !inquiriesOnly;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          setInquiriesOnly(false);
                          setPulseOnly(false);
                          setActiveRotatingId(null);
                          setOpenPostId(null);
                          setFilter(s.id);
                        }}
                        className={`relative flex min-h-[44px] w-full items-start gap-2.5 rounded-xl px-3 py-2 text-start transition-all duration-200 ${
                          active
                            ? "bg-primary/[0.12] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.38)]"
                            : ""
                        }`}
                      >
                        {active && (
                          <span
                            className="absolute right-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-l-full bg-primary"
                            aria-hidden
                          />
                        )}

                        <Icon
                          className="mt-[2px] hidden h-3.5 w-3.5 shrink-0 md:block"
                          style={{ color: active ? accentColor(s) : undefined }}
                          opacity={active ? 1 : 0.65}
                        />
                        <span className="min-w-0">
                          <span
                            className={`block truncate whitespace-nowrap text-[13px] leading-snug ${
                              active ? "font-medium" : "font-light text-foreground/80"
                            }`}
                            style={{ color: active ? accentColor(s) : undefined }}
                          >
                            {s.name}
                          </span>
                          <span
                            className={`mt-0.5 block truncate whitespace-nowrap text-[11px] font-light leading-snug text-muted-foreground ${
                              active ? "" : "invisible"
                            }`}
                          >
                            {s.tagline}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-0.5 border-t border-border/60 pt-4">
              <Link
                to="/liba/messages"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-[13px] font-light text-foreground/75 transition-colors hover:bg-primary/[0.11] hover:text-primary"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5" />
                  צ׳אט
                </span>
                <ChevronLeft className="h-3 w-3" />
              </Link>
              <button
                onClick={() => setShowAllTools(true)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-[13px] font-light text-foreground/75 transition-colors hover:bg-primary/[0.11] hover:text-primary"
              >
                כלים מהקהילה
                <ChevronLeft className="h-3 w-3" />
              </button>
            </div>
          </nav>
        </aside>

        {/* CENTER — feed */}
        <main className="order-1 min-w-0 lg:order-2 xl:me-4" ref={feedTop}>
          {inquiriesOnly ? (
            <InquiriesPage
              key={inquiryFocus || "all"}
              profile={profile}
              isAdmin={!!boot?.is_admin}
              initialQuery={inquiryFocus}
              initialHelpStatus={searchParams.get("waiting") === "1" ? "waiting" : "all"}
            />
          ) : !openPost && (
          <>
          <div className="mb-5 hidden md:block">
            <h1 className="flex items-center gap-2 text-[26px] font-light leading-[1.2] tracking-[-0.02em] text-foreground md:text-[32px]">
              {savedOnly
                ? "השמורים שלי"
                : activeSpace
                  ? activeSpace.name
                  : (
                    <>
                      <span>{`כמה טוב שאת איתנו ${me.displayName.trim().split(/\s+/)[0]}`}</span>
                      <Heart className="h-5 w-5 shrink-0 text-primary md:h-6 md:w-6" fill="currentColor" />
                    </>
                  )}
            </h1>
            {query.trim() && (
              <button
                onClick={() => setQuery("")}
                className="mt-2 text-[12.5px] font-light text-primary transition-opacity hover:opacity-70"
              >
                מציגות תוצאות עבור ״{query}״ · ניקוי החיפוש
              </button>
            )}
          </div>

          {activeSpace && !savedOnly && (
            <MasteritStrip
              space={activeSpace}
              pref={
                spacePrefs?.spaces.find((p) => p.space === activeSpace.id) ?? emptyPref(activeSpace.id)
              }
              onChanged={setSpacePrefs}
            />
          )}

          {/* inline composer — write, choose identity + space, publish */}
          <div className="hidden md:block">
            <InlineComposer
              displayName={me.displayName}
              initials={me.initials}
              nickname={me.nickname}
              avatarUrl={me.avatarUrl}
              avatarInNicknameMode={me.avatarInNicknameMode}
              onNicknameCreated={() => setReload((r) => r + 1)}
              space={composerSpace}
              onSpaceChange={setComposerSpace}
              onExpand={() => setComposerOpen(true)}
              onPublished={() => {
                refreshAll();
                reinforce("firstPost");
              }}
            />
          </div>

          {/* filters */}
          <div className="sticky top-12 z-30 mb-1 flex items-center justify-between gap-2 border-b border-border/70 bg-background/95 py-2 backdrop-blur md:top-16 md:gap-4 md:py-3">
            {/* mobile: single chip opening a bottom drawer with all spaces */}
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <button
                onClick={() => setSpacesDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1 text-[12px] transition-colors"
                style={
                  !pulseOnly && activeSpace
                    ? {
                        color: accentColor(activeSpace),
                        backgroundColor: accentBg(activeSpace, 0.14),
                        boxShadow: `inset 0 0 0 1px ${accentBg(activeSpace, 0.45)}`,
                      }
                    : undefined
                }
              >
                <span className="font-light">{activeSpace ? activeSpace.shortName : "הכל"}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
              {pulseChip}
              {rotatingChips}
            </div>
            {/* desktop: full scrollable chips row */}
            <div className="no-scrollbar -mb-px hidden items-center gap-1.5 overflow-x-auto md:flex">
              <button
                onClick={() => {
                  setInquiriesOnly(false);
                  setPulseOnly(false);
                  setActiveRotatingId(null);
                  setFilter("all");
                }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
                  filter === "all" && !pulseOnly && !activeRotatingId
                    ? "bg-primary text-primary-foreground"
                    : "font-light text-muted-foreground hover:bg-primary/[0.07] hover:text-primary"
                }`}
              >
                הכול
              </button>
              {pulseChip}
              {rotatingChips}
              {SPACES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setInquiriesOnly(false);
                    setPulseOnly(false);
                    setActiveRotatingId(null);
                    setFilter(s.id);
                  }}
                  style={{
                    color: filter === s.id ? accentColor(s) : undefined,
                    backgroundColor: filter === s.id ? accentBg(s, 0.14) : undefined,
                    boxShadow:
                      filter === s.id ? `inset 0 0 0 1px ${accentBg(s, 0.45)}` : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (filter !== s.id) e.currentTarget.style.color = accentColor(s);
                  }}
                  onMouseLeave={(e) => {
                    if (filter !== s.id) e.currentTarget.style.color = "";
                  }}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
                    filter === s.id ? "font-medium" : "font-light text-muted-foreground"
                  }`}
                >
                  {s.shortName}
                </button>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-3 text-[12.5px]">
              <span className="flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5">
                {([
                  { id: "feed" as ViewMode, label: "פיד", Icon: LayoutList },
                  { id: "compact" as ViewMode, label: "מרוכז", Icon: Rows3 },
                ]).map(({ id, label, Icon: VIcon }) => (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    aria-pressed={view === id}
                    aria-label={label}
                    title={label}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors md:px-2.5 md:py-1 ${
                      view === id
                        ? "bg-background text-foreground shadow-sm"
                        : "font-light text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <VIcon className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    {/* on phones the icons speak for themselves, as in הבאר */}
                    <span className="hidden md:inline">{label}</span>
                  </button>
                ))}
              </span>
            </div>
          </div>

          {/* בדיקת דופק — lives only inside its own chip */}
          {pulseOnly &&
            visiblePulses.map((p) => (
              <div key={p.id} className="mt-4">
                <PulseCheckCard
                  pulse={p}
                  onChange={(next) =>
                    setPulses((list) => list.map((x) => (x.id === next.id ? next : x)))
                  }
                />
              </div>
            ))}

          {activeRotating?.kind === "quiz" && (
            <div className="mt-4">
              <QuizCard item={activeRotating} onBack={() => setActiveRotatingId(null)} />
            </div>
          )}
          {activeRotating?.kind === "announcement" && (
            <RotatingAnnouncement item={activeRotating} me={me} onChanged={refreshAll} />
          )}
          </>
          )}


          <div
            className={`${view === "compact" ? "overflow-hidden border-y border-border/50 bg-card" : "divide-y divide-border/50"} animate-fade-in motion-reduce:animate-none ${
              (pulseOnly && !openPost) || (!!activeRotating && !openPost) || inquiriesOnly ? "hidden" : ""
            }`}
          >
            {feedLoading ? (
              <p className="flex items-center justify-center gap-2 py-16 text-[13.5px] font-light text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> טוענות את הקהילה…
              </p>
            ) : openPost ? (
              <div>
                {/* the way back stays in place while the discussion scrolls */}
                {/* sticks just under the fixed 64px header so it stays visible */}
                <div className="sticky top-16 z-20 -mx-1 mb-2 border-b border-border/40 bg-background/95 px-1 py-2.5 backdrop-blur md:-mx-2 md:px-2">
                  <button
                    onClick={() => openThread(null)}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-light text-primary transition-opacity hover:opacity-70"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    חזרה לכל השיחות
                  </button>
                </div>
                <PostCard
                  key={openPost.id}
                  post={openPost}
                  me={me}
                  onRecommend={(post) => {
                    setRecNote("");
                    setRecommended(post);
                  }}
                  onChanged={(next) =>
                    setPosts((list) => list.map((x) => (x.id === next.id ? next : x)))
                  }
                  onDeleted={(id) => {
                    setPosts((list) => list.filter((x) => x.id !== id));
                    setOpenPostId(null);
                  }}
                  defaultOpen
                />
                <div className="mt-6 border-t border-border/40 pt-4 pb-8">
                  <button
                    onClick={() => openThread(null)}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-light text-primary transition-opacity hover:opacity-70"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    חזרה לכל השיחות
                  </button>
                </div>
              </div>
            ) : view === "compact" ? (
              posts.map((p) => (
                <CompactRow
                  key={p.id}
                  post={p}
                  onOpen={() => openThread(p.id)}
                  onDeleted={(id) => setPosts((list) => list.filter((x) => x.id !== id))}
                />
              ))
            ) : (
              posts.map((p) => (
                <FeedCard
                  key={p.id}
                  post={p}
                  onOpen={() => openThread(p.id)}
                  onDeleted={(id) => setPosts((list) => list.filter((x) => x.id !== id))}
                />
              ))
            )}
            {!feedLoading && !openPost && posts.length === 0 && (
              <p className="py-16 text-center text-[14px] font-light text-muted-foreground">
                {savedOnly
                  ? "עוד לא שמרת שיחות. אפשר לשמור כל פוסט לקריאה חוזרת."
                  : query.trim()
                    ? "לא נמצאו דיונים שמתאימים לחיפוש."
                    : "כאן עוד שקט. את מוזמנת לפתוח את השיחה הראשונה."}
              </p>
            )}
          </div>


          {hasMore && !feedLoading && !openPost && !pulseOnly && !inquiriesOnly && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={more}
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-[13px] font-light text-foreground transition-colors hover:bg-muted"
              >
                {more && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                עוד שיחות
              </button>
            </div>
          )}

        </main>

        <div className="order-3 lg:hidden">
          <LibaPulsePanel
            events={events}
            since={since}
            sinceOpen={sinceOpen}
            talking={talking}
            onToggleSince={() => setSinceOpen((v) => !v)}
            onAllEvents={() => navigate("/events")}
            onOpenInquiries={(name) => {
              setInquiryFocus(name ?? "");
              setInquiriesOnly(true);
              setOpenPostId(null);
              setPulseOnly(false);
              feedTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onOpenTalking={(space, title) => {
              setFilter(space);
              setQuery(title);
              feedTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onOpenSince={openSinceItem}
            onOpenDaily={dailyHidden ? undefined : () => setDailyOpen(true)}
            onOpenDailySettings={dailyHidden ? undefined : () => setDailyPreferencesOpen(true)}
          />
        </div>

        {/* LEFT — modular panel */}
        <aside className="order-3 hidden space-y-5 lg:block lg:space-y-7 xl:sticky xl:top-24 xl:self-start">
          {/* מה קורה עכשיו בליבה: מאז שהיית כאן + אירועים קרובים + אולי את מכירה? */}
          <LibaPulsePanel
            events={events}
            since={since}
            sinceOpen={sinceOpen}
            talking={talking}
            onToggleSince={() => setSinceOpen((v) => !v)}
            onAllEvents={() => navigate("/events")}
            onOpenInquiries={(name) => {
              setInquiryFocus(name ?? "");
              setInquiriesOnly(true);
              setOpenPostId(null);
              setPulseOnly(false);
              feedTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onOpenTalking={(space, title) => {
              setFilter(space);
              setQuery(title);
              feedTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onOpenSince={openSinceItem}
            onOpenDaily={dailyHidden ? undefined : () => setDailyOpen(true)}
            onOpenDailySettings={dailyHidden ? undefined : () => setDailyPreferencesOpen(true)}
          />




          {/* tools */}
          {tools.length > 0 && (
            <section id="community-tools" className="scroll-mt-24">
              <p className="mb-3.5 flex items-center gap-2 text-[10.5px] tracking-[0.2em] text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" /> כלים מהקהילה
              </p>
              <ul className="space-y-1">
                {(showAllTools ? tools : tools.slice(0, 3)).map((t) => {
                  const Icon = toolIcon(t.kind);
                  return (
                    <li
                      key={t.id}
                      onClick={async () => {
                        try {
                          if (t.url) window.open(t.url, "_blank", "noopener,noreferrer");
                          else if (t.has_file)
                            window.open(
                              await fileUrl({ toolId: t.id }),
                              "_blank",
                              "noopener,noreferrer",
                            );
                        } catch {
                          toast.error("לא הצלחנו לפתוח את הקובץ");
                        }
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-muted"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-foreground">{t.title}</span>
                        <span className="block text-[11px] font-light text-muted-foreground">
                          {[t.by, t.space ? `מתוך ${spaceById(t.space).shortName}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {tools.length > 3 && (
                <button
                  onClick={() => setShowAllTools((v) => !v)}
                  className="mt-3 px-3 text-[12.5px] text-primary transition-opacity hover:opacity-70"
                >
                  {showAllTools ? "פחות" : "לכל הכלים ←"}
                </button>
              )}
            </section>
          )}

          {/* important now */}
          {notices.length > 0 && (
            <section className="rounded-3xl bg-accent/45 p-5">
              <p className="mb-3.5 flex items-center gap-2 text-[10.5px] tracking-[0.2em] text-accent-foreground/70">
                <Pin className="h-3.5 w-3.5" /> חשוב עכשיו
              </p>
              <ul className="space-y-3.5">
                {notices.map((i) => (
                  <li
                    key={i.id}
                    className="border-t border-foreground/[0.06] pt-3.5 first:border-0 first:pt-0"
                  >
                    <p className="text-[13.5px] leading-snug text-foreground">{i.title}</p>
                    {i.note && (
                      <p className="mt-1 text-[12px] font-light leading-relaxed text-muted-foreground">
                        {i.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {/* Her own account: name, nickname, photo, privacy, notifications */}
      <AccountSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onSaved={saveProfile}
        focusTab={settingsTab}
      />
      <NamePrompt
        open={namePromptOpen && !settingsOpen}
        onClose={() => setNamePromptOpen(false)}
        onSaved={(p) => {
          saveProfile(p);
          setNamePromptOpen(false);
          refreshAll();
        }}
      />

      {/* Composer — full "כתבי פוסט" flow */}
      <NewEventPopup />
      <DailyBaarPromoPopup />
      <DailyBaarDialog open={dailyOpen} onOpenChange={setDailyOpen} />
      <DailyBaarPreferences
        open={dailyPreferencesOpen}
        onOpenChange={(v) => {
          setDailyPreferencesOpen(v);
          if (!v) fetchDailyState().then((st) => setDailyHidden(!!st.hidden)).catch(() => undefined);
        }}
      />
      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        nickname={me.nickname}
        onNicknameCreated={() => setReload((r) => r + 1)}
        displayName={me.displayName}
        initials={me.initials}
        initialSpace={composerSpace}
        onPublished={() => {
          setComposerOpen(false);
          refreshAll();
          reinforce("firstPost");
        }}
      />

      {!inquiriesOnly && (
        <Button
          type="button"
          size="icon"
          onClick={() => setComposerOpen(true)}
          aria-label="כתיבת פוסט"
          className="fixed bottom-20 left-4 z-40 h-14 w-14 rounded-full shadow-[var(--shadow-card)] md:hidden"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}


      {/* Recommend to tools */}
      {recommended && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-sm">
          <div dir="rtl" className="w-full max-w-md rounded-3xl bg-card p-10 shadow-[var(--shadow-card)] md:p-14">
            <MessageSquareQuote className="mb-4 h-6 w-6 text-primary" />
            <h2 className="text-lg font-light leading-snug text-foreground">
              חושבת שזה יכול לעזור גם לאחרות?
            </h2>
            <p className="mt-2 text-[13px] font-light leading-relaxed text-muted-foreground">
              אפשר להמליץ לנו לשמור את זה ב״כלים מהקהילה״ — צוות הניהול עובר על ההמלצות.
            </p>
            <p className="mt-4 rounded-2xl bg-muted/60 px-4 py-3 text-[12.5px] font-light text-foreground/80">
              {recommended.title || recommended.body.slice(0, 80)}
            </p>
            <textarea
              rows={3}
              value={recNote}
              onChange={(e) => setRecNote(e.target.value)}
              placeholder="למה לדעתך כדאי לשמור את זה?"
              className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-[13px] font-light outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => setRecommended(null)}
                className="text-[12.5px] font-light text-muted-foreground transition-colors hover:text-foreground"
              >
                ביטול
              </button>
              <button
                disabled={recSending}
                onClick={async () => {
                  if (!recommended) return;
                  setRecSending(true);
                  try {
                    await recommendTool(
                      recommended.id,
                      recommended.attachments[0]?.id ?? null,
                      recNote.trim() || undefined,
                    );
                    setRecommended(null);
                    reinforce("resourceRecommended");
                    toast.success("ההמלצה נשלחה לצוות הניהול");
                  } catch {
                    toast.error("ההמלצה לא נשלחה. נסי שוב.");
                  } finally {
                    setRecSending(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-[13px] text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-[hsl(var(--primary-glow))]"
              >
                {recSending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                שלחי המלצה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ההיכרות עם ליבה — אחרי התקנון, פעם אחת לכל חברה */}
      <LibaOnboarding
        blocked={!!boot?.requires_agreement || agreementOpen}
        displayName={profile?.first_name ?? profile?.display_name ?? ""}
        notifyPrefs={profile?.notify_prefs}
      />


      <ResponsiveDialog
        open={spacesDrawerOpen}
        onOpenChange={setSpacesDrawerOpen}
        mobileContentClassName="max-h-[70vh]"
        desktopContentClassName="max-w-[420px]"
      >
        <div dir="rtl" className="popup-scroll px-5 pb-8 pt-3">
          <p className="mb-3 text-[11px] tracking-[0.18em] text-muted-foreground">בחירת מרחב</p>
          <ul className="divide-y divide-border/50">
            <li>
              <button
                onClick={() => {
                  setInquiriesOnly(false);
                  setPulseOnly(false);
                  setActiveRotatingId(null);
                  setOpenPostId(null);
                  setSavedOnly(false);
                  setFilter("all");
                  setSpacesDrawerOpen(false);
                }}
                className="flex w-full items-center gap-3 py-3.5 text-right"
              >
                <span className="flex-1">
                  <span
                    className={`block text-[15px] ${
                      filter === "all" && !inquiriesOnly ? "font-medium text-primary" : "font-light"
                    }`}
                  >
                    הכל
                  </span>
                  <span className="block text-[12px] font-light text-muted-foreground">
                    כל השיחות מכל המרחבים
                  </span>
                </span>
                {filter === "all" && !inquiriesOnly && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            </li>
            {SPACES.map((s) => {
              const active = filter === s.id && !inquiriesOnly;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      setInquiriesOnly(false);
                      setPulseOnly(false);
                      setActiveRotatingId(null);
                      setOpenPostId(null);
                      setSavedOnly(false);
                      setFilter(s.id);
                      setSpacesDrawerOpen(false);
                    }}
                    className="flex w-full items-center gap-3 py-3.5 text-right"
                  >
                    <span className="flex-1">
                      <span
                        className={`block text-[15px] ${active ? "font-medium" : "font-light"}`}
                        style={active ? { color: accentColor(s) } : undefined}
                      >
                        {s.shortName}
                      </span>
                      <span className="block text-[12px] font-light text-muted-foreground">
                        {s.tagline}
                      </span>
                    </span>
                    {active && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: accentColor(s) }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </ResponsiveDialog>
      {/* announcement popup on entry */}
      <ResponsiveDialog
        open={!!popupRotating}
        onOpenChange={(open) => {
          if (!open) setPopupRotating(null);
        }}
        contentClassName="max-w-[560px]"
      >
        {popupRotating && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="popup-scroll">
            {popupRotating.cover_image && (
              <img
                src={popupRotating.cover_image}
                alt={popupRotating.title}
                className="w-full bg-muted/20 object-contain"
              />
            )}
            <div className="px-6 py-5 text-center md:px-10 md:py-7">
              <h2 className="text-[20px] font-medium leading-snug md:text-[24px]">
                {popupRotating.title}
              </h2>
              <p className="mt-3 whitespace-pre-line text-[14.5px] font-light leading-[1.9] text-foreground/80 md:text-[15.5px]">
                {popupRotating.body}
              </p>
            </div>
            </div>
              <div className="popup-footer px-6 pt-4 md:px-10">
              <Button
                className="h-12 w-full rounded-xl text-[15px]"
                onClick={() => {
                  setActiveRotatingId(popupRotating.id);
                  setPulseOnly(false);
                  setInquiriesOnly(false);
                  setOpenPostId(null);
                  setPopupRotating(null);
                }}
              >
                לצפייה ותגובות
              </Button>
              </div>
          </div>
        )}
      </ResponsiveDialog>
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} onChanged={refreshAll} />
      <MemberProfileHost />
      <CommunityAgreementModal
        open={agreementOpen}
        onAccepted={() => {
          setAgreementOpen(false);
          refreshAll();
        }}
        onSubmit={acceptAgreement}
      />
    </div>
  );
};

const CommunityV1 = () => (
  <ReinforcementHeart>
    <CommunityBody />
  </ReinforcementHeart>
);

export default CommunityV1;
