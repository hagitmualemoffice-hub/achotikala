import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, CalendarDays, Mic, Home, Layers, Languages, Heart, Flower, Menu, Info, Mail, MessageCircle } from "lucide-react";
import MailingListPopup from "@/components/MailingListPopup";
import ContactPopup from "@/components/ContactPopup";
import { useLang } from "@/i18n/LanguageContext";

const contentLinks: { label: string; to: string; icon: typeof BookOpen }[] = [
  { label: "בלוג", to: "/blog", icon: BookOpen },
  { label: "פודקאסט", to: "/podcast", icon: Mic },
];

const MobileBottomNav = () => {
  const [mailingOpen, setMailingOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, toggle } = useLang();

  const goAnchor = (to: string) => {
    setMenuOpen(false);
    const id = to.slice(2);
    if (location.pathname === "/") {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate(to);
    }
  };

  const popupLinkClasses =
    "flex items-center gap-2 px-4 py-2.5 text-foreground/80 hover:text-primary hover:bg-muted/50 transition-colors text-sm font-light";

  return (
    <>
      {/* Floating language toggle (mobile only) */}
      <button
        type="button"
        onClick={toggle}
        data-i18n-skip
        aria-label={lang === "he" ? "Switch to English" : "החלפה לעברית"}
        className="lg:hidden fixed top-3 left-3 z-[55] px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-border text-foreground/70 text-xs font-medium tracking-wider hover:text-foreground"
      >
        <Languages className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5" />
        {lang === "he" ? "EN" : "עב"}
      </button>

      <nav
        dir="rtl"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-8px_24px_-12px_hsl(0_0%_0%_/_0.12)]"
        aria-label="ניווט תחתון"
      >
        <div className="grid grid-cols-6 h-14">
          {/* בית */}
          <Link
            to="/"
            className="flex flex-col items-center justify-center gap-0.5 text-foreground/70 hover:text-primary transition-colors"
          >
            <Home className="h-5 w-5" />
            <span className="text-[9px] font-light leading-tight">בית</span>
          </Link>

          {/* אירועים */}
          <Link
            to="/events"
            className="flex flex-col items-center justify-center gap-0.5 text-foreground/70 hover:text-primary transition-colors"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-[9px] font-light leading-tight">אירועים</span>
          </Link>

          {/* ליבה — אייקון לב ורוד, ללא רקע */}
          <Link
            to="/liba-landing"
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
              location.pathname.startsWith("/liba")
                ? "text-primary"
                : "text-foreground/70 hover:text-primary"
            }`}
          >
            <Heart className="h-5 w-5 text-primary" fill="currentColor" />
            <span className="text-[9px] font-medium leading-tight">ליבה</span>
          </Link>

          {/* תוכן */}
          <div className="relative">
            <button
              onClick={() => setContentOpen((v) => !v)}
              className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-foreground/70 hover:text-primary transition-colors"
              aria-haspopup="true"
              aria-expanded={contentOpen}
            >
              <Layers className="h-5 w-5" />
              <span className="text-[9px] font-light leading-tight">תוכן</span>
            </button>
            {contentOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setContentOpen(false)}
                />
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_-8px_hsl(0_0%_0%_/_0.18)] border border-border py-2 min-w-[140px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {contentLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setContentOpen(false)}
                        className={popupLinkClasses}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-border rotate-45" />
                </div>
              </>
            )}
          </div>

          {/* שימור פוריות — אייקון פרח, ללא רקע */}
          <a
            href="https://shimurporiut.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-0.5 text-foreground/70 hover:text-primary transition-colors"
          >
            <Flower className="h-5 w-5 text-primary" />
            <span className="text-[9px] font-medium leading-tight text-center">שימור פוריות</span>
          </a>

          {/* תפריט */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-foreground/70 hover:text-primary transition-colors"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[9px] font-light leading-tight">תפריט</span>
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_-8px_hsl(0_0%_0%_/_0.18)] border border-border py-2 min-w-[160px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <button onClick={() => goAnchor("/#about")} className={`w-full ${popupLinkClasses}`}>
                    <Info className="h-4 w-4" />
                    אודות
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setContactOpen(true); }}
                    className={`w-full ${popupLinkClasses}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    דברי איתנו
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setMailingOpen(true); }}
                    className={`w-full ${popupLinkClasses}`}
                  >
                    <Mail className="h-4 w-4" />
                    להצטרפות לתפוצה
                  </button>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-border rotate-45" />
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <MailingListPopup open={mailingOpen} onOpenChange={setMailingOpen} />
      <ContactPopup open={contactOpen} onOpenChange={setContactOpen} defaultTab="general" />
    </>
  );
};

export default MobileBottomNav;
