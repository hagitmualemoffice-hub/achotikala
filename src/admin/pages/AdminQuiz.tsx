import { useCallback, useEffect, useState } from "react";
import { Loader2, PartyPopper, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { drawQuizWinners, fetchQuizAdmin, type QuizAdminData } from "@/community/v1/quiz";
import { Button } from "@/components/ui/button";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("he-IL") : "—");

const statusOf = (r: QuizAdminData["rows"][number]) =>
  r.flamingo_at ? "השלימה" : r.solved_at ? "פתרה — מחכה לפלמינגו" : "לא השלימה";

export default function AdminQuiz() {
  const [data, setData] = useState<QuizAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchQuizAdmin());
    } catch {
      toast.error("לא הצלחנו לטעון את נתוני ההגרלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const draw = async () => {
    if (!window.confirm("להגריל שתי זוכות? ההגרלה מתבצעת פעם אחת ונשמרת.")) return;
    setDrawing(true);
    try {
      setData(await drawQuizWinners());
      toast.success("ההגרלה בוצעה");
    } catch {
      toast.error("ההגרלה לא בוצעה");
    } finally {
      setDrawing(false);
    }
  };

  const winners = (data?.rows ?? []).filter((r) => r.winner_rank !== null);

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-light text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            הגרלת מה חדש בליבה
          </h1>
          <p className="mt-1 text-sm font-light text-muted-foreground">
            מי פתרה את החידה, מי שלחה את הפלמינגו — ומי זכתה.
          </p>
        </div>
        <Button onClick={draw} disabled={drawing || winners.length > 0}>
          {drawing && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
          {winners.length > 0 ? "ההגרלה כבר בוצעה" : "הגרילי 2 זוכות"}
        </Button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-16 text-sm font-light text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> טוענות…
        </p>
      ) : !data ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "התחילו", value: data.started },
              { label: "פתרו נכון", value: data.solved },
              { label: "השלימו ושלחו 🦩", value: data.completed },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm"
              >
                <p className="text-2xl font-light text-primary">{s.value}</p>
                <p className="mt-1 text-xs font-light text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {winners.length > 0 && (
            <div className="rounded-2xl border border-primary/40 bg-primary/[0.06] px-5 py-4">
              <p className="flex items-center gap-2 text-sm text-primary">
                <PartyPopper className="h-4 w-4" />
                הזוכות
              </p>
              <ul className="mt-2 space-y-1 text-sm font-light text-foreground">
                {winners
                  .sort((a, b) => (a.winner_rank ?? 0) - (b.winner_rank ?? 0))
                  .map((w) => (
                    <li key={w.user_id}>
                      {w.winner_rank}. {w.name}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
            <table className="w-full text-start text-sm">
              <thead className="bg-muted/40 text-xs font-light text-muted-foreground">
                <tr>
                  {["שם", "מזהה", "ניסיונות", "פתרה", "שלחה 🦩", "סטטוס"].map((h) => (
                    <th key={h} className="px-4 py-3 text-start font-light">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.rows.map((r) => (
                  <tr key={r.user_id}>
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3 text-[11px] font-light text-muted-foreground" dir="ltr">
                      {r.user_id}
                    </td>
                    <td className="px-4 py-3 font-light">{r.attempts}</td>
                    <td className="px-4 py-3 font-light">{fmt(r.solved_at)}</td>
                    <td className="px-4 py-3 font-light">{fmt(r.flamingo_at)}</td>
                    <td className="px-4 py-3 font-light">{statusOf(r)}</td>
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center font-light text-muted-foreground">
                      עוד אף אחת לא התחילה את החידה.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
