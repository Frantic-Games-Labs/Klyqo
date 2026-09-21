"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { Gamepad2, Zap, Blocks, Flag, Compass, ArrowDown, ArrowUpRight, SearchX, ChevronDown, LoaderCircle, X } from "lucide-react";
import type { Game } from "@/db/schema";
import GameCard from "./GameCard";
import { useArcade } from "./ArcadeProvider";
import AdSlot from "./ads/AdSlot";

export type CatalogData = { games: Game[]; total: number; hasMore: boolean; page: number; categories: string[] };
const icons: Record<string, typeof Gamepad2> = { "All games": Gamepad2, Arcade: Zap, Puzzle: Blocks, Racing: Flag, Action: Gamepad2, Adventure: Compass };
export default function Catalog({ initial }: { initial: CatalogData }) {
  const { search, setSearch, view, setView, saved, recent, ready } = useArcade();
  const [category, setCategory] = useState("All games");
  const [sort, setSort] = useState("curated");
  const [playable, setPlayable] = useState(false);
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const first = useRef(true);
  const previousView = useRef(view);
  const ids = view === "library" ? saved.join(",") : view === "recent" ? recent.join(",") : undefined;
  function params(page = 1) { const p = new URLSearchParams({ q: search, category, sort, page: String(page), limit: "12", status: view === "soon" ? "soon" : playable ? "live" : "" }); if (ids !== undefined) p.set("slugs", ids); return p; }
  useEffect(() => {
    if (previousView.current !== view) { previousView.current = view; setCategory("All games"); setPlayable(false); }
  }, [view]);
  useEffect(() => {
    if (!ready) return;
    if (first.current && !search && view === "all" && category === "All games" && sort === "curated" && !playable) { first.current = false; return; }
    first.current = false;
    const controller = new AbortController();
    setBusy(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ q: search, category, sort, page: "1", limit: "12", status: view === "soon" ? "soon" : playable ? "live" : "" }); if (ids !== undefined) p.set("slugs", ids);
        const res = await fetch(`/api/games?${p}`, { signal: controller.signal }); if (!res.ok) throw new Error("Couldn’t load the collection. Give it another try.");
        setData(await res.json());
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Connection lost."); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, search ? 220 : 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [search, category, sort, playable, view, ids, ready, retry]);
  async function loadMore() {
    setBusy(true); setError("");
    try { const res = await fetch(`/api/games?${params(data.page + 1)}`); if (!res.ok) throw new Error(); const next = await res.json() as CatalogData; setData((old) => ({ ...next, games: [...old.games, ...next.games] })); }
    catch { setError("Couldn’t load more games. Please try again."); } finally { setBusy(false); }
  }
  const title = view === "library" ? "Your kind of games." : view === "recent" ? "Back for one more?" : view === "soon" ? "The next good thing." : "Pick your next obsession.";
  return <section id="collection" className="collection-section" aria-busy={busy}>
    <div className="section-heading"><div><span className="eyebrow">{view === "library" ? "THE KEEPERS" : view === "recent" ? "RECENTLY PLAYED" : view === "soon" ? "THE NEXT DROP" : "THE COLLECTION"}</span><h2>{title}<span className="collection-count mono">{String(data.total).padStart(2, "0")}</span></h2></div><span className="collection-note mono">HANDPICKED. NOT ENDLESS.<ArrowUpRight size={15} /></span></div>
    <div className="collection-toolbar"><div className="category-tabs" role="group" aria-label="Game categories">{["All games", ...initial.categories].map((cat) => { const Icon = icons[cat] || Gamepad2; return <button key={cat} className={category === cat ? "selected" : ""} onClick={() => setCategory(cat)} aria-pressed={category === cat}><Icon size={15} />{cat}</button>; })}</div><div className="collection-tools">{view !== "soon" && <button className={`playable-toggle ${playable ? "on" : ""}`} role="switch" aria-checked={playable} onClick={() => setPlayable((value) => !value)}><span className="toggle-track"><span /></span>Playable now</button>}<label className="sort-select"><span className="sr-only">Sort games</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="curated">Curated</option><option value="popular">Most played</option><option value="new">Newest</option><option value="az">A–Z</option></select><ChevronDown size={14} /></label></div></div>
    {(search || view !== "all") && <div className="filter-summary"><span>{search ? `Results for “${search}”` : view === "library" ? "Saved on this device. Your future self says thanks." : view === "recent" ? "Your last fifty games, kept on this device." : "New concepts. A lot of possibilities."}</span><button onClick={() => { setSearch(""); setView("all"); setCategory("All games"); setPlayable(false); }}>Show all games <X size={13} /></button></div>}
    {error ? <div className="empty-collection" role="alert"><SearchX /><h3>We hit a little bump.</h3><p>{error}</p><button className="btn btn-outline" onClick={() => setRetry((v) => v + 1)}>Try again</button></div> : <div className={`game-grid ${busy ? "is-loading" : ""}`}>{data.games.map((game, i) => <Fragment key={game.slug}><GameCard game={game} />{(i + 1) % 12 === 0 && i < data.games.length - 1 && <div className="game-grid-ad"><AdSlot slot="collection" className="catalog-ad" /></div>}</Fragment>)}</div>}
    {!error && !data.games.length && <div className="empty-collection"><SearchX size={30} /><h3>{view === "library" ? "Make yourself at home." : view === "recent" ? "Your first round is waiting." : "No matches. Yet."}</h3><p>{view === "library" ? "Tap the bookmark on a game to keep it here." : view === "recent" ? "Play a game and it will appear here for next time." : "Try another search or open up your filters."}</p><button className="btn btn-lime" onClick={() => { setSearch(""); setView("all"); setCategory("All games"); setPlayable(false); }}>Explore the collection <ArrowUpRight size={16} /></button></div>}
    <div className="collection-end"><span className="mono">{busy ? "FINDING THE GOOD STUFF…" : `${String(data.games.length).padStart(2, "0")} OF ${String(data.total).padStart(2, "0")} GAMES`}</span>{data.hasMore ? <button onClick={loadMore} className="btn btn-outline" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <>More good stuff <ArrowDown size={16} /></>}</button> : <span className="mono">SMALL COLLECTION. BIG PLANS.<span className="tiny-cross">+</span></span>}</div>
  </section>;
}
