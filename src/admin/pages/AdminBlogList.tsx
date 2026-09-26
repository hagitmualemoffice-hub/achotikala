import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Post = {
  id: string;
  title: string;
  slug: string;
  category_slug: string | null;
  status: string;
  publish_at: string | null;
  updated_at: string;
};

const statusLabels: Record<string, string> = {
  draft: "טיוטה",
  published: "מפורסם",
  scheduled: "מתוזמן",
};

export default function AdminBlogList() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id,title,slug,category_slug,status,publish_at,updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setPosts([]);
      return;
    }
    setPosts(data as Post[]);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm("למחוק את הפוסט?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("הפוסט נמחק");
    load();
  };

  const filtered =
    posts?.filter((p) => !q || p.title.includes(q) || p.slug.includes(q)) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">בלוג</h1>
          <p className="text-sm text-muted-foreground">ניהול פוסטים</p>
        </div>
        <Button asChild>
          <Link to="/admin/blog/new">
            <Plus className="h-4 w-4 me-1" />
            פוסט חדש
          </Link>
        </Button>
      </div>

      <Input
        placeholder="חיפוש..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />

      <div className="bg-background border rounded-lg overflow-hidden">
        {filtered === null ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            אין פוסטים עדיין. לחצי על "פוסט חדש" כדי להתחיל.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">כותרת</TableHead>
                <TableHead className="text-right">קטגוריה</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">עודכן</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category_slug ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "published" ? "default" : "secondary"}>
                      {statusLabels[p.status] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString("he-IL")}
                  </TableCell>
                  <TableCell className="text-left">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/admin/blog/${p.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
