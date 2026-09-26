import { useState } from "react";
import { Link } from "react-router-dom";
import { Download as DownloadIcon, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const FIXED_INSTALLER_URL =
  "https://drive.usercontent.google.com/download?id=1yvgsZx1jqkqEl8G_2_G60Jy2AIyVbaqs&export=download&confirm=t";

const Download = () => {
  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
    setLoading(true);
    try {
      // קובץ Google קבוע שאינו תלוי בכתובות האתר או השרת החסומות.
      window.location.href = FIXED_INSTALLER_URL;
    } catch {
      toast({
        title: "ההורדה לא התחילה",
        description: "נסי שוב בעוד רגע, או בדקי את החיבור לאינטרנט",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setLoading(false), 3000);
    }
  };


  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-20">
      <main className="max-w-xl w-full text-center">
        <h1 className="text-3xl md:text-4xl font-light mb-4">הורדת גרסת האתר להתקנה</h1>
        <p className="text-foreground/70 leading-relaxed mb-8">
          החבילה מיועדת למשתמשות עם סינון אינטרנט. ההורדה מתבצעת מקובץ Google קבוע,
          בלי תלות בכתובת האתר.
        </p>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DownloadIcon className="w-5 h-5" />}
          {loading ? "מכינה את ההורדה..." : "להורדת החבילה"}
        </button>

        <div className="mt-10 text-right bg-card border border-border/60 rounded-2xl p-6 space-y-2 text-sm text-foreground/75 leading-relaxed">
          <p className="font-medium text-foreground">אחרי ההורדה:</p>
          <p>1. לחלץ את התיקייה מהקובץ המכווץ (קליק ימני → חילוץ הכל).</p>
          <p>2. להריץ את הקובץ ליצירת קיצור דרך בשולחן העבודה.</p>
          <p>3. לפתוח את האתר מקיצור הדרך — התוכן מתעדכן לבד בכל פתיחה עם אינטרנט.</p>
        </div>

        <p className="mt-6 text-sm text-foreground/70">
          בנייד או בטאבלט?{" "}
          <Link to="/install" className="text-primary underline">
            להתקנת האתר כאייקון במסך הבית
          </Link>
          .
        </p>
      </main>
    </div>
  );
};

export default Download;
