import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import LibaHeart from "@/components/LibaHeart";
import hero from "@/assets/liba-hero.jpg";

const LibaLanding = () => {
  return (
    <main dir="rtl" className="relative min-h-screen w-full overflow-hidden">
      {/* Full-screen background image */}
      <img
        src={hero}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Warm gradient overlay for readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, hsl(343 30% 20% / 0.35) 0%, hsl(343 25% 15% / 0.55) 55%, hsl(343 35% 10% / 0.75) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center text-white">
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* הלב של ליבה מעל הכותרת */}
          <div className="flex justify-center mb-2">
            <LibaHeart className="h-20 w-20 drop-shadow-[0_10px_28px_hsl(343_70%_40%/0.45)]" />
          </div>

          {/* Title */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-light tracking-tight leading-none">
            ליבה
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl font-light text-white/95 leading-relaxed max-w-md mx-auto">
            מרחב פרטי רק לנו. לשאול, לשתף, להתייעץ ולדבר בפתיחות&nbsp;בינינו. מחכות לך במרחב המיוחד הזה
          </p>

          {/* Entry buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link
              to="/liba"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[hsl(343_58%_58%)] text-white text-base font-medium shadow-lg shadow-[hsl(343_58%_58%/_0.35)] hover:bg-[hsl(343_55%_48%)] transition-all duration-300 hover:scale-[1.02]"
            >
              כניסה לליבה
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>

            <Link
              to="/liba"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white text-base font-light hover:bg-white/20 transition-all duration-300"
            >
              רוצה להצטרף?
            </Link>
          </div>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-8 left-0 right-0 px-6">
          <p className="text-sm font-light text-white/60">
            רק לחברות הקהילה · אחותי כלה
          </p>
        </div>
      </div>
    </main>
  );
};

export default LibaLanding;
