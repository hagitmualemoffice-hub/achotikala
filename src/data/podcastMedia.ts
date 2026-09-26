/**
 * Podcast episode media (compressed 480p video + audio-only track).
 *
 * Everything is streamed through our own `podcast-media` endpoint — the same
 * first-party server the offline folder uses for updates. That endpoint stays
 * reachable for NetFree users, while both Google Drive links and the
 * achotikala.com CDN are blocked for them.
 * The files are intentionally NOT bundled into the offline folder (too large)
 * — see scripts/build-offline.mjs.
 */
const ENDPOINT = "https://fwwgvmkksdcrysddyiur.supabase.co/functions/v1/podcast-media";

export type EpisodeMedia = { video: string; audio: string };

const entry = (num: number): EpisodeMedia => ({
  video: `${ENDPOINT}?ep=${num}&type=video`,
  audio: `${ENDPOINT}?ep=${num}&type=audio`,
});

export const podcastMedia: Record<string, EpisodeMedia> = {
  "1": entry(1),
  "2": entry(2),
  "3": entry(3),
  "4": entry(4),
  "5": entry(5),
};

/** Accepts "1" as well as "01". */
export const episodeMedia = (num: string): EpisodeMedia | undefined =>
  podcastMedia[String(Number(num))];
