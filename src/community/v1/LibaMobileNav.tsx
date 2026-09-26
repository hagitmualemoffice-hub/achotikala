import { Building2, MapPin, MessageCircle, MessageSquareQuote, MessagesSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { LibaSection } from "./LibaTopBar";
import type { LibaNewCounts } from "./newCounts";
import { fetchMessagesUnread } from "./messages";

const items = [
  { key: "forum", label: "המרחב", to: "/liba", Icon: MessagesSquare },
  { key: "messages", label: "צ׳אט", to: "/liba/messages", Icon: MessageCircle },
  { key: "baar", label: "הבאר", to: "/liba/baar", Icon: Users },
  { key: "mekomot", label: "ליד הבאר", to: "/liba/mekomot", Icon: MapPin },
  { key: "birurim", label: "בירורים", to: "/liba?birurim=1", Icon: MessageSquareQuote },
  { key: "dirot", label: "דירות", to: "/liba/dirot", Icon: Building2 },
] as const;

const LibaMobileNav = ({ active, counts }: { active: LibaSection; counts?: LibaNewCounts }) => {
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    const load = () => void fetchMessagesUnread().then(setMessageCount).catch(() => undefined);
    load();
    const timer = window.setInterval(load, 90_000);
    return () => window.clearInterval(timer);
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(<nav
    dir="rtl"
    aria-label="ניווט ליבה"
    className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_hsl(var(--foreground)/0.22)] backdrop-blur-md md:hidden"
  >
    <div className="grid h-16 grid-cols-6">
      {items.map(({ key, label, to, Icon }) => {
        const selected = active === key;
        const isNew = key === "baar" || key === "birurim" || key === "dirot";
        const count = selected ? 0 : key === "messages" ? messageCount : isNew ? counts?.[key] ?? 0 : 0;
        return (
          <Link
            key={key}
            to={to}
            onClick={() => {
              if (key === "messages" && selected) {
                window.dispatchEvent(new Event("liba:show-messages-inbox"));
              }
            }}
            aria-current={selected ? "page" : undefined}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 transition-colors ${
              selected ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="relative">
              <Icon className="h-[19px] w-[19px]" strokeWidth={selected ? 2.2 : 1.7} />
              {count > 0 && (
                <span
                  aria-label={`${count} חדשים`}
                  className="absolute -top-1.5 end-[-7px] inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium leading-none text-primary-foreground"
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </span>
            <span className={`max-w-full truncate text-[9px] leading-none ${selected ? "font-medium" : "font-light"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  </nav>, document.body);
};

export default LibaMobileNav;
