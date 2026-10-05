/**
 * עמוד החיפוש המלא של ליבה — /liba/hipus?q=...&kind=...
 *
 * Same server search as the overlay, only with every result and a filter by area.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Search, SearchX } from "lucide-react";
import LibaTopBar from "@/community/v1/LibaTopBar";
import EmptyState from "@/components/EmptyState";
import { SearchRows, kindIcon, useLibaSearch } from "@/community/v1/GlobalSearch";
import { KIND_LABEL, KIND_ORDER, rememberSearch, totalResults, type SearchKind } from "@/community/v1/search";

const SearchPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const kindParam = params.get("kind") as SearchKind | null;
  const kind = kindParam && KIND_ORDER.includes(kindParam) ? kindParam : null;
  const { results, loading } = useLibaSearch(q, kind, 50);
  const total = useMemo(() => totalResults(results), [results]);
  const term = q.trim();

  /** keep the address bar in step so the search can be shared or refreshed */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams();
      if (term) next.set("q", term);
      if (kind) next.set("kind", kind);
      setParams(next, { replace: true });
      if (term.length >= 2) rememberSearch(term);
    }, 400);
    return () => window.clearTimeout(t);
  }, [term, kind, setParams]);

  const setKind = (k: SearchKind | null) => {
    const next = new URLSearchParams(params);
    if (k) next.set("kind", k);
    else next.delete("kind");
    setParams(next, { replace: true });
  };

  const visible = KIND_ORDER.filter((k) => (results.groups[k]?.total ?? 0) > 0);

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-20 md:pb-0">
      <LibaTopBar active={null} />

      <main className="mx-auto max-w-[900px] px-4 py-6 md:px-6 md:py-9">
        <h1 className="mb-4 text-[22px] font-light text-foreground md:text-[26px]">חיפוש בליבה</h1>

        <label className="mb-4 flex items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="שם בחור, מקום, נושא…"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] font-light outline-none placeholder:text-muted-foreground/60"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
        </label>

        <div className="no-scrollbar mb-6 flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setKind(null)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
              !kind ? "bg-foreground/90 text-background" : "font-light text-muted-foreground hover:bg-muted"
            }`}
          >
            הכל
          </button>
          {KIND_ORDER.filter((k) => k !== "boys" || results.baarAccess || kind === "boys").map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
                kind === k
                  ? "bg-primary/[0.14] font-normal text-primary"
                  : "font-light text-muted-foreground hover:bg-muted"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        {term.length < 2 && (
          <EmptyState
            icon={Search}
            title="מה את מחפשת?"
            description="כתבי כמה אותיות ונחפש בכל ליבה — שיחות, בירורים, מקומות ואירועים."
          />
        )}

        {term.length >= 2 && !loading && total === 0 && (
          <EmptyState
            icon={SearchX}
            title="לא מצאנו משהו שמתאים לחיפוש הזה"
            description="נסי מילה אחרת, או חפשי בכל ליבה."
            action={kind ? { label: "חיפוש בכל ליבה", onClick: () => setKind(null) } : undefined}
            secondary={{ label: "חזרה למרחב שלנו", onClick: () => navigate("/liba") }}
          />
        )}

        {visible.map((k) => {
          const Icon = kindIcon[k];
          const group = results.groups[k]!;
          return (
            <section key={k} className="mb-7">
              <p className="mb-2 flex items-center gap-2 text-[11px] tracking-[0.18em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {KIND_LABEL[k]}
                <span className="opacity-70">({group.total})</span>
              </p>
              <div className="divide-y divide-border/40 rounded-[22px] border border-border/70 bg-card p-1.5">
                <SearchRows kind={k} results={results} />
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default SearchPage;
