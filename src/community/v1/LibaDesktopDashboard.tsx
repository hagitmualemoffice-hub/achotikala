import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DailyBaarDialog from "./DailyBaarDialog";
import DailyBaarPreferences from "./DailyBaarPreferences";
import LibaPulsePanel from "./LibaPulsePanel";
import { bootstrap, type Bootstrap } from "./api";
import { fetchDailyState } from "./dailyBaar";

const LibaDesktopDashboard = () => {
  const navigate = useNavigate();
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [dailyPreferencesOpen, setDailyPreferencesOpen] = useState(false);
  const [dailyHidden, setDailyHidden] = useState(true);

  useEffect(() => {
    let cancelled = false;
    bootstrap()
      .then((value) => {
        if (!cancelled && value.authorized) setBoot(value);
      })
      .catch(() => undefined);
    fetchDailyState()
      .then((value) => {
        if (!cancelled) setDailyHidden(!value.authorized || !!value.hidden);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!boot?.authorized) return null;

  return (
    <>
      <aside
        dir="rtl"
        aria-label="דשבורד ליבה שלי"
        className="fixed bottom-0 left-0 top-16 z-30 hidden w-[325px] overflow-y-auto border-r border-border/40 bg-background px-6 pb-8 pt-6 shadow-[10px_0_28px_-24px_hsl(var(--foreground)/0.24)] lg:block"
      >
        <h2 className="border-b border-border/50 pb-4 text-[17px] font-medium text-foreground">
          דשבורד ליבה שלי
        </h2>
        <LibaPulsePanel
          actionableMode
          newPostsCount={boot.since?.new_posts ?? 0}
          onAllEvents={() => navigate("/events")}
          onOpenInquiries={() => navigate("/liba?birurim=1&waiting=1")}
          onOpenPosts={() => navigate("/liba")}
          onOpenApartments={() => navigate("/liba/dirot")}
          onOpenTalking={(space, title) => navigate(`/liba?space=${space}&q=${encodeURIComponent(title)}`)}
          onOpenDaily={dailyHidden ? undefined : () => setDailyOpen(true)}
          onOpenDailySettings={dailyHidden ? undefined : () => setDailyPreferencesOpen(true)}
        />
      </aside>
      <DailyBaarDialog open={dailyOpen} onOpenChange={setDailyOpen} />
      <DailyBaarPreferences
        open={dailyPreferencesOpen}
        onOpenChange={(open) => {
          setDailyPreferencesOpen(open);
          if (!open) {
            fetchDailyState()
              .then((value) => setDailyHidden(!value.authorized || !!value.hidden))
              .catch(() => undefined);
          }
        }}
      />
    </>
  );
};

export default LibaDesktopDashboard;