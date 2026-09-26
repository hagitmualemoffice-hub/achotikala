import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { syncOfflineContent } from "@/admin/lib/offlineSync";
import { Plus, Loader2, Trash2, Save } from "lucide-react";
import CoverImagePicker from "@/admin/components/CoverImagePicker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Ep = {
  id: string; title: string; description: string | null;
  cover_image: string | null; spotify_url: string | null;
  apple_url: string | null; youtube_url: string | null;
  publish_date: string | null; episode_number: number | null; status: string;
};

const empty: Omit<Ep, "id"> = {
  title: "", description: "", cover_image: null, spotify_url: "",
  apple_url: "", youtube_url: "", publish_date: "", episode_number: null, status: "draft",
};

export default function AdminPodcast() {
  const [items, setItems] = useState<Ep[] | null>(null);
  const [editing, setEditing] = useState<(Omit<Ep, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("podcast_episodes")
      .select("*").order("episode_number", { ascending: false, nullsFirst: false });
    setItems((data as Ep[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title) return toast.error("חסרה כותרת");
    setSaving(true);
    try {
      const { id, ...payload } = editing;
      if (id) {
        const { error } = await supabase.from("podcast_episodes").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("podcast_episodes").insert(payload);
        if (error) throw error;
      }
      void syncOfflineContent();
      toast.success("נשמר"); setEditing(null); load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הפרק?")) return;
    const { error } = await supabase.from("podcast_episodes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">פודקאסט</h1>
          <p className="text-sm text-muted-foreground">ניהול פרקים</p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 me-1" />פרק חדש</Button>
      </div>

      {items === null ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="bg-background border rounded-lg p-8 text-center text-sm text-muted-foreground">אין פרקים עדיין.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((ep) => (
            <div key={ep.id} className="bg-background border rounded-lg overflow-hidden">
              {ep.cover_image && <img src={ep.cover_image} alt="" className="w-full aspect-video object-cover" />}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">{ep.title}</h3>
                  <Badge variant={ep.status === "published" ? "default" : "secondary"}>
                    {ep.status === "published" ? "מפורסם" : "טיוטה"}
                  </Badge>
                </div>
                {ep.description && <p className="text-xs text-muted-foreground line-clamp-2">{ep.description}</p>}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(ep)}>עריכה</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(ep.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editing?.id ? "עריכת פרק" : "פרק חדש"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>כותרת</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label>תיאור</Label><Textarea rows={4} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div>
                <Label>תמונת קאבר</Label>
                <CoverImagePicker
                  value={editing.cover_image}
                  onChange={(url) => setEditing({ ...editing, cover_image: url })}
                  aiContext={`${editing.title} - ${editing.description ?? ""}`}
                  contentType="podcast"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>מספר פרק</Label><Input type="number" value={editing.episode_number ?? ""} onChange={(e) => setEditing({ ...editing, episode_number: e.target.value ? parseInt(e.target.value) : null })} /></div>
                <div><Label>תאריך פרסום</Label><Input type="date" value={editing.publish_date ?? ""} onChange={(e) => setEditing({ ...editing, publish_date: e.target.value })} /></div>
                <div><Label>Spotify</Label><Input dir="ltr" value={editing.spotify_url ?? ""} onChange={(e) => setEditing({ ...editing, spotify_url: e.target.value })} /></div>
                <div><Label>Apple Podcasts</Label><Input dir="ltr" value={editing.apple_url ?? ""} onChange={(e) => setEditing({ ...editing, apple_url: e.target.value })} /></div>
                <div className="col-span-2"><Label>YouTube</Label><Input dir="ltr" value={editing.youtube_url ?? ""} onChange={(e) => setEditing({ ...editing, youtube_url: e.target.value })} /></div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { if (editing) { setEditing({ ...editing, status: "draft" }); setTimeout(save, 0); } }}>שמירת טיוטה</Button>
            <Button onClick={() => { if (editing) { setEditing({ ...editing, status: "published" }); setTimeout(save, 0); } }} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}<Save className="h-4 w-4 me-1" />שמירה ופרסום
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
