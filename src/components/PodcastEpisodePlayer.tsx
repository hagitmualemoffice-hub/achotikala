import { useState } from "react";
import { Play, Headphones } from "lucide-react";
import { episodeMedia } from "@/data/podcastMedia";

/**
 * Plays a podcast episode straight from the achotikala domain — video or
 * audio-only — instead of linking to a Google Drive file (blocked by NetFree).
 */
const PodcastEpisodePlayer = ({ num, title }: { num: string; title: string }) => {
  const media = episodeMedia(num);
  const [mode, setMode] = useState<"none" | "video" | "audio">("none");
  if (!media) return null;

  const btn =
    "inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-light transition-colors";

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 md:gap-3 justify-start">
        <button
          type="button"
          onClick={() => setMode(mode === "video" ? "none" : "video")}
          className={`${btn} bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-glow))]`}
        >
          <Play className="w-4 h-4 fill-current" />
          {mode === "video" ? "סגירת הסרטון" : "צפייה בפרק"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "audio" ? "none" : "audio")}
          className={`${btn} bg-card border border-border text-foreground hover:bg-accent hover:text-accent-foreground`}
        >
          <Headphones className="w-4 h-4" />
          {mode === "audio" ? "סגירת ההאזנה" : "האזנה בלבד"}
        </button>
      </div>

      {mode === "video" && (
        <video
          key={media.video}
          src={media.video}
          controls
          playsInline
          preload="metadata"
          className="mt-4 w-full rounded-xl bg-foreground/5"
          aria-label={`הפרק ${title}`}
        />
      )}
      {mode === "audio" && (
        <audio
          key={media.audio}
          src={media.audio}
          controls
          preload="metadata"
          className="mt-4 w-full"
          aria-label={`האזנה לפרק ${title}`}
        />
      )}
    </div>
  );
};

export default PodcastEpisodePlayer;
