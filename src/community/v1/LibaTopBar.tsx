/**
 * The one and only ליבה bar. It looks the same on every page of the community
 * area — המרחב שלנו · הבאר · בירורים · דירות — so she always knows where she is
 * and never loses the links. On phones the same links live in a second row that
 * scrolls sideways, so nothing disappears.
 */
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-achoti-kala.png";
import LibaHeart from "@/components/LibaHeart";
import HeyLiba from "./HeyLiba";
import LibaMobileNav from "./LibaMobileNav";
import { markAreaSeen, useLibaNewCounts, type LibaArea } from "./newCounts";
import LibaDesktopDashboard from "./LibaDesktopDashboard";

export type LibaSection = "forum" | "messages" | "baar" | "mekomot" | "birurim" | "dirot" | "sheli" | null;

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
  return (
  <>
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

      {actions}
    </div>

    <LibaMobileNav active={active} counts={counts} />

    {/* Feedback stays on the main community space, away from focused tools such as chat. */}
    {active === "forum" && <HeyLiba />}
  </header>
  <LibaDesktopDashboard />
  </>
  );
};

export default LibaTopBar;
