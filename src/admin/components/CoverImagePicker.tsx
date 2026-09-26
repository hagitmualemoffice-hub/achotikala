import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { uploadToMedia, uploadBase64ToMedia } from "@/admin/lib/media";
import { toast } from "sonner";
import { Loader2, Sparkles, Upload, X, RefreshCw, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  aiContext: string; // text used to generate the AI prompt
  contentType?: "poem" | "personal" | "article" | "event" | "podcast";
}

const STYLE_LABELS: Record<string, string> = {
  poem: "שיר · יוצאות לאור (טורקיז־תכלת)",
  personal: "טור אישי (ורוד)",
  article: "מאמר (ורוד)",
  event: "אירוע (ורוד)",
  podcast: "פודקאסט (ורוד)",
};

export default function CoverImagePicker({ value, onChange, aiContext, contentType }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [style, setStyle] = useState<string>(contentType ?? "personal");
  const [aiVariants, setAiVariants] = useState<{ dataUrl: string; prompt: string }[]>([]);


  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadToMedia(file, file.name);
      onChange(url);
      toast.success("תמונה הועלתה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהעלאה");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const generate = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content-image", {
        body: {
          content: aiContext || "מאמר על נשים רווקות חרדיות",
          customPrompt: aiPrompt || undefined,
          contentType: style,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiVariants((prev) => [{ dataUrl: data.dataUrl, prompt: data.prompt }, ...prev]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת תמונה");
    } finally {
      setAiLoading(false);
    }
  };

  const chooseVariant = async (dataUrl: string) => {
    try {
      const base64 = dataUrl.split(",")[1];
      const { url } = await uploadBase64ToMedia(base64, `ai-${Date.now()}.png`);
      onChange(url);
      setAiOpen(false);
      setAiVariants([]);
      setAiPrompt("");
      toast.success("התמונה נשמרה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירה");
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-lg overflow-hidden border bg-muted/20 aspect-video">
          <img src={value} alt="cover" className="w-full h-full object-cover" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-2 left-2 h-8 w-8"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed p-8 text-center bg-muted/10">
          <p className="text-sm text-muted-foreground mb-3">אין תמונת קאבר</p>
          <div className="flex gap-2 justify-center">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Upload className="h-4 w-4 me-1" />}
              העלאה מהמחשב
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAiOpen(true)}>
              <Sparkles className="h-4 w-4 me-1" />
              יצירה עם AI
            </Button>
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {value && (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 me-1" />
            החלפה
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-3.5 w-3.5 me-1" />
            יצירת חלופה עם AI
          </Button>
        </div>
      )}

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>יצירת תמונה עם AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">סגנון התמונה</label>
              <p className="text-xs text-muted-foreground mb-1">
                כל התמונות בסגנון האקוורל של האתר. הסגנון קובע גם את הצבעים — שירים בטורקיז־תכלת, פוסטים ומאמרים בוורוד.
              </p>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              >
                {Object.entries(STYLE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div>

              <label className="text-sm font-medium">פרומפט מותאם (אופציונלי)</label>
              <p className="text-xs text-muted-foreground mb-1">
                השאירי ריק כדי שה־AI ינתח את תוכן הפוסט/אירוע ויציע פרומפט לבד.
              </p>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="למשל: זר פרחי אדמונית ורדרדים על שולחן עץ עם קרן שמש..."
                rows={2}
              />
            </div>
            <Button type="button" onClick={generate} disabled={aiLoading} className="w-full">
              {aiLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin me-2" />יוצרת תמונה...</>
              ) : aiVariants.length ? (
                <><RefreshCw className="h-4 w-4 me-2" />צרי גרסה נוספת</>
              ) : (
                <><Sparkles className="h-4 w-4 me-2" />צרי תמונה</>
              )}
            </Button>

            {aiVariants.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {aiVariants.map((v, i) => (
                  <div key={i} className="border rounded-lg overflow-hidden group relative">
                    <img src={v.dataUrl} alt="variant" className="w-full aspect-video object-cover" />
                    <div className="p-2 flex justify-between items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate flex-1" title={v.prompt}>
                        {v.prompt}
                      </p>
                      <Button size="sm" onClick={() => chooseVariant(v.dataUrl)}>
                        <Check className="h-3.5 w-3.5 me-1" />
                        בחירה
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAiOpen(false)}>
              סגירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
