import { useEffect, useState } from 'react';
import { MessageCircle, Copy, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { loadWhatsappImage } from '@/admin/lib/whatsappShare';
import { toast } from 'sonner';

export default function WhatsappShare({ text, image }: { text: string; image?: string }) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    setFile(null);
    if (!image) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    void loadWhatsappImage(image, controller.signal).then(value => { if (!controller.signal.aborted) setFile(value); });
    return () => { controller.abort(); clearTimeout(timer); };
  }, [image]);
  const nativeShare = () => {
    try {
      if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
        void navigator.share({ files: [file], text }).catch(error => {
          if (error?.name !== 'AbortError') toast.error('השיתוף המשולב לא זמין; אפשר לפתוח את הטקסט ולהוריד את התמונה בנפרד.');
        });
      }
    } catch { toast.error('השיתוף המשולב לא זמין במכשיר הזה.'); }
  };
  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><MessageCircle className="h-4 w-4 me-2" />שיתוף בוואטסאפ</Button>
    <ResponsiveDialog open={open} onOpenChange={setOpen} contentClassName="max-h-[85dvh]">
        <div className="shrink-0 p-4">{mobile ? <h2 className="text-lg font-medium">שיתוף בוואטסאפ</h2> : <><DialogTitle>שיתוף בוואטסאפ</DialogTitle><DialogDescription className="sr-only">הודעה מוכנה לשיתוף</DialogDescription></>}</div>
        <div className="popup-scroll p-4"><Textarea aria-label="טקסט לשיתוף בוואטסאפ" readOnly value={text} className="min-h-48" /></div>
        <div className="popup-footer flex shrink-0 flex-wrap gap-2 p-4">
          <Button asChild><a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 me-2" />פתיחת הטקסט בוואטסאפ</a></Button>
          <Button variant="outline" onClick={() => { void navigator.clipboard?.writeText(text).then(() => toast.success('הטקסט הועתק')).catch(() => toast.error('אפשר לסמן ולהעתיק את הטקסט מהחלון.')); }}><Copy className="h-4 w-4 me-2" />העתקת הטקסט</Button>
          {file && <Button variant="outline" onClick={download}><Download className="h-4 w-4 me-2" />הורדת התמונה</Button>}
          {file && navigator.share && navigator.canShare?.({ files: [file] }) && <Button variant="outline" onClick={nativeShare}><Share2 className="h-4 w-4 me-2" />שיתוף תמונה וטקסט</Button>}
        </div>
    </ResponsiveDialog>
  </>;
}