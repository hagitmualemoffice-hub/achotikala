import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Share2, Plus, CheckCircle2 } from "lucide-react";

type Platform = "ios" | "android" | "desktop";

const detect = (): Platform => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
};

const Install = () => {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detect());
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  const steps =
    platform === "ios"
      ? [
          "לפתוח את הדף הזה בדפדפן Safari.",
          'ללחוץ על כפתור השיתוף (ריבוע עם חץ למעלה) בתחתית המסך.',
          'לגלול ולבחור "הוסף למסך הבית" (Add to Home Screen).',
          'ללחוץ "הוסף" — האייקון "אחותי כלה" יופיע במסך הבית.',
        ]
      : platform === "android"
        ? [
            "לפתוח את הדף הזה בדפדפן Chrome.",
            "ללחוץ על שלוש הנקודות בפינה העליונה.",
            'לבחור "התקן אפליקציה" או "הוספה למסך הבית".',
            "לאשר — האייקון יופיע במסך הבית ויפתח במסך מלא.",
          ]
        : [
            "בדפדפן Chrome או Edge, ללחוץ על אייקון ההתקנה בשורת הכתובת (או תפריט → התקן).",
            "לאשר את ההתקנה — האתר ייפתח כחלון עצמאי.",
            "למשתמשות עם סינון חמור מומלץ להוריד את חבילת ההתקנה למחשב.",
          ];

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground px-6 py-16">
      <main className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-light">התקנת האתר בנייד ובטאבלט</h1>
        </div>

        {installed ? (
          <p className="flex items-center gap-2 text-primary mb-8">
            <CheckCircle2 className="w-5 h-5" /> האתר כבר פועל כאפליקציה מותקנת.
          </p>
        ) : (
          <p className="text-foreground/70 leading-relaxed mb-8">
            אפשר להוסיף את "אחותי כלה" למסך הבית ולקבל אייקון שנפתח במסך מלא, בלי סרגלי דפדפן —
            בדיוק כמו אפליקציה, ובלי חנות אפליקציות.
          </p>
        )}

        <ol className="space-y-3 bg-card border border-border/60 rounded-2xl p-6">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground/80">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex items-center gap-4 text-xs text-foreground/60">
          <span className="inline-flex items-center gap-1">
            <Share2 className="w-4 h-4" /> אייפון: כפתור שיתוף
          </span>
          <span className="inline-flex items-center gap-1">
            <Plus className="w-4 h-4" /> אנדרואיד: תפריט ← התקנה
          </span>
        </div>

        <p className="mt-8 text-sm text-foreground/70 leading-relaxed">
          מחפשת את הגרסה למחשב שעובדת גם ללא אינטרנט?{" "}
          <Link to="/download" className="text-primary underline">
            לעמוד ההורדה
          </Link>
          .
        </p>
      </main>
    </div>
  );
};

export default Install;
