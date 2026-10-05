/**
 * The one and only ליבה bar. It looks the same on every page of the community
 * area — המרחב שלנו · הבאר · בירורים · דירות — so she always knows where she is
 * and never loses the links. On phones the same links live in a second row that
 * scrolls sideways, so nothing disappears.
 */
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Building2, MapPin, MessageSquareQuote, Users } from "lucide-react";
import logo from "@/assets/logo-achoti-kala.png";
import LibaHeart from "@/components/LibaHeart";
import HeyLiba from "./HeyLiba";
import LibaMobileNav from "./LibaMobileNav";
import { markAreaSeen, useLibaNewCounts, type LibaArea } from "./newCounts";

/** the little pink circle with how many new items wait in that area */
const NewBadge = ({ count }: { count: number }) =>
  count > 0 ? (
    <span
      aria-label={`${count} חדשים`}
      className="ms-0.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground"
    >
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

export type LibaSection = "forum" | "messages" | "baar" | "mekomot" | "birurim" | "dirot" | "sheli" | null;

/**
 * A desktop nav item in the quiet reference style: plain label on white, a
 * faint gray pill while it is the area she is in, and a pink bar resting on
 * the bar's bottom border — always under the current item, and under any
 * other item the moment she hovers it, with the text turning pink too.
 */
const BarLink = ({
  on,
  to,
  onClick,
  children,
}: {
  on: boolean;
  to?: string;
  onClick?: () => void;
  children: ReactNode;
}) => {
  const cls = "group relative hidden h-full items-center px-1 md:inline-flex";
  const inner = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
        on
          ? "font-normal text-primary"
          : "font-light text-foreground group-hover:text-primary"
      }`}
    >
      {children}
    </span>
  );
  const underline = (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-primary transition-opacity duration-200 ${
        on ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
    />
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
        {underline}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
      {underline}
    </button>
  );
};

const LibaTopBar = ({
  active = null,
  actions,
  onBirurim,
  sticky = true,
}: {
  active?: LibaSection;
  /** the personal action group (search · saved · messages · bell · avatar) */
  actions?: ReactNode;
  /** the forum page opens בירורים in place instead of navigating */
  onBirurim?: () => void;
  sticky?: boolean;
}) => {
  const counts = useLibaNewCounts();
  /** being inside an area means she saw what's new there */
  useEffect(() => {
    if (active === "baar" || active === "birurim" || active === "dirot") markAreaSeen(active as LibaArea);
  }, [active]);
  const badge = (area: LibaArea) => (active === area ? 0 : counts[area]);
  return (
  <header
    className={`border-b border-border/70 ${
      sticky ? "sticky top-0 z-40 bg-background/90 backdrop-blur-md" : ""
    }`}
  >
    <div className="mx-auto flex h-12 max-w-[1560px] items-center gap-2 px-3 md:h-16 md:gap-4 md:px-6 xl:px-10">
      <Link to="/" className="flex items-center gap-2.5">
        <img src={logo} alt="אחותי כלה" className="h-5 w-auto md:h-7" />
      </Link>
      <Link
        to="/liba"
        className="inline-flex items-center gap-1 rounded-[10px] bg-[linear-gradient(90deg,#ff8f84_0%,#fa6fba_100%)] px-2 py-0.5 text-[11.5px] font-normal tracking-[0.12em] text-white md:gap-1.5 md:px-2.5 md:py-1 md:text-[12.5px]"
      >
        <LibaHeart solid className="h-3 w-3 text-white" />
        ליבה
      </Link>
      <span className="hidden h-5 w-px bg-border md:block" />

      <BarLink on={active === "forum"} to="/liba">
        המרחב
      </BarLink>
      <BarLink on={active === "baar"} to="/liba/baar">
        <Users className="h-3.5 w-3.5" />
        הבאר
        <NewBadge count={badge("baar")} />
      </BarLink>
      <BarLink on={active === "mekomot"} to="/liba/mekomot">
        <MapPin className="h-3.5 w-3.5" />
        ליד הבאר
      </BarLink>
      {onBirurim ? (
        <BarLink on={active === "birurim"} onClick={onBirurim}>
          <MessageSquareQuote className="h-3.5 w-3.5" />
          בירורים
          <NewBadge count={badge("birurim")} />
        </BarLink>
      ) : (
        <BarLink on={active === "birurim"} to="/liba?birurim=1">
          <MessageSquareQuote className="h-3.5 w-3.5" />
          בירורים
          <NewBadge count={badge("birurim")} />
        </BarLink>
      )}
      <BarLink on={active === "dirot"} to="/liba/dirot">
        <Building2 className="h-3.5 w-3.5" />
        דירות
        <NewBadge count={badge("dirot")} />
      </BarLink>

      {actions}
    </div>

    <LibaMobileNav active={active} counts={counts} />

    {/* Feedback stays on the main community space, away from focused tools such as chat. */}
    {active === "forum" && <HeyLiba />}
  </header>
  );
};

export default LibaTopBar;
