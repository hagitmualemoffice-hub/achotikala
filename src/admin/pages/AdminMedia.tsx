import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Trash2, Copy } from "lucide-react";
import { uploadToMedia } from "@/admin/lib/media";
import { toast } from "sonner";

type Asset = {
  id: string; storage_path: string; public_url: string; filename: string;
  alt_text: string | null; created_at: string;
};

export default function AdminMedia() {
  const [items, setItems] = useState<Asset[] | null>(null);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false });
    setItems((data as Asset[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        await uploadToMedia(f, f.name);
      }
      toast.success("הועלה בהצלחה");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (a: Asset) => {
    if (!confirm(`למחוק את ${a.filename}?`)) return;
    await supabase.storage.from("media").remove([a.storage_path]);
    await supabase.from("media_assets").delete().eq("id", a.id);
    toast.success("נמחק"); load();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("הועתק");
  };

  const filtered = items?.filter((a) => !q || a.filename.includes(q)) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-medium">ספריית מדיה</h1>
          <p className="text-sm text-muted-foreground">כל התמונות באתר</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Upload className="h-4 w-4 me-1" />}
          העלאת תמונות
        </Button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} className="hidden" />
      </div>

      <Input placeholder="חיפוש לפי שם קובץ..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />

      {filtered === null ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-background border rounded-lg p-8 text-center text-sm text-muted-foreground">אין תמונות עדיין.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((a) => (
            <div key={a.id} className="bg-background border rounded-lg overflow-hidden group">
              <div className="aspect-square bg-muted/20">
                <img src={a.public_url} alt={a.alt_text ?? a.filename} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="p-2 space-y-1">
                <div className="text-xs truncate" title={a.filename}>{a.filename}</div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="flex-1 h-7 px-2" onClick={() => copyUrl(a.public_url)}>
                    <Copy className="h-3 w-3 me-1" />URL
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => remove(a)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
