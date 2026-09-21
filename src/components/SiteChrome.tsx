"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, Shuffle, Gamepad2, Bookmark, Clock3, Radio, Info, ArrowRight, Menu, X } from "lucide-react";
import Brand, { BrandMark } from "./Brand";
import { useArcade } from "./ArcadeProvider";
import type { Game } from "@/db/schema";

export function TopNav() {
  const { search, setSearch, view, setView, saved, openGame, toast } = useArcade();
  const pathname = usePathname(); const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [mobile, setMobile] = useState(false);
  const [randomBusy, setRandomBusy] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && !target.isContentEditable) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  function navigate(next: "all" | "library" | "soon" | "recent") {
    setView(next); setSearch(""); setMobile(false);
    if (pathname !== "/") router.push("/#collection"); else document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function surprise() {
    setRandomBusy(true);
    try { const res = await fetch("/api/games?status=live&limit=24"); if (!res.ok) throw new Error(); const data = await res.json() as { games: Game[] }; if (data.games.length) openGame(data.games[Math.floor(Math.random() * data.games.length)]); else toast("New games are on the way. Check back soon."); }
    catch { toast("Couldn’t load a game. Please try again."); }
    finally { setRandomBusy(false); }
  }
  return <><header className="site-header"><Brand /><nav className="desktop-nav" aria-label="Main navigation"><button onClick={() => navigate("all")} className={view === "all" && pathname === "/" ? "active" : ""}>Discover</button><button onClick={() => navigate("library")} className={view === "library" && pathname === "/" ? "active" : ""}>My library{saved.length > 0 && <span className="nav-count">{saved.length}</span>}</button><button onClick={() => navigate("soon")} className={view === "soon" && pathname === "/" ? "active" : ""}>The next drop <span className="new-dot" /></button></nav>
    <div className="header-right"><label className="header-search"><Search size={16} /><span className="sr-only">Search games</span><input ref={searchRef} aria-label="Search games" value={search} onChange={(e) => { setSearch(e.target.value); setView("all"); if (pathname !== "/") router.push("/#collection"); }} onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }} placeholder="Find your next game" /><kbd>/</kbd></label><button className="surprise-button" onClick={surprise} disabled={randomBusy}><Shuffle size={16} /><span>{randomBusy ? "One sec…" : "Surprise me"}</span></button><button className="mobile-toggle icon-button" aria-label="Toggle navigation" onClick={() => setMobile((v) => !v)}>{mobile ? <X /> : <Menu />}</button></div>
    {mobile && <nav className="mobile-nav"><button onClick={() => navigate("all")}>Discover <ArrowRight size={16} /></button><button onClick={() => navigate("library")}>My library <Bookmark size={16} /></button><button onClick={() => navigate("soon")}>The next drop <Radio size={16} /></button><button onClick={() => navigate("recent")}>Recently played <Clock3 size={16} /></button></nav>}
  </header><aside className="side-rail" aria-label="Quick navigation"><div><button aria-label="Discover games" title="Discover" className={view === "all" ? "active" : ""} onClick={() => navigate("all")}><Gamepad2 size={21} /></button><button aria-label="Saved games" title="My library" className={view === "library" ? "active" : ""} onClick={() => navigate("library")}><Bookmark size={20} /></button><button aria-label="Recently played" title="Recently played" className={view === "recent" ? "active" : ""} onClick={() => navigate("recent")}><Clock3 size={20} /></button><span className="rail-divider" /><button aria-label="Coming soon games" title="The next drop" className={view === "soon" ? "active" : ""} onClick={() => navigate("soon")}><Radio size={20} /></button></div><div className="rail-bottom"><span className="rail-vertical mono">PLAY A LITTLE. LIVE A LOT.</span><Link href="/why-ads" title="The Klyqo promise" aria-label="Our advertising promise"><Info size={20} /></Link><span className="rail-monogram"><BrandMark /></span></div></aside></>;
}
export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Brand large /><p>A good place to lose track of time.</p><span className="mono footer-est">INDEPENDENT PLAYGROUND / EST. 2026</span></div><div className="footer-links"><div><span className="mono">THE GOOD STUFF</span><Link href="/#collection">The collection <ArrowUpRight size={13} /></Link><Link href="/#next-drop">What’s next <ArrowUpRight size={13} /></Link><Link href="/admin">For creators <ArrowUpRight size={13} /></Link></div><div><span className="mono">NO FINE PRINT</span><Link href="/why-ads">Our ad promise <ArrowUpRight size={13} /></Link><Link href="/privacy">Privacy & cookies <ArrowUpRight size={13} /></Link><Link href="/terms">Terms of play <ArrowUpRight size={13} /></Link></div></div><div className="footer-end"><span className="live-dot" /><span>Less noise.<br />More <i>one more round.</i></span></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} KLYQO. Play nicely.</span><span className="mono">NO INSTALLS. NO INTERRUPTIONS. JUST PLAY.<span className="footer-cross">✳</span></span></div></footer>;
}
