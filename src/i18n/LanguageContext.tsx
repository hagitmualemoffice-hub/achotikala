import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type Lang = "he" | "en";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "site_lang";

const getInitialLang = (): Lang => {
  if (typeof window === "undefined") return "he";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "he";
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === "he" ? "rtl" : "ltr";
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    // Update <title> and meta description live
    const titles: Record<Lang, string> = {
      he: "אחותי כלה | מקום חדשני לרווקות חרדיות",
      en: "Achoti Kallah | An innovative space for haredi single women",
    };
    const descs: Record<Lang, string> = {
      he: "מרחב שמציע מענים מותאמים לרווקות חרדיות - קהילה, תוכן, מפגשים ופתרונות מדוייקים שמלווים אותך בתוך החיים עצמם.",
      en: "A space offering tailored support for haredi single women - community, content, gatherings and precise solutions that walk with you through life itself.",
    };
    document.title = titles[lang];
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", descs[lang]);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((l) => (l === "he" ? "en" : "he")), []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
};
