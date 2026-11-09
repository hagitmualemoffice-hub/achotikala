import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

type Ev = {
  id: string;
  title: string;
  event_date: string;
  city: string | null;
  status: string;
  event_type: string | null;
  end_date: string | null;
};

export default function AdminEventsList() {
  const [items, setItems] = useState<Ev[] | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("events_db")
      .select("id,title,event_date,end_date,city,status,event_type")
      .order("event_date", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Ev[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("למחוק את האירוע?")) return;
    const { error } = await supabase.from("events_db").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">אירועים</h1>
          <p className="text-sm text-muted-foreground">ניהול אירועים</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/admin/events/new?type=course"><Plus className="h-4 w-4 me-1" />סדרה חדשה</Link></Button>
          <Button asChild variant="outline">
            <Link to="/admin/events/templates">תבניות</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/events/new"><Plus className="h-4 w-4 me-1" />אירוע חדש</Link>
          </Button>
        </div>
      </div>
      <div className="bg-background border rounded-lg overflow-hidden">
        {items === null ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">אין אירועים עדיין.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">כותרת</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">עיר</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}{e.event_type === "course" && <Badge variant="secondary" className="ms-2">סדרה</Badge>}</TableCell>
                  <TableCell>{new Date(e.event_date).toLocaleDateString("he-IL")}{e.event_type === "course" && e.end_date ? ` – ${new Date(e.end_date).toLocaleDateString("he-IL")}` : ""}</TableCell>
                  <TableCell>{e.city ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === "published" ? "default" : "secondary"}>
                      {e.status === "published" ? "מפורסם" : "טיוטה"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    <Button asChild size="sm" variant="ghost"><Link to={`/admin/events/${e.id}/communications`}><Mail className="h-4 w-4 me-1" />פרסום ותזכורות</Link></Button>
                    <Button asChild size="sm" variant="ghost"><Link to={`/admin/events/${e.id}`}><Pencil className="h-4 w-4" /></Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
