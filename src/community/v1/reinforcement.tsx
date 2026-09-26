import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";


/* ------------------------------------------------------------------ */
/*  Meaningful micro-reinforcement — no points, no streaks, no games. */
/*  Each message explains the human value of what just happened.      */
/* ------------------------------------------------------------------ */

export type ReinforcementKey =
  | "firstComment"
  | "firstPost"
  | "meTooReceived"
  | "meTooMany"
  | "commentUseful"
  | "discussionActive"
  | "resourceRecommended"
  | "resourceCurated";

export interface Reinforcement {
  glyph: string;
  title: string;
  note: string;
}

export const REINFORCEMENTS: Record<ReinforcementKey, Reinforcement> = {
  firstComment: {
    glyph: "🌿",
    title: "נכנסת לשיחה",
    note: "תודה שהוספת את הקול שלך.",
  },
  firstPost: {
    glyph: "✨",
    title: "פרסמת בקהילה",
    note: "מה שכתבת עכשיו נמצא שם בשביל מי שתחפש בדיוק את זה.",
  },
  meTooReceived: {
    glyph: "❤️",
    title: "מישהי התחברה למה שכתבת",
    note: "מה שכתבת פגש מישהי בדיוק היום.",
  },
  meTooMany: {
    glyph: "❤️",
    title: "5 נשים אמרו ״גם אני״",
    note: "כנראה שנגעת במשהו משותף.",
  },
  commentUseful: {
    glyph: "💡",
    title: "עזרת למישהי",
    note: "התשובה שלך הייתה שימושית.",
  },
  discussionActive: {
    glyph: "🌿",
    title: "השיחה התחילה",
    note: "כבר 5 נשים הצטרפו לדיון.",
  },
  resourceRecommended: {
    glyph: "💡",
    title: "תודה ששמת לב",
    note: "ההמלצה שלך נשלחה לבדיקה.",
  },
  resourceCurated: {
    glyph: "✨",
    title: "מה ששיתפת נשמר בכלים מהקהילה",
    note: "עכשיו גם אחרות יוכלו למצוא אותו.",
  },
};

type Ctx = { reinforce: (key: ReinforcementKey) => void };

const ReinforcementContext = createContext<Ctx>({ reinforce: () => {} });

export const useReinforce = () => useContext(ReinforcementContext).reinforce;

export const ReinforcementHeart = ({ children }: { children: ReactNode }) => {
  const [active, setActive] = useState<Reinforcement | null>(null);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => clear, []);

  const reinforce = useCallback((key: ReinforcementKey) => {
    clear();
    setActive(REINFORCEMENTS[key]);
    setVisible(false);
    timers.current.push(window.setTimeout(() => setVisible(true), 30));
    timers.current.push(window.setTimeout(() => setVisible(false), 4600));
    timers.current.push(window.setTimeout(() => setActive(null), 5200));
  }, []);

  return (
    <ReinforcementContext.Provider value={{ reinforce }}>
      {children}

      <div
        dir="rtl"
        className="fixed bottom-20 left-4 z-50 flex items-center gap-3 lg:bottom-8 lg:left-8"
      >
        {/* the message — slides in, then collapses back */}

        {/* the message — expands out of the heart, then collapses back */}
        {active && (
          <div
            role="status"
            className={`max-w-[19rem] origin-left rounded-2xl border border-border/70 bg-card/95 px-4 py-3 shadow-[0_14px_40px_-18px_hsl(var(--foreground)/0.3)] backdrop-blur-sm transition-all duration-500 ${
              visible
                ? "translate-x-0 scale-100 opacity-100"
                : "-translate-x-2 scale-95 opacity-0"
            }`}
          >
            <p className="text-[13.5px] leading-snug text-foreground">
              <span className="me-1.5">{active.glyph}</span>
              {active.title}
            </p>
            <p className="mt-1 text-[12px] font-light leading-relaxed text-muted-foreground">
              {active.note}
            </p>
          </div>
        )}
      </div>
    </ReinforcementContext.Provider>
  );
};
