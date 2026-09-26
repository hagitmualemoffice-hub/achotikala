/**
 * "היי, ליבה" inside the management drawer: everything the women told us, in one
 * calm list — what they wrote, the screenshot if they attached one, where they
 * were, which version, and a status we can move along.
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircleHeart } from "lucide-react";
import { toast } from "sonner";
import {
  adminFeedbackList,
  adminFeedbackUpdate,
  kindLabel,
  statusLabel,
  type AdminFeedback,
  type AdminFeedbackList,
  type FeedbackKind,
  type FeedbackStatus,
} from "./feedback";
import { relTime } from "./api";

const tabs: { id: FeedbackKind | "all"; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "bug", label: "משהו לא עובד" },
  { id: "idea", label: "רעיונות" },
  { id: "improvement", label: "שיפורים" },
];

const statuses: FeedbackStatus[] = ["new", "in_progress", "done", "wontfix"];

const kindChip: Record<FeedbackKind, string> = {
  bug: "bg-[hsl(var(--chip-quality-bg))] text-[hsl(var(--chip-quality))]",
  idea: "bg-[hsl(var(--chip-info-bg))] text-[hsl(var(--chip-info))]",
  improvement: "bg-[hsl(var(--chip-photo-bg))] text-[hsl(var(--chip-photo))]",
};

const Row = ({ item, onChanged }: { item: AdminFeedback; onChanged: () => void }) => {
  const [note, setNote] = useState(item.admin_note ?? "");
  const [busy, setBusy] = useState(false);
  const [openShot, setOpenShot] = useState(false);
  const meta = item.meta ?? {};

  const set = async (status?: FeedbackStatus, withNote = false) => {
    setBusy(true);
    try {
      await adminFeedbackUpdate(item.id, status ?? null, withNote ? note : null);
      onChanged();
      if (withNote) toast.success("ההערה נשמרה");
    } catch {
      toast.error("הפעולה לא הושלמה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] ${kindChip[item.kind]}`}>
          {kindLabel[item.kind]}
        </span>
        <span className="text-[12.5px] font-normal text-foreground">{item.reporter.name}</span>
        {item.reporter.email && (
          <span className="text-[11px] font-light text-muted-foreground">{item.reporter.email}</span>
        )}
        <span className="text-[11px] font-light text-muted-foreground">· {relTime(item.created_at)}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-light text-muted-foreground">
          {statusLabel[item.status]}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-muted/50 px-3.5 py-2.5 text-[13px] font-light leading-relaxed text-foreground/85">
        {item.body}
      </p>

      {item.screenshot && (
        <div className="mt-2">
          <button
            onClick={() => setOpenShot((v) => !v)}
            className="text-[11.5px] font-light text-primary hover:underline"
          >
            {openShot ? "הסתרת הצילום" : "הצגת הצילום"}
          </button>
          {openShot && (
            <img
              src={item.screenshot}
              alt="צילום מסך שצורף"
              className="mt-2 max-h-72 w-full rounded-xl border border-border/60 object-contain object-top"
            />
          )}
        </div>
      )}

      <p className="mt-2 text-[11px] font-light leading-relaxed text-muted-foreground">
        {item.feature ?? "—"} · {item.route ?? "—"}
        {item.context_id ? ` · ${item.context_id}` : ""} ·{" "}
        {item.is_offline ? "גרסה מקומית" : "אונליין"} · {item.app_version || "—"}
        {meta.browser ? ` · ${String(meta.browser)}` : ""}
        {meta.device ? ` · ${String(meta.device)}` : ""}
        {meta.viewport ? ` · ${String(meta.viewport)}` : ""}
        {meta.online === false ? " · הייתה ללא חיבור" : ""}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {statuses
          .filter((s) => s !== item.status)
          .map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => void set(s)}
              className="rounded-full border border-border/70 px-3 py-1.5 text-[11.5px] font-light text-foreground/85 transition-colors hover:border-primary/40 hover:text-primary"
            >
              {statusLabel[s]}
            </button>
          ))}
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="הערה פנימית (רק אנחנו רואות)"
          className="flex-1 rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-[12px] font-light outline-none focus:border-primary/50"
        />
        <button
          disabled={busy || note === (item.admin_note ?? "")}
          onClick={() => void set(undefined, true)}
          className="rounded-full bg-primary/90 px-3.5 py-1.5 text-[11.5px] text-primary-foreground disabled:opacity-40"
        >
          שמירה
        </button>
      </div>
      {item.kind === "bug" && item.notified_at && (
        <p className="mt-1.5 text-[10.5px] font-light text-muted-foreground">
          הודענו לה שהבאג תוקן.
        </p>
      )}
    </li>
  );
};

const HeyLibaFeedback = () => {
  const [tab, setTab] = useState<FeedbackKind | "all">("all");
  const [data, setData] = useState<AdminFeedbackList | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminFeedbackList(tab === "all" ? null : tab, null));
    } catch {
      toast.error("לא הצלחנו לטעון את הפניות");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <p className="mb-3 flex items-center gap-2 text-[10.5px] tracking-[0.2em] text-muted-foreground">
        <MessageCircleHeart className="h-3.5 w-3.5" /> היי, ליבה
        {data ? ` (${data.counts.new} חדשות)` : ""}
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
              tab === t.id
                ? "bg-[hsl(var(--primary)/0.12)] text-primary"
                : "font-light text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-6 text-[13px] font-light text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> טוענות…
        </p>
      ) : (
        <ul className="divide-y divide-border/50">
          {(data?.items ?? []).map((item) => (
            <Row key={item.id} item={item} onChanged={load} />
          ))}
          {(data?.items ?? []).length === 0 && (
            <li className="py-6 text-[13px] font-light text-muted-foreground">אין פניות כאן.</li>
          )}
        </ul>
      )}
    </section>
  );
};

export default HeyLibaFeedback;
