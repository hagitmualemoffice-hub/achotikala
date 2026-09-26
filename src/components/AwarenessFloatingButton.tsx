import { Link, useLocation } from "react-router-dom";
import { Heart } from "lucide-react";

const AwarenessFloatingButton = () => {
  const { pathname } = useLocation();
  if (
    pathname === "/yom-hamodaut" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/liba")
  )
    return null;

  const isHome = pathname === "/";

  const className =
    "fixed bottom-20 left-4 lg:bottom-8 lg:left-8 z-50 flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-110 hover:bg-[hsl(var(--primary-glow))] transition-all duration-300 animate-pulse-soft";

  if (isHome) {
    return (
      <Link
        to="/yom-hamodaut"
        aria-label="יום המודעות לרווקות מתמשכת"
        title="יום המודעות לרווקות מתמשכת"
        className={className}
      >
        <Heart className="w-5 h-5 md:w-6 md:h-6 fill-current" strokeWidth={2} />
      </Link>
    );
  }

  const scrollToDonate = (e: React.MouseEvent) => {
    const el = document.getElementById("donate");
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <a
      href="#donate"
      onClick={scrollToDonate}
      aria-label="לתמוך בעשייה של אחותי כלה"
      title="לתמוך בעשייה של אחותי כלה"
      className={className}
    >
      <Heart className="w-5 h-5 md:w-6 md:h-6 fill-current" strokeWidth={2} />
    </a>
  );
};

export default AwarenessFloatingButton;
