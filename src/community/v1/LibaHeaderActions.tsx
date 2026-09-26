/**
 * The left-hand group of the ליבה header — "things relevant to me right now".
 *
 * חיפוש · שמורים · הודעות · התראות · avatar
 * Messages and notifications are always directly reachable; the avatar menu
 * holds the quieter options (overview, settings, admin, sign out).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Bookmark,
  CalendarDays,
  Heart,
  Inbox,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { MemberAvatar } from "./Avatar";
import ActivityBell from "./ActivityBell";
import GlobalSearch from "./GlobalSearch";
import { forgetAllGrants } from "./accessMemo";
import HeartMenu from "./HeartMenu";
import { fetchMessagesUnread } from "./messages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  me: { displayName: string; avatarUrl?: string | null };
  /** opens the in-page search when the current page has one */
  onSearch?: () => void;
  /** overrides the default "saved" destination (שלי → שמורים) */
  onSaved?: () => void;
  savedActive?: boolean;
  isAdmin?: boolean;
  adminPending?: number;
  onAdmin?: () => void;
  onSettings?: () => void;
  onSignOut: () => void;
  onQuickLook?: () => void;
  /** opens the Baar inquiries drawer from the header action group */
  onInquiries?: () => void;
  inquiriesUnread?: number;
};

const LibaHeaderActions = ({
  me,
  onSearch,
  onSaved,
  savedActive = false,
  isAdmin = false,
  adminPending = 0,
  onAdmin,
  onSettings,
  onSignOut,
  onQuickLook,
  onInquiries,
  inquiriesUnread = 0,
}: Props) => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [messagesUnread, setMessagesUnread] = useState(0);

  useEffect(() => {
    const load = () => void fetchMessagesUnread().then(setMessagesUnread).catch(() => undefined);
    load();
    const timer = window.setInterval(load, 90_000);
    return () => window.clearInterval(timer);
  }, []);

  const quiet =
    "rounded-full p-2 text-muted-foreground/80 transition-colors hover:text-foreground";

  return (
    <div className="ms-auto flex items-center gap-0.5 md:gap-1">
      {/* הלב שלי בליבה */}
      <span className="inline-flex">
        <HeartMenu />
      </span>

      <button
        onClick={() => navigate("/liba/messages")}
        className={`relative hidden md:inline-flex ${quiet}`}
        aria-label="צ׳אט"
        title="צ׳אט"
      >
        <MessageCircle className="h-[18px] w-[18px]" />
        {messagesUnread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-medium text-primary-foreground">
            {messagesUnread > 99 ? "99+" : messagesUnread}
          </span>
        )}
      </button>

      {/* אירועים — something we want her to notice, so it sits in the bar */}
      <button
        onClick={() => (onQuickLook ? onQuickLook() : navigate("/liba#quick-look"))}
        className={`inline-flex md:hidden ${quiet}`}
        aria-label="מבט זריז"
        title="מבט זריז"
      >
        <CalendarDays className="h-[18px] w-[18px]" />
      </button>

      {/* חיפוש אחד לכל ליבה — reachable from every page, phone included */}
      <button
        onClick={() => (onSearch ? onSearch() : setSearchOpen(true))}
        className={`inline-flex ${quiet}`}
        aria-label="חיפוש בליבה"
        title="חיפוש בליבה"
      >
        <Search className="h-[18px] w-[18px] md:h-4 md:w-4" />
      </button>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <button
        onClick={() => (onSaved ? onSaved() : navigate("/liba/sheli?tab=saved"))}
        className={`hidden rounded-full p-2 transition-colors md:inline-flex ${
          savedActive ? "text-primary" : "text-muted-foreground/80 hover:text-foreground"
        }`}
        aria-label="שמורים"
        title="שמורים"
      >
        <Bookmark className="h-4 w-4" />
      </button>

      <span className="mx-1.5 hidden h-5 w-px bg-border/70 md:block" />

      {onInquiries && (
        <button
          onClick={onInquiries}
          className="relative hidden items-center gap-1.5 rounded-full px-2.5 py-2 text-[13px] font-normal text-foreground transition-colors hover:text-primary md:inline-flex"
          aria-label="הפניות בבאר"
          title="הפניות בבאר"
        >
          <Inbox className="h-[18px] w-[18px]" />
          <span className="hidden lg:inline">הפניות בבאר</span>
          {inquiriesUnread > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
              {inquiriesUnread > 99 ? "99+" : inquiriesUnread}
            </span>
          )}
        </button>
      )}

      <ActivityBell countThreads={false} className="text-foreground" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="ms-1 rounded-full transition-opacity hover:opacity-80"
            aria-label="התפריט האישי שלי"
          >
            <MemberAvatar name={me.displayName} seed={me.displayName} imageUrl={me.avatarUrl} size="sm" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-2xl">
          <DropdownMenuItem onClick={() => navigate("/liba/sheli")} className="gap-2 text-[13px]">
            <User className="h-3.5 w-3.5" />
            האזור שלי
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate("/liba?settings=heart")}
            className="gap-2 text-[13px]"
          >
            <Heart className="h-3.5 w-3.5" />
            הלב שלי בליבה
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/liba?settings=about")}
            className="gap-2 text-[13px]"
          >
            <User className="h-3.5 w-3.5" />
            תכירו אותי
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => (onSettings ? onSettings() : navigate("/liba?settings=profile"))}
            className="gap-2 text-[13px]"
          >
            <Settings className="h-3.5 w-3.5" />
            הגדרות פרופיל
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => (onSaved ? onSaved() : navigate("/liba/sheli?tab=saved"))}
            className="gap-2 text-[13px]"
          >
            <Bookmark className="h-3.5 w-3.5" />
            השמורים שלי
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/liba?settings=updates")}
            className="gap-2 text-[13px]"
          >
            <Bell className="h-3.5 w-3.5" />
            עדכונים ומאסטריות
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isAdmin && onAdmin && (
            <DropdownMenuItem onClick={onAdmin} className="gap-2 text-[13px]">
              <ShieldCheck className="h-3.5 w-3.5" />
              ניהול
              {adminPending > 0 && (
                <span className="ms-auto grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                  {adminPending}
                </span>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              forgetAllGrants();
              onSignOut?.();
            }}
            className="gap-2 text-[13px]"
          >
            <LogOut className="h-3.5 w-3.5" />
            יציאה
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LibaHeaderActions;
