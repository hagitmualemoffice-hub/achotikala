import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Tpl = { id: string; name: string; category: string | null; cover_image: string | null };

export default function AdminEventTemplates() {
  const [items, setItems] = useState<Tpl[] | null>(null);

  const load = async () => {
    const { data } = await supabase.from("event_templates").select("id,name,category,cover_image").order("name");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("למחוק את התבנית?")) return;
    const { error } = await supabase.from("event_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחקה"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">תבניות אירועים</h1>
          <p className="text-sm text-muted-foreground">
            שמרי אירועים כתבניות (קוראת בקפה, סדנאות...) והשתמשי בהן ליצירת אירועים חוזרים במהירות.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/events/new"><Plus className="h-4 w-4 me-1" />יצירה מאירוע קיים</Link>
        </Button>
      </div>

      {items === null ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="bg-background border rounded-lg p-8 text-center text-sm text-muted-foreground">
          אין תבניות עדיין. פתחי אירוע ולחצי "שמירה כתבנית".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <div key={t.id} className="bg-background border rounded-lg overflow-hidden">
              {t.cover_image && <img src={t.cover_image} alt="" className="w-full aspect-video object-cover" />}
              <div className="p-4">
                <h3 className="font-medium">{t.name}</h3>
                {t.category && <p className="text-xs text-muted-foreground">{t.category}</p>}
                <div className="flex gap-2 mt-3">
                  <Button asChild size="sm" className="flex-1">
                    <Link to={`/admin/events/new?template=${t.id}`}>יצירת אירוע</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
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
