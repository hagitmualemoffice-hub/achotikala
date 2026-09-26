import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { syncOfflineContent } from "@/admin/lib/offlineSync";
import { Loader2, Save, ArrowRight } from "lucide-react";
import RichTextEditor from "@/admin/components/RichTextEditor";
import CoverImagePicker from "@/admin/components/CoverImagePicker";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

type Category = { slug: string; name: string };

const emptyPost = {
  title: "",
  slug: "",
  excerpt: "",
  content_html: "",
  cover_image: null as string | null,
  cover_alt: "",
  category_slug: "",
  seo_title: "",
  seo_description: "",
  status: "draft",
  publish_at: "" as string,
  author_name: "",
};

export default function AdminBlogEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [post, setPost] = useState(emptyPost);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    supabase
      .from("blog_categories")
      .select("slug,name")
      .order("sort_order")
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) toast.error(error.message);
      else if (data)
        setPost({
          title: data.title ?? "",
          slug: data.slug ?? "",
          excerpt: data.excerpt ?? "",
          content_html: data.content_html ?? "",
          cover_image: data.cover_image,
          cover_alt: data.cover_alt ?? "",
          category_slug: data.category_slug ?? "",
          seo_title: data.seo_title ?? "",
          seo_description: data.seo_description ?? "",
          status: data.status ?? "draft",
          publish_at: data.publish_at ?? "",
          author_name: data.author_name ?? "",
        });
      setLoading(false);
    })();
  }, [id, isNew]);

  const save = async (statusOverride?: string) => {
    if (!post.title.trim()) return toast.error("חסרה כותרת");
    setSaving(true);
    try {
      const payload = {
        title: post.title.trim(),
        slug: post.slug.trim() || slugify(post.title),
        excerpt: post.excerpt || null,
        content_html: post.content_html || null,
        cover_image: post.cover_image,
        cover_alt: post.cover_alt || null,
        category_slug: post.category_slug || null,
        seo_title: post.seo_title || null,
        seo_description: post.seo_description || null,
        status: statusOverride ?? post.status,
        publish_at: post.publish_at || null,
        author_name: post.author_name || null,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("blog_posts")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("הפוסט נוצר");
        void syncOfflineContent();
        navigate(`/admin/blog/${data.id}`, { replace: true });
      } else {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", id!);
        if (error) throw error;
        toast.success("נשמר");
        void syncOfflineContent();
        if (statusOverride) setPost((p) => ({ ...p, status: statusOverride }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const aiContext = `${post.title}\n\n${post.excerpt}\n\n${post.content_html.replace(/<[^>]+>/g, " ").slice(0, 1500)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/blog")}>
            <ArrowRight className="h-4 w-4 me-1" />
            חזרה
          </Button>
          <h1 className="text-xl font-medium">{isNew ? "פוסט חדש" : "עריכת פוסט"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save("draft")} disabled={saving}>
            שמירת טיוטה
          </Button>
          <Button onClick={() => save("published")} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
            <Save className="h-4 w-4 me-1" />
            פרסום
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <Label>כותרת</Label>
            <Input
              value={post.title}
              onChange={(e) => {
                const title = e.target.value;
                setPost((p) => ({
                  ...p,
                  title,
                  slug: p.slug || slugify(title),
                }));
              }}
              className="text-lg"
              placeholder="כותרת הפוסט"
            />
          </div>
          <div>
            <Label>תקציר קצר</Label>
            <Textarea
              value={post.excerpt}
              onChange={(e) => setPost((p) => ({ ...p, excerpt: e.target.value }))}
              rows={2}
            />
          </div>
          <div>
            <Label>תוכן הפוסט</Label>
            <RichTextEditor
              value={post.content_html}
              onChange={(html) => setPost((p) => ({ ...p, content_html: html }))}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-background border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">תמונת קאבר</h3>
            <CoverImagePicker
              value={post.cover_image}
              onChange={(url) => setPost((p) => ({ ...p, cover_image: url }))}
              aiContext={aiContext}
              contentType={post.category_slug === "yotzot-laor" ? "poem" : "personal"}
            />
            <Input
              value={post.cover_alt}
              onChange={(e) => setPost((p) => ({ ...p, cover_alt: e.target.value }))}
              placeholder="טקסט חלופי לתמונה"
            />
          </div>

          <div className="bg-background border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">פרסום</h3>
            <div>
              <Label className="text-xs">קטגוריה</Label>
              <Select
                value={post.category_slug || undefined}
                onValueChange={(v) => setPost((p) => ({ ...p, category_slug: v }))}
              >
                <SelectTrigger><SelectValue placeholder="בחירת קטגוריה" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">תיזמון פרסום (אופציונלי)</Label>
              <Input
                type="datetime-local"
                value={post.publish_at ? post.publish_at.slice(0, 16) : ""}
                onChange={(e) =>
                  setPost((p) => ({
                    ...p,
                    publish_at: e.target.value ? new Date(e.target.value).toISOString() : "",
                    status: e.target.value ? "scheduled" : p.status,
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">שם המחברת</Label>
              <Input
                value={post.author_name}
                onChange={(e) => setPost((p) => ({ ...p, author_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="bg-background border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">SEO</h3>
            <div>
              <Label className="text-xs">כתובת (slug)</Label>
              <Input
                dir="ltr"
                value={post.slug}
                onChange={(e) => setPost((p) => ({ ...p, slug: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">כותרת ל־SEO</Label>
              <Input
                value={post.seo_title}
                onChange={(e) => setPost((p) => ({ ...p, seo_title: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">תיאור ל־SEO</Label>
              <Textarea
                value={post.seo_description}
                onChange={(e) => setPost((p) => ({ ...p, seo_description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
