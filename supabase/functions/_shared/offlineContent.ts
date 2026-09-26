// Shared builder for achotikala-content.json (Offline version content file).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ASSET_HOST = "https://achotikala.com";
// Keep well inside the edge worker memory budget: base64 roughly doubles each
// asset in memory, and the whole payload is stringified before upload.
const MEDIA_BUDGET = 10 * 1024 * 1024;
const MAX_ASSET_BYTES = 2 * 1024 * 1024;

const mediaUrls = (value: unknown) => {
  const text = JSON.stringify(value);
  const matches = text.match(/(?:https?:\/\/[^"\\ )]+\/(?:storage\/v1\/object\/(?:public|sign|authenticated)\/[^"\\ )]+|__l5e\/assets-v1\/[^"\\ )]+)|\/__l5e\/assets-v1\/[^"\\ )]+)/g) ?? [];
  return [...new Set(matches)];
};

const fetchableUrl = (url: string) =>
  (url.startsWith("http") ? url : ASSET_HOST + url).replace(/%2F/gi, "/");

const storageObject = (url: string) => {
  try {
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/media\/([^?]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

export type BuiltContent = {
  contentVersion: number;
  generatedAt: string;
  events: unknown[];
  posts: unknown[];
  podcast: unknown[];
  media: Record<string, string>;
};

export async function buildOfflineContent(
  admin: SupabaseClient,
  contentVersion: number,
  opts: { embedMedia?: boolean } = {},
): Promise<BuiltContent> {
  const embedMedia = opts.embedMedia !== false;
  const [events, posts, podcast] = await Promise.all([
    admin.from("events_db").select("*").eq("status", "published"),
    admin
      .from("blog_posts")
      .select(
        "id,slug,title,excerpt,content_html,cover_image,cover_alt,category_slug,author_name,publish_at,created_at",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    admin.from("podcast_episodes").select("*"),
  ]);
  if (events.error) throw events.error;
  if (posts.error) throw posts.error;

  const media: Record<string, string> = {};
  const referenced = embedMedia ? mediaUrls({ e: events.data, p: posts.data, c: podcast.data }) : [];
  let bytes = 0;
  for (const url of referenced) {
    if (bytes >= MEDIA_BUDGET) break;
    try {
      const objectPath = storageObject(url);
      let buf: Uint8Array;
      let contentType = "application/octet-stream";
      if (objectPath) {
        const { data, error } = await admin.storage.from("media").download(objectPath);
        if (error || !data) continue;
        buf = new Uint8Array(await data.arrayBuffer());
        contentType = data.type || contentType;
      } else {
        const res = await fetch(fetchableUrl(url));
        if (!res.ok) continue;
        buf = new Uint8Array(await res.arrayBuffer());
        contentType = res.headers.get("content-type") || contentType;
      }
      if (buf.length > MAX_ASSET_BYTES || bytes + buf.length > MEDIA_BUDGET) continue;
      bytes += buf.length;
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000)
        bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      media[url] = `data:${contentType};base64,${btoa(bin)}`;
    } catch {
      /* unreachable asset — skip silently */
    }
  }

  return {
    contentVersion,
    generatedAt: new Date().toISOString(),
    events: events.data ?? [],
    posts: posts.data ?? [],
    podcast: podcast.data ?? [],
    media,
  };
}
