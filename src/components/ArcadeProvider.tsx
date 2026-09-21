"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Game } from "@/db/schema";
import PlayerModal from "./PlayerModal";

type View = "all" | "library" | "recent" | "soon";
type ArcadeState = {
  active: Game | null; openGame: (game: Game) => void; closeGame: () => void;
  saved: string[]; recent: string[]; toggleSaved: (slug: string) => void;
  search: string; setSearch: (value: string) => void;
  view: View; setView: (view: View) => void;
  toast: (message: string) => void; ready: boolean;
};
const ArcadeContext = createContext<ArcadeState | null>(null);
export function useArcade() { const context = useContext(ArcadeContext); if (!context) throw new Error("ArcadeProvider required"); return context; }
function read(key: string): string[] { try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v.filter((s) => typeof s === "string").slice(0, 200) : []; } catch { return []; } }
function write(key: string, value: string[]) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing still works without persistence. */ } }

export default function ArcadeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Game | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("all");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => { setSaved(read("klyqo:saved")); setRecent(read("klyqo:recent")); setReady(true); }, []);
  useEffect(() => { if (!message) return; const id = setTimeout(() => setMessage(""), 3500); return () => clearTimeout(id); }, [message]);
  const toast = useCallback((text: string) => setMessage(text), []);
  const openGame = useCallback((game: Game) => {
    if (game.status === "live" && game.source === "external" && game.url) { window.open(game.url, "_blank", "noopener,noreferrer"); }
    else setActive(game);
    if (game.status !== "live") return;
    setRecent((previous) => { const next = [game.slug, ...previous.filter((s) => s !== game.slug)].slice(0, 50); write("klyqo:recent", next); return next; });
    void fetch(`/api/games/${game.slug}/play`, { method: "POST" }).catch(() => {});
  }, []);
  const closeGame = useCallback(() => setActive(null), []);
  const toggleSaved = useCallback((slug: string) => {
    setSaved((previous) => { const next = previous.includes(slug) ? previous.filter((s) => s !== slug) : [...previous, slug].slice(-200); write("klyqo:saved", next); return next; });
  }, []);
  return <ArcadeContext.Provider value={{ active, openGame, closeGame, saved, recent, toggleSaved, search, setSearch, view, setView, toast, ready }}>
    {children}
    {active && <PlayerModal key={active.slug} game={active} onClose={closeGame} />}
    {message && <div className="toast" role="status"><span className="live-dot" />{message}</div>}
  </ArcadeContext.Provider>;
}
