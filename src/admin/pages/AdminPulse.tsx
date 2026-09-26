import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PulseCheckEditor from "@/community/v1/PulseCheckEditor";
import {
  deletePulse,
  fetchPulseChecks,
  setPulseState,
  type PulseCheck,
} from "@/community/v1/api";
import { spaceById } from "@/community/v1/spaces";
import { Button } from "@/components/ui/button";

/** A pulse-check lives for 24 hours from the moment it was published. */
const LIVE_MS = 24 * 60 * 60 * 1000;
const isLive = (p: PulseCheck) =>
  p.status === "open" && Date.now() - new Date(p.created_at).getTime() < LIVE_MS;

/**
 * "בדיקת דופק" is created and managed only here, in the site's admin area —
 * never from the community screen itself.
 */
export default function AdminPulse() {
  const [list, setList] = useState<PulseCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PulseCheck | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await fetchPulseChecks(null, true));
    } catch {
      toast.error("לא הצלחנו לטעון את בדיקות הדופק");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [list],
  );

  const patch = async (p: PulseCheck, next: Parameters<typeof setPulseState>[1]) => {
    try {
      const updated = await setPulseState(p.id, next);
      setList((cur) => cur.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      toast.error("הפעולה לא הושלמה");
    }
  };

  const remove = async (p: PulseCheck) => {
    if (!window.confirm("למחוק את בדיקת הדופק וכל התשובות שלה?")) return;
    try {
      await deletePulse(p.id);
      setList((cur) => cur.filter((x) => x.id !== p.id));
      toast.success("נמחק");
    } catch {
      toast.error("המחיקה לא הושלמה");
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-light text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            בדיקת דופק
          </h1>
          <p className="mt-1 text-sm font-light text-muted-foreground">
            כל בדיקת דופק מוצגת בקהילה 24 שעות מרגע הפרסום, ואז נעלמת מעצמה.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="me-1.5 h-4 w-4" />
          בדיקת דופק חדשה
        </Button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-16 text-sm font-light text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> טוענות…
        </p>
      ) : sorted.length === 0 ? (
        <p className="py-16 text-center text-sm font-light text-muted-foreground">
          עוד לא פורסמה בדיקת דופק.
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-normal text-foreground">{p.title}</p>
                  <p className="mt-1 text-xs font-light text-muted-foreground">
                    {spaceById(p.space).shortName} ·{" "}
                    {new Date(p.created_at).toLocaleString("he-IL")} ·{" "}
                    {p.total_voters} השתתפו ·{" "}
                    {isLive(p)
                      ? "מוצגת עכשיו בקהילה"
                      : p.status === "archived"
                        ? "בארכיון"
                        : "לא מוצגת (נסגרה או עברו 24 שעות)"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(p);
                      setEditorOpen(true);
                    }}
                  >
                    עריכה
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      patch(p, { status: p.status === "open" ? "closed" : "open" })
                    }
                  >
                    {p.status === "open" ? "סגירה" : "פתיחה"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => patch(p, { status: "archived" })}
                  >
                    ארכיון
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(p)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PulseCheckEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editing}
        onSaved={() => void load()}
      />
    </div>
  );
}
