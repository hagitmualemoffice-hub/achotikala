import { useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import logo from "@/assets/logo-achoti-kala.png";
import {
  getPostsBySection,
  SECTION_META,
  POEM_TOPIC_META,
  type BlogSection as Section,
  type PoemTopic,
} from "@/data/blogPosts";
import { useDbPosts, dbPostsForSection } from "@/hooks/useDbPosts";
import { cn } from "@/lib/utils";

const validSections: Section[] = ["torim", "shirim", "tochen"];
const topicOrder: PoemTopic[] = ["ravakot", "etgarim", "optimi"];

const BlogSectionPage = () => {
  const { section } = useParams<{ section: string }>();
  const [activeTopic, setActiveTopic] = useState<PoemTopic | "all">("all");
  const dbPosts = useDbPosts();

  if (!section || !validSections.includes(section as Section)) {
    return <Navigate to="/blog" replace />;
  }
  const sec = section as Section;
  const meta = SECTION_META[sec];
  const allPosts = [...dbPostsForSection(dbPosts, sec), ...getPostsBySection(sec)];

  const posts = useMemo(() => {
    if (sec !== "shirim" || activeTopic === "all") return allPosts;
    return allPosts.filter((p) => p.topic === activeTopic);
  }, [sec, allPosts, activeTopic]);

  const availableTopics = useMemo(() => {
    if (sec !== "shirim") return [] as PoemTopic[];
    const present = new Set(allPosts.map((p) => p.topic).filter(Boolean) as PoemTopic[]);
    return topicOrder.filter((t) => present.has(t));
  }, [sec, allPosts]);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0" dir="rtl">
      <div className="hidden lg:block">
        <SiteHeader />
      </div>

      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-center px-5 py-3">
          <Link to="/" aria-label="אחותי כלה - דף הבית">
            <img src={logo} alt="אחותי כלה" className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <div className="h-12 md:h-20" />

      <section className="w-full pt-6 pb-8 md:pt-20 md:pb-12 px-[30px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto text-right">
          <Link
            to="/blog"
            className="inline-block text-primary text-xs md:text-sm font-light mb-4 hover:text-[hsl(var(--primary-glow))]"
          >
            → חזרה לבלוג
          </Link>
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
            <span className="block w-1 h-8 md:h-12 bg-primary rounded-full" />
            <h1 className="text-foreground text-[1.75rem] md:text-5xl font-light tracking-tight leading-tight">
              {meta.label}
            </h1>
          </div>
          <p className="text-foreground/70 text-sm md:text-lg font-light max-w-2xl pr-3 md:pr-5 leading-relaxed">
            {meta.description}
          </p>

          {availableTopics.length > 0 && (
            <div className="mt-6 md:mt-8 flex flex-wrap gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setActiveTopic("all")}
                className={cn(
                  "px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-light transition-all",
                  activeTopic === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-accent text-foreground/70 hover:bg-accent/70",
                )}
              >
                הכל
              </button>
              {availableTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTopic(t)}
                  className={cn(
                    "px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-light transition-all",
                    activeTopic === t
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-accent text-foreground/70 hover:bg-accent/70",
                  )}
                >
                  {POEM_TOPIC_META[t].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="w-full pb-16 md:pb-24 px-[30px] md:px-6">
        <div className="w-full md:w-[min(1100px,82%)] mx-auto">
          {posts.length === 0 ? (
            <p className="text-foreground/60 text-base font-light text-center py-10">
              עוד לא פורסמו פוסטים בקטגוריה הזו. בקרוב!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
              {posts.map((post) => (
                <Link
                  to={`/blog/${post.slug}`}
                  key={post.slug}
                  className="group bg-card rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_10px_30px_-15px_hsl(0_0%_0%_/_0.1)] hover:shadow-[0_20px_45px_-15px_hsl(var(--primary)/0.22)] transition-all duration-300 hover:-translate-y-1 flex flex-col"
                >
                  <div className="relative h-44 md:h-52 overflow-hidden bg-accent">
                    <img
                      src={post.image}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6 md:p-7 text-right flex flex-col flex-1">
                    <div className="flex items-center justify-start gap-3 mb-3">
                      <span className="inline-block px-3 py-1 rounded-md bg-accent text-primary text-xs font-light">
                        {post.category}
                      </span>
                      <span className="text-foreground/50 text-xs font-light">
                        {post.author ?? post.date}
                      </span>
                    </div>
                    <h3 className="text-foreground text-base md:text-xl font-light leading-tight mb-3 group-hover:text-primary transition-colors whitespace-pre-line">
                      {post.title}
                    </h3>
                    {post.section !== "shirim" && (
                      <p className="text-foreground/70 text-sm font-light leading-relaxed mb-5 md:mb-6 flex-1">
                        {post.excerpt}
                      </p>
                    )}
                    {post.section === "shirim" && <div className="flex-1 mb-5 md:mb-6" />}
                    <span className="self-start text-primary text-sm font-medium group-hover:text-[hsl(var(--primary-glow))] transition-colors">
                      להמשיך לקרוא ←
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <MobileBottomNav />
    </div>
  );
};

export default BlogSectionPage;
