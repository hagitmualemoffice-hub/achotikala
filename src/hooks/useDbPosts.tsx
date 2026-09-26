import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BlogPostData, BlogSection } from "@/data/blogPosts";
import { useOfflineRows } from "@/offline/offlineContent";
import { offlineMedia, offlineMediaHtml } from "@/offline/mediaMap";
import { fetchLiveRows, readLiveCache, writeLiveCache } from "@/offline/liveCache";

const CATEGORY_LABELS: Record<string, string> = {
  "yotzot-laor": "יוצאות לאור",
  "posts-ishiyim": "פוסט אישי",
  "lifney-hashiava": "לפני השייבה",
  "midaa-lehachlata": "מודעה להחלטה",
  "lifney-hatahalich": "לפני התהליך",
  "lifney-chibur": "לפני חיבור",
  "shimur-tahalich": "שימור תהליך",
  "acharei-hashiava": "אחרי השייבה",
  "shimur-poriut": "שימור פוריות",
};

const sectionFor = (categorySlug: string | null): BlogSection =>
  categorySlug === "yotzot-laor" ? "shirim" : "torim";

const hebrewDate = (iso: string) =>
  new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

type Row = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_html: string | null;
  cover_image: string | null;
  cover_alt: string | null;
  category_slug: string | null;
  author_name: string | null
  publish_at: string | null;
  created_at: string;
};

const mapRow = (row: Row): BlogPostData => {
  const html = offlineMediaHtml(row.content_html ?? "");
  const section = sectionFor(row.category_slug);
  return {
    slug: row.slug,
    section,
    category: CATEGORY_LABELS[row.category_slug ?? ""] ?? (section === "shirim" ? "שיר" : "טור אישי"),
    date: hebrewDate(row.publish_at ?? row.created_at),
    author: row.author_name ?? undefined,
    title: row.title,
    subtitle: row.excerpt ?? "",
    excerpt: row.excerpt ?? stripHtml(html).slice(0, 160),
    image: offlineMedia(row.cover_image) ?? "./placeholder.svg",
    tags: [],
    content:
      section === "shirim" ? (
        <div
          className="my-8 px-6 md:px-12 py-10 md:py-14 rounded-2xl bg-accent/40 text-foreground text-sm md:text-base font-light leading-[1.9] text-right whitespace-pre-line [&_p]:mb-4 [&_p]:leading-[1.9] [&_p:last-child]:mb-0 [&_a]:text-primary"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div
          className="[&_p]:mb-5 [&_h2]:text-xl [&_h2]:md:text-2xl [&_h2]:font-light [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-medium [&_ul]:list-disc [&_ul]:pr-6 [&_ol]:list-decimal [&_ol]:pr-6 [&_a]:text-primary [&_img]:rounded-xl [&_blockquote]:border-r-2 [&_blockquote]:border-primary/40 [&_blockquote]:pr-4 [&_blockquote]:text-foreground/70 whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ),
  };
};

/** Published posts coming from the admin CMS (Lovable Cloud). */
export const useDbPosts = () => {
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const offlineRows = useOfflineRows("posts");

  useEffect(() => {
    let active = true;
    const now = Date.now();
    if (offlineRows) {
      // Covers blog columns and songs (שירים) — both live in blog_posts.
      // Order: live → last live cache → baked snapshot; failures are silent.
      const visible = (rows: (Row & { status?: string })[]) =>
        rows
          .filter((r) => r.status === undefined || r.status === "published")
          .filter((r) => !r.publish_at || new Date(r.publish_at).getTime() <= Date.now())
          .map(mapRow);
      const cached = readLiveCache<Row & { status?: string }>("posts");
      setPosts(visible(cached ?? (offlineRows as (Row & { status?: string })[])));
      fetchLiveRows<Row>(() =>
        supabase
          .from("blog_posts")
          .select(
            "id, slug, title, excerpt, content_html, cover_image, cover_alt, category_slug, author_name, publish_at, created_at",
          )
          .eq("status", "published")
          .order("created_at", { ascending: false }),
      ).then((rows) => {
        if (!active || !rows || rows.length === 0) return;
        writeLiveCache("posts", rows);
        setPosts(visible(rows));
      });
      return () => {
        active = false;
      };
    }
    (async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id, slug, title, excerpt, content_html, cover_image, cover_alt, category_slug, author_name, publish_at, created_at",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (!active || error || !data) return;
      setPosts(
        (data as Row[])
          .filter((r) => !r.publish_at || new Date(r.publish_at).getTime() <= now)
          .map(mapRow),
      );
    })();
    return () => {
      active = false;
    };
  }, [offlineRows]);


  return posts;
};

export const dbPostsForSection = (posts: BlogPostData[], section: BlogSection) =>
  posts.filter((p) => p.section === section);
