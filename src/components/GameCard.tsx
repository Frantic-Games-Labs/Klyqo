"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ArrowRight, Bookmark, Play } from "lucide-react";
import type { Game } from "@/db/schema";
import { useArcade } from "./ArcadeProvider";
export function StatusPill({ status }: { status: string }) {
  return <span className={`status-badge ${status === "live" ? "live" : "soon"}`}><span />{status === "live" ? "PLAY NOW" : status === "maintenance" ? "IN THE WORKSHOP" : "COMING SOON"}</span>;
}
export default function GameCard({ game }: { game: Game; big?: boolean }) {
  const { openGame, saved, toggleSaved } = useArcade();
  const live = game.status === "live";
  const isSaved = saved.includes(game.slug);
  const classic = game.slug === "snake" || game.slug === "tetris";
  return <article className={`game-card ${live ? "game-live" : "game-upcoming"}`}>
    <Link href={`/play/${game.slug}`} className="game-card-link" aria-label={live ? `Play ${game.title}` : `Explore ${game.title}, coming soon`} onClick={(e) => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); openGame(game); }}>
      <div className={`game-cover ${classic ? `cover-${game.slug}` : ""}`}>
        {game.coverUrl ? <Image src={game.coverUrl} alt={`${game.title} ${live ? "game" : "concept"} artwork`} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" className="cover-image" unoptimized={game.coverUrl.endsWith(".svg")} /> : <div className="cover-fallback" style={{ background: game.accent }}><span>{game.title.slice(0, 1)}</span></div>}
        <div className="card-badges"><StatusPill status={game.status} />{classic && <span className="demo-label mono">THE CLASSICS</span>}</div>
        {classic && <div className="classic-cover-title">{game.slug === "snake" ? <><span>SNAKE</span><span>’97<span className="title-square">▪</span></span></> : <><span>TE<span className="tetris-letter">T</span>RIS</span><small>FIND YOUR FLOW.</small></>}</div>}
        {live && <span className="cover-play"><Play size={26} fill="currentColor" /></span>}
        <span className="cover-corner mono">{String(game.sortOrder).padStart(2, "0")} / KQ</span>
      </div>
      <div className="game-card-info"><div className="game-category mono">{game.category}<span>·</span>{live ? "SINGLE PLAYER" : "ON OUR RADAR"}</div><h3>{game.title}</h3><p>{game.tagline}</p><div className="game-card-footer"><span className="game-mode">{live ? <><span className="live-dot" />FREE TO PLAY</> : "SOMETHING GOOD IS COMING"}</span><span className={`card-action ${live ? "lime" : ""}`}>{live ? <>Let’s play <ArrowRight size={16} /></> : <>Get a first look <ArrowUpRight size={16} /></>}</span></div></div>
    </Link>
    <button onClick={() => toggleSaved(game.slug)} className={`card-save ${isSaved ? "saved" : ""}`} aria-label={isSaved ? `Remove ${game.title} from library` : `Save ${game.title} to library`} title={isSaved ? "Saved to your library" : "Save for later"}><Bookmark size={17} fill={isSaved ? "currentColor" : "none"} /></button>
  </article>;
}
