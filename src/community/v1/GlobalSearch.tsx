/**
 * חיפוש אחד לכל ליבה — overlay.
 *
 * She types once and gets the best few results from every area she is allowed
 * to see, grouped by area, with a way to open the full search page.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bus,
  CalendarDays,
  Loader2,
  MapPin,
  MessageSquare,
  MessageSquareQuote,
  Search,
  SearchX,
  Users,
  X,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { accentColor, spaceById } from "./spaces";
import { relTime } from "./api";
import {
  KIND_LABEL,
  KIND_ORDER,
  boyLink,
  clearSearches,
  eventLink,
  forgetSearch,
  inquiryLink,
  placeLink,
  postLink,
  recentSearches,
  rememberSearch,
  searchLiba,
  totalResults,
  type SearchKind,
  type SearchResults,
} from "./search";

const SUGGESTIONS = ["רכב", "משכנתה", "קפה ירושלים", "שותפה לדירה", "סוכות"];

const chip = "rounded-full bg-muted/70 px-3 py-1 text-[12px] font-light text-foreground/85 transition-colors hover:bg-muted";
const meta = "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-light text-muted-foreground";

/** one row per result type — each area looks a little different, same system */
export const SearchRows = ({
  kind,
  results,
  onPick,
}: {
  kind: SearchKind;
  results: SearchResults;
  onPick?: () => void;
}) => {
  const rowClass =
    "block rounded-2xl px-3 py-3 transition-colors hover:bg-muted/60";

  if (kind === "posts")
    return (
      <>
        {(results.groups.posts?.items ?? []).map((p) => {
          const s = spaceById(p.space);
          return (
            <Link key={p.id} to={postLink(p)} onClick={onPick} className={rowClass}>
              <p className="text-[14.5px] font-light leading-snug text-foreground">
                {p.title || p.body.slice(0, 70)}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[12px] font-light text-muted-foreground">{p.body}</p>
              <p className={meta}>
                <span style={{ color: accentColor(s) }}>{s.shortName}</span>
                <span className="opacity-50">·</span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  שיחה
                </span>
                <span className="opacity-50">·</span>
                {relTime(p.created_at)}
              </p>
            </Link>
          );
        })}
      </>
    );

  if (kind === "inquiries")
    return (
      <>
        {(results.groups.inquiries?.items ?? []).map((i) => (
          <Link key={i.id} to={inquiryLink(i)} onClick={onPick} className={rowClass}>
            <p className="text-[15px] font-medium leading-snug text-foreground">{i.boy_name}</p>
            <p className={meta}>
              {i.age ? <span>גיל {i.age}</span> : null}
              {i.city ? <span>{i.city}</span> : null}
              {i.yeshiva ? <span>{i.yeshiva}</span> : null}
              <span className="rounded-full bg-primary/[0.09] px-2 py-0.5 text-primary">
                {i.status === "open" ? "בירור פתוח" : "בירור נסגר"}
              </span>
            </p>
          </Link>
        ))}
      </>
    );

  if (kind === "boys")
    return (
      <>
        {(results.groups.boys?.items ?? []).map((b) => (
          <Link key={b.id} to={boyLink(b)} onClick={onPick} className={rowClass}>
            <p className="text-[15px] font-medium leading-snug text-foreground">{b.full_name}</p>
            <p className={meta}>
              {b.age ? <span>גיל {b.age}</span> : null}
              {b.city ? <span>{b.city}</span> : null}
              {b.ethnicity ? <span>{b.ethnicity}</span> : null}
              {b.has_recommendation && (
                <span className="rounded-full bg-primary/[0.09] px-2 py-0.5 text-primary">יש ממליצה</span>
              )}
            </p>
          </Link>
        ))}
      </>
    );

  if (kind === "places")
    return (
      <>
        {(results.groups.places?.items ?? []).map((p) => (
          <Link key={p.id} to={placeLink(p)} onClick={onPick} className={rowClass}>
            <p className="text-[15px] font-medium leading-snug text-foreground">{p.name}</p>
            <p className={meta}>
              {p.area ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {p.area}
                </span>
              ) : null}
              {p.kind ? <span>{p.kind}</span> : null}
              {p.kashrut ? <span>{p.kashrut}</span> : null}
              {p.crowd_level ? (
                <span className="inline-flex items-center gap-1">
                  <Bus className="h-3 w-3" />
                  עומס {p.crowd_level}/5
                </span>
              ) : null}
            </p>
          </Link>
        ))}
      </>
    );

  return (
    <>
      {(results.groups.events?.items ?? []).map((e) => (
        <Link key={e.id} to={eventLink(e)} onClick={onPick} className={rowClass}>
          <p className="text-[15px] font-medium leading-snug text-foreground">{e.title}</p>
          <p className={meta}>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {e.event_date ?? "מועד יפורסם"}
            </span>
            {e.event_time ? <span>{e.event_time}</span> : null}
            {e.location || e.city ? <span>{e.location ?? e.city}</span> : null}
          </p>
        </Link>
      ))}
    </>
  );
};

export const kindIcon: Record<SearchKind, typeof Search> = {
  posts: MessageSquare,
  inquiries: MessageSquareQuote,
  boys: Users,
  places: MapPin,
  events: CalendarDays,
};

/** the debounced live search, shared by the overlay and the full page */
export const useLibaSearch = (q: string, kind: SearchKind | null, limit: number) => {
  const [results, setResults] = useState<SearchResults>({ authorized: true, baarAccess: false, groups: {} });
  const [loading, setLoading] = useState(false);
  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) {
      setResults({ authorized: true, baarAccess: false, groups: {} });
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const data = await searchLiba(term, { kind, limit });
        if (alive) setResults(data);
      } catch {
        if (alive) setResults({ authorized: true, baarAccess: false, groups: {} });
      } finally {
        if (alive) setLoading(false);
      }
    }, 260);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [term, kind, limit]);

  return { results, loading };
};

const GlobalSearch = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const { results, loading } = useLibaSearch(q, null, 4);
  const term = q.trim();
  const total = useMemo(() => totalResults(results), [results]);

  useEffect(() => {
    if (open) setRecent(recentSearches());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const goFull = (kind?: SearchKind) => {
    if (term.length < 2) return;
    setRecent(rememberSearch(term));
    onClose();
    navigate(`/liba/hipus?q=${encodeURIComponent(term)}${kind ? `&kind=${kind}` : ""}`);
  };

  const remember = () => setRecent(rememberSearch(term));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/25 p-4 py-12 backdrop-blur-sm md:py-20"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-[28px] bg-card shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center gap-3 border-b border-border/60 px-8 py-6 md:px-12 md:py-8">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goFull()}
            placeholder="חיפוש בליבה — שם בחור, מקום, נושא…"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-light outline-none placeholder:text-muted-foreground/60"
          />
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-8 pb-10 pt-6 md:px-12 md:pb-12 md:pt-8">
          {term.length < 2 && (
            <>
              {recent.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 flex items-center gap-2 text-[11px] tracking-[0.18em] text-muted-foreground">
                    חיפשת לאחרונה
                    <button
                      onClick={() => {
                        clearSearches();
                        setRecent([]);
                      }}
                      className="text-[10.5px] tracking-normal text-muted-foreground/80 underline"
                    >
                      ניקוי
                    </button>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-3 py-1">
                        <button onClick={() => setQ(r)} className="text-[12px] font-light text-foreground/85">
                          {r}
                        </button>
                        <button
                          onClick={() => setRecent(forgetSearch(r))}
                          aria-label={`הסרת ${r}`}
                          className="text-muted-foreground/70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-2 text-[11px] tracking-[0.18em] text-muted-foreground">מחפשות עכשיו</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setQ(s)} className={chip}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-6 text-[12.5px] font-light leading-relaxed text-muted-foreground">
                החיפוש עובר על השיחות, הבירורים, המקומות והאירועים — ועל הבאר, אם יש לך גישה אליו.
              </p>
            </>
          )}

          {term.length >= 2 && (
            <>
              {loading && (
                <p className="flex items-center gap-2 py-6 text-[12.5px] font-light text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  מחפשות…
                </p>
              )}

              {!loading && total === 0 && (
                <EmptyState
                  icon={SearchX}
                  compact
                  title="לא מצאנו משהו שמתאים לחיפוש הזה"
                  description="אפשר לנסות מילה אחרת, או חלק מהשם."
                />
              )}

              {!loading &&
                KIND_ORDER.filter((k) => (results.groups[k]?.total ?? 0) > 0).map((k) => {
                  const Icon = kindIcon[k];
                  const group = results.groups[k]!;
                  return (
                    <section key={k} className="mb-4 last:mb-0">
                      <p className="mb-1 flex items-center gap-2 px-1 text-[11px] tracking-[0.18em] text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {KIND_LABEL[k]}
                        <span className="opacity-70">({group.total})</span>
                      </p>
                      <div className="divide-y divide-border/40">
                        <SearchRows kind={k} results={results} onPick={remember} />
                      </div>
                      {group.total > group.items.length && (
                        <button
                          onClick={() => goFull(k)}
                          className="mt-1 px-3 text-[12px] font-light text-primary hover:underline"
                        >
                          לכל התוצאות ב{KIND_LABEL[k]} ←
                        </button>
                      )}
                    </section>
                  );
                })}

              {!loading && total > 0 && (
                <button
                  onClick={() => goFull()}
                  className="mt-3 w-full rounded-full border border-primary/30 py-2.5 text-[13px] font-light text-primary transition-colors hover:bg-primary/[0.07]"
                >
                  לכל תוצאות החיפוש
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
