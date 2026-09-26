import { useEffect, useState } from "react";
import { Heart, MessageCircle, Sparkles, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type ReactionType = "loved" | "spoke_to_me" | "want_to_refine" | "less";

const REACTIONS: { type: ReactionType; label: string; icon: typeof Heart }[] = [
  { type: "loved", label: "אהבתי", icon: Heart },
  { type: "spoke_to_me", label: "דיבר אלי", icon: Sparkles },
  { type: "want_to_refine", label: "רוצה לדייק", icon: MessageCircle },
  { type: "less", label: "פחות", icon: Minus },
];

type Comment = {
  id: string;
  author_name: string | null;
  content: string;
  created_at: string;
};

const MAX_LEN = 2000;

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
};

const BlogPostComments = ({ slug }: { slug: string }) => {
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    loved: 0,
    spoke_to_me: 0,
    want_to_refine: 0,
    less: 0,
  });
  const [myReactions, setMyReactions] = useState<Set<ReactionType>>(new Set());
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const storageKey = `blog_reactions_${slug}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMyReactions(new Set(JSON.parse(raw)));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [reactionsRes, commentsRes] = await Promise.all([
        supabase.from("blog_reactions").select("reaction_type").eq("slug", slug),
        supabase
          .from("blog_comments")
          .select("id, author_name, content, created_at")
          .eq("slug", slug)
          .order("created_at", { ascending: false }),
      ]);
      if (!mounted) return;
      if (reactionsRes.data) {
        const next = { loved: 0, spoke_to_me: 0, want_to_refine: 0, less: 0 } as Record<ReactionType, number>;
        for (const r of reactionsRes.data) {
          const t = r.reaction_type as ReactionType;
          if (t in next) next[t] += 1;
        }
        setCounts(next);
      }
      if (commentsRes.data) setComments(commentsRes.data as Comment[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const handleReaction = async (type: ReactionType) => {
    if (myReactions.has(type)) return;
    setCounts((c) => ({ ...c, [type]: c[type] + 1 }));
    const next = new Set(myReactions);
    next.add(type);
    setMyReactions(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
    } catch {}
    const { error } = await supabase
      .from("blog_reactions")
      .insert({ slug, reaction_type: type });
    if (error) {
      setCounts((c) => ({ ...c, [type]: Math.max(0, c[type] - 1) }));
      const rollback = new Set(next);
      rollback.delete(type);
      setMyReactions(rollback);
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(rollback)));
      } catch {}
      toast({ title: "לא הצלחנו לשמור את התגובה", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("blog_comments")
      .insert({
        slug,
        author_name: name.trim() || null,
        content: trimmed,
      })
      .select("id, author_name, content, created_at")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast({ title: "לא הצלחנו לפרסם את התגובה", description: error?.message, variant: "destructive" });
      return;
    }
    setComments((prev) => [data as Comment, ...prev]);
    setContent("");
    setName("");
    toast({ title: "תודה ששיתפת ❤️" });
  };

  return (
    <section className="w-full px-[30px] md:px-6 pt-2 md:pt-4 pb-2" dir="rtl">
      <div className="w-full md:w-[min(820px,92%)] mx-auto bg-card rounded-2xl md:rounded-[32px] shadow-[0_25px_70px_-20px_hsl(0_0%_0%_/_0.10)] px-6 md:px-16 py-9 md:py-14 text-right">
        {/* Quick reactions */}
        <h3 className="text-foreground text-xl md:text-2xl font-light mb-5 md:mb-6">
          במילה אחת:
        </h3>
        <div className="flex flex-wrap gap-2 md:gap-3 mb-10 md:mb-14">
          {REACTIONS.map(({ type, label, icon: Icon }) => {
            const active = myReactions.has(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleReaction(type)}
                disabled={active}
                className={`inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full border text-sm font-light transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary cursor-default"
                    : "bg-card text-foreground/80 border-border hover:bg-accent hover:text-accent-foreground hover:border-primary/30"
                }`}
                aria-pressed={active}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
                <span>{label}</span>
                {counts[type] > 0 && (
                  <span className={`text-xs ${active ? "text-primary-foreground/90" : "text-foreground/50"}`}>
                    {counts[type]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Comment form */}
        <h3 className="text-foreground text-xl md:text-2xl font-light mb-4 md:mb-5">
          שתפי אותנו במחשבות שלך
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="השם שלך (לא חובה)"
            maxLength={80}
            className="w-full px-4 md:px-5 py-3 rounded-xl border border-border bg-background text-foreground text-sm md:text-base font-light placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors"
          />
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_LEN))}
              placeholder="כתבי כאן..."
              rows={5}
              className="w-full px-4 md:px-5 py-3 rounded-xl border border-border bg-background text-foreground text-sm md:text-base font-light placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors resize-y min-h-[120px]"
            />
            <div className="absolute bottom-2 left-3 text-xs text-foreground/40 pointer-events-none">
              {content.length}/{MAX_LEN}
            </div>
          </div>
          <div className="flex justify-start">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-7 md:px-9 py-3 rounded-lg bg-primary text-primary-foreground text-sm md:text-base font-light shadow-md hover:bg-[hsl(var(--primary-glow))] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "שולח..." : "פרסום תגובה"}
            </button>
          </div>
        </form>

        {/* Comments list */}
        <div className="mt-10 md:mt-14 pt-6 md:pt-8 border-t border-border">
          {loading ? (
            <p className="text-foreground/50 text-sm font-light text-center">טוען תגובות...</p>
          ) : comments.length === 0 ? (
            <p className="text-foreground/60 text-sm md:text-base font-light text-center">
              עדיין אין כאן תגובות - בואי נפתח את השיחה 💛
            </p>
          ) : (
            <ul className="space-y-5 md:space-y-6">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="bg-accent/30 rounded-2xl px-5 md:px-7 py-4 md:py-5"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-primary text-sm md:text-base font-medium">
                      {c.author_name?.trim() || "אנונימית"}
                    </span>
                    <span className="text-foreground/50 text-xs font-light">
                      {formatDate(c.created_at)}
                    </span>
                  </div>
                  <p className="text-foreground/85 text-sm md:text-base font-light leading-relaxed whitespace-pre-wrap">
                    {c.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default BlogPostComments;
