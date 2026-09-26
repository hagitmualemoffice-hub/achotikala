import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, LogOut, RefreshCw, Send, WifiOff } from "lucide-react";
import { useCommunitySession } from "@/community/useCommunitySession";
import SiteHeader from "@/components/SiteHeader";

type Post = {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

type Comment = Post & { post_id: string };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      toast.success("התחברת בהצלחה");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        /fetch|network/i.test(msg)
          ? "הקהילה זמינה כשיש חיבור לרשת."
          : "האימייל או הסיסמה אינם נכונים",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm mx-auto bg-background rounded-xl border p-6 space-y-4"
    >
      <div className="text-center">
        <h1 className="text-xl font-medium">הקהילה</h1>
        <p className="text-sm text-muted-foreground mt-1">אזור סגור לחברות הקהילה</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-email">אימייל</Label>
        <Input
          id="c-email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-pass">סיסמה</Label>
        <Input
          id="c-pass"
          type="password"
          required
          dir="ltr"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
        התחברות
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        פתיחת חשבון מתבצעת כרגע על ידי צוות אחותי כלה.
      </p>
    </form>
  );
}

function CommentList({
  postId,
  comments,
  onAdded,
  authorName,
  userId,
}: {
  postId: string;
  comments: Comment[];
  onAdded: () => void;
  authorName: string;
  userId: string;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    const { error } = await supabase.from("forum_comments").insert({
      post_id: postId,
      author_id: userId,
      author_name: authorName,
      content,
    });
    setSending(false);
    if (error) {
      toast.error("שליחת התגובה נכשלה");
      return;
    }
    setText("");
    onAdded();
  };

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="text-sm bg-muted/40 rounded-lg p-2.5">
          <div className="text-xs text-muted-foreground mb-1">
            {c.author_name} · {fmt(c.created_at)}
          </div>
          <div className="whitespace-pre-wrap">{c.content}</div>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="כתיבת תגובה…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={send} disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function Feed({ userId, authorName }: { userId: string; authorName: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        supabase.from("forum_posts").select("*").order("created_at", { ascending: false }),
        supabase.from("forum_comments").select("*").order("created_at", { ascending: true }),
      ]);
      if (p.error) throw p.error;
      if (c.error) throw c.error;
      setPosts((p.data ?? []) as Post[]);
      setComments((c.data ?? []) as Comment[]);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async () => {
    const content = newPost.trim();
    if (!content) return;
    setPosting(true);
    const { error } = await supabase
      .from("forum_posts")
      .insert({ author_id: userId, author_name: authorName, content });
    setPosting(false);
    if (error) {
      toast.error("פרסום הפוסט נכשל");
      return;
    }
    setNewPost("");
    void load();
  };

  if (failed) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <WifiOff className="h-6 w-6 mx-auto mb-2" />
        הקהילה זמינה כשיש חיבור לרשת.
        <div className="mt-4">
          <Button variant="outline" onClick={load}>
            נסי שוב
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-background rounded-xl border p-4 space-y-3">
        <Textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="מה את רוצה לשתף עם הקהילה?"
          rows={3}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">מפרסמת בשם {authorName}</span>
          <Button onClick={publish} disabled={posting}>
            {posting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            פרסום
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-medium">פוסטים אחרונים</h2>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 me-1.5 ${loading ? "animate-spin" : ""}`} />
          רענון
        </Button>
      </div>

      {posts.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">עוד אין פוסטים. את מוזמנת לפתוח את השיחה.</p>
      )}

      {posts.map((post) => (
        <article key={post.id} className="bg-background rounded-xl border p-4">
          <div className="text-xs text-muted-foreground mb-1.5">
            {post.author_name} · {fmt(post.created_at)}
          </div>
          <div className="whitespace-pre-wrap">{post.content}</div>
          <CommentList
            postId={post.id}
            comments={comments.filter((c) => c.post_id === post.id)}
            onAdded={load}
            authorName={authorName}
            userId={userId}
          />
        </article>
      ))}
    </div>
  );
}

export default function Community() {
  const { loading, session, status, displayName, offline, refresh } = useCommunitySession();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("התנתקת");
  };

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <SiteHeader />
      <main className="pt-24 pb-28 px-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !session ? (
          <LoginCard />
        ) : offline ? (
          <div className="text-center text-muted-foreground py-16">
            <WifiOff className="h-6 w-6 mx-auto mb-2" />
            הקהילה זמינה כשיש חיבור לרשת.
            <div className="mt-4">
              <Button variant="outline" onClick={refresh}>
                נסי שוב
              </Button>
            </div>
          </div>
        ) : status !== "approved" ? (
          <div className="max-w-sm mx-auto bg-background rounded-xl border p-6 text-center space-y-3">
            <h1 className="text-lg font-medium">הקהילה</h1>
            <p className="text-sm text-muted-foreground">
              {status === "blocked"
                ? "הגישה לקהילה חסומה עבור החשבון הזה."
                : "החשבון שלך עדיין לא אושר לכניסה לקהילה."}
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 me-1.5" />
              התנתקות
            </Button>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-medium">הקהילה</h1>
                <p className="text-sm text-muted-foreground">שלום {displayName}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 me-1.5" />
                התנתקות
              </Button>
            </header>
            <Feed userId={session.user.id} authorName={displayName} />
          </>
        )}
      </main>
    </div>
  );
}
