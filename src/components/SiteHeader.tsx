import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MailingListPopup from "@/components/MailingListPopup";
import ContactPopup from "@/components/ContactPopup";
import LibaHeart from "@/components/LibaHeart";
import logo from "@/assets/logo-achoti-kala.png";
import { useLang } from "@/i18n/LanguageContext";

type NavItem =
  | { label: string; type: "page" | "anchor"; to: string; highlight?: boolean; special?: boolean }
  | { label: string; type: "action"; action: "contact"; highlight?: boolean; };

const navItems: NavItem[] = [
  { label: "אודות", type: "anchor", to: "/#about" },
  { label: "פעילות", type: "anchor", to: "/#activities" },
  { label: "אירועים", type: "page", to: "/events" },
  { label: "פרויקטים", type: "anchor", to: "/#projects" },
  { label: "שנדבר חששות?", type: "anchor", to: "/#concerns" },
  { label: "בלוג", type: "page", to: "/blog" },
  { label: "פודקאסט", type: "page", to: "/podcast" },
  { label: "שימור פוריות", type: "page", to: "https://shimurporiut.com/", highlight: true },

  { label: "דברי איתנו", type: "action", action: "contact" },
];


const SiteHeader = () => {
  const [mailingOpen, setMailingOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const { lang, toggle } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const isPageActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  const handleAnchorClick = (e: React.MouseEvent, to: string) => {
    if (!to.startsWith("/#")) return;
    const id = to.slice(2);
    e.preventDefault();
    if (location.pathname === "/") {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate(to);
    }
  };

  const baseLink =
    "text-[13px] xl:text-sm font-normal whitespace-nowrap transition-colors relative pb-1 text-foreground hover:text-primary";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        {/* Compact bar for mobile / tablet portrait */}
        <div className="flex lg:hidden items-center justify-center px-5 py-3" dir="rtl">
          <Link to="/" aria-label="אחותי כלה - דף הבית">
            <img src={logo} alt="אחותי כלה" className="h-7 w-auto" />
          </Link>
        </div>

        <div className="hidden lg:flex items-center justify-between px-6 xl:px-10 py-5" dir="rtl">
          <Link to="/" className="shrink-0" aria-label="אחותי כלה - דף הבית">
            <img src={logo} alt="אחותי כלה" className="h-9 xl:h-10 w-auto" />
          </Link>


          <nav className="flex items-center gap-3.5 xl:gap-6">
            {navItems.map((item) => {
              if (item.type === "page") {
              if (item.highlight) {
                  const isExternal = /^https?:\/\//.test(item.to);
                  if (isExternal) {
                    return (
                      <a
                        key={item.label}
                        href={item.to}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] xl:text-sm font-medium whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-full bg-primary/10 transition-colors hover:bg-primary/20 text-foreground"
                      >
                        {item.label}
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className={`text-[13px] xl:text-sm font-medium whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-full bg-primary/10 transition-colors hover:bg-primary/20 ${isPageActive(item.to) ? "text-primary" : "text-foreground"}`}
                    >
                      {item.label}
                    </Link>
                  );
                }
                const isExternal = /^https?:\/\//.test(item.to);
                if (isExternal) {
                  return (
                    <a
                      key={item.label}
                      href={item.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={baseLink}
                    >
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`${baseLink} ${isPageActive(item.to) ? "text-primary" : ""}`}
                  >
                    {item.label}
                  </Link>
                );
              }

              if (item.type === "anchor") {
                return (
                  <a
                    key={item.label}
                    href={item.to}
                    onClick={(e) => handleAnchorClick(e, item.to)}
                    className={baseLink}
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <button
                  key={item.label}
                  onClick={() => setContactOpen(true)}
                  className={baseLink}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 xl:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggle}
              data-i18n-skip
              aria-label={lang === "he" ? "Switch to English" : "החלפה לעברית"}
              className="px-3 py-2 rounded-lg border border-border text-foreground/70 text-xs font-medium tracking-wider hover:bg-muted hover:text-foreground transition-colors"
            >
              {lang === "he" ? "EN" : "עב"}
            </button>
            <Link
              to="/liba-landing"
              className="inline-flex items-center gap-2 px-4 xl:px-5 py-2.5 rounded-lg bg-[linear-gradient(90deg,#ff8f84_0%,#fa6fba_100%)] text-white text-[13px] xl:text-sm font-light whitespace-nowrap transition-opacity hover:opacity-90"
            >
              <LibaHeart solid className="h-4 w-4 text-white" />
              {"ליבה\u00a0\u00a0"}
            </Link>
            <button
              onClick={() => setMailingOpen(true)}
              className="px-4 xl:px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] xl:text-sm font-light whitespace-nowrap hover:bg-[hsl(var(--primary-glow))] transition-colors"
            >
              להצטרפות לתפוצה
            </button>
          </div>
        </div>
      </header>

      <MailingListPopup open={mailingOpen} onOpenChange={setMailingOpen} />
      <ContactPopup open={contactOpen} onOpenChange={setContactOpen} defaultTab="general" />
    </>
  );
};

export default SiteHeader;
