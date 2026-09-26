/** Shape of achotikala-content.json — the small, frequently-updated content file. */
export type OfflineContent = {
  contentVersion: number;
  generatedAt: string;
  /** rows of events_db */
  events: unknown[];
  /** published rows of blog_posts */
  posts: unknown[];
  /** rows of podcast_episodes */
  podcast: unknown[];
  /**
   * New media that did not exist in the downloaded folder, embedded as data URLs
   * (`{ "/__l5e/assets-v1/…/cover.jpg": "data:image/jpeg;base64,…" }`).
   * Lets images / audio arrive with the content file itself — no extra domain,
   * no CDN request, works behind NetFree.
   */
  media?: Record<string, string>;
};

export type UpdateSource = { type: "url"; url: string; label?: string };

export type UpdateStatus = "idle" | "checking" | "updated" | "current" | "offline";
