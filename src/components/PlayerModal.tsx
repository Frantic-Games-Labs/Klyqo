"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Bookmark, Check, ExternalLink, Maximize, Minimize, RotateCcw, X, LoaderCircle, Keyboard, Radio, ArrowUpRight, ArrowLeft } from "lucide-react";
import type { Game } from "@/db/schema";
import { useArcade } from "./ArcadeProvider";
import ReleaseSignup from "./ReleaseSignup";
import { BrandMark } from "./Brand";

export default function PlayerModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const { saved, toggleSaved, toast } = useArcade();
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [version, setVersion] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [best, setBest] = useState(0);
  const live = game.status === "live";
  const src = game.source === "local" ? `/games/${game.slug}/index.html` : game.url || "";
  const isSaved = saved.includes(game.slug);
  const close = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    onClose();
  }, [onClose]);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try { setBest(Number(localStorage.getItem(`klyqo:best:${game.slug}`)) || 0); } catch { /* optional storage */ }
    return () => { element?.close(); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, [game.slug]);
  useEffect(() => {
    if (loaded || !live) return;
    const timeout = setTimeout(() => setTimedOut(true), 18000);
    return () => clearTimeout(timeout);
  }, [loaded, live, version]);
  useEffect(() => {
    const onChange = () => setExpanded(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow) return;
      const allowed = game.source === "local" ? location.origin : new URL(src).origin;
      if (e.origin !== allowed && !(game.source === "embed" && e.origin === "null")) return;
      if (e.data?.type === "klyqo:close") { close(); return; }
      if (e.data?.type !== "klyqo:score" && e.data?.type !== "arena:score") return;
      const score = e.data.score;
      if (!Number.isInteger(score) || score < 0 || score > 10_000_000) return;
      setBest((old) => { const value = Math.max(old, score); try { localStorage.setItem(`klyqo:best:${game.slug}`, String(value)); } catch { /* optional */ } return value; });
      try {
        const res = await fetch(`/api/games/${game.slug}/scores`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score, player: "Player" }) });
        if (!res.ok) toast("Personal best saved on this device. Online score sync is unavailable.");
      } catch { toast("Playing offline. Your best is saved on this device."); }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [game.slug, game.source, src, close, toast]);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shell.current?.requestFullscreen) await shell.current.requestFullscreen();
      else setExpanded((v) => !v);
    } catch { setExpanded((v) => !v); toast("Expanded player enabled. Browser fullscreen is unavailable here."); }
    frame.current?.focus();
  };
  const restart = () => { setLoaded(false); setTimedOut(false); setVersion((v) => v + 1); };
  return <dialog ref={dialog} className={`player-dialog ${!live ? "coming-dialog" : ""} ${expanded ? "expanded" : ""}`} aria-labelledby="player-title" onCancel={(e) => { e.preventDefault(); close(); }} onClick={(e) => { if (e.target === dialog.current) close(); }}>
    <div ref={shell} className="player-shell">
      <div className="player-header">
        <div className="player-brand">
          <button className="icon-button close-button" style={{ marginLeft: 0, padding: '0 12px', borderRadius: '6px', fontSize: '11px', fontFamily: 'var(--mono)', gap: '6px', height: '32px' }} onClick={close} aria-label="Back" title="Back to Games"><ArrowLeft size={16} /> BACK</button>
          <span className="player-header-divider" />
          <BrandMark />
          <span className="player-header-divider" />
          <div><h2 id="player-title">{game.title}</h2><span className="mono">{live ? "NOW PLAYING / " : "THE NEXT DROP / "}{game.category.toUpperCase()}</span></div>
        </div>
        <div className="player-actions"><button className={`icon-button ${isSaved ? "saved" : ""}`} onClick={() => toggleSaved(game.slug)} aria-label={isSaved ? "Remove from library" : "Save to library"} title={isSaved ? "Saved to library" : "Save to library"}><Bookmark size={18} fill={isSaved ? "currentColor" : "none"} /></button>
          {live && <><button className="icon-button" onClick={restart} title="Restart game" aria-label="Restart game"><RotateCcw size={18} /></button><a className="icon-button" href={src} target="_blank" rel="noopener noreferrer" aria-label="Open game in new tab" title="Open in a new tab"><ExternalLink size={18} /></a><button className="icon-button" onClick={fullscreen} aria-label={expanded ? "Exit fullscreen" : "Enter fullscreen"} title="Fullscreen">{expanded ? <Minimize size={19} /> : <Maximize size={19} />}</button></>}
        </div>
      </div>
      {live ? <><div className="player-surface">
        <iframe key={version} ref={frame} className="game-frame" src={src} title={`Play ${game.title}`} onLoad={() => { setLoaded(true); frame.current?.focus(); }} allow="autoplay; fullscreen; gamepad" sandbox={game.source === "local" ? "allow-scripts allow-same-origin allow-pointer-lock" : "allow-scripts allow-pointer-lock"} allowFullScreen />
        {!loaded && <div className="game-loading"><BrandMark /><LoaderCircle className="spin" size={23} /><h3>{timedOut ? "Taking a little longer…" : "Good game. Incoming."}</h3><p>{timedOut ? "Try restarting, or open the game in its own tab." : `Loading ${game.title}. No ad break. Just play.`}</p>{timedOut && <button className="btn btn-lime" onClick={restart}>Try again <RotateCcw size={16} /></button>}</div>}
      </div><div className="player-footer"><span className="player-controls"><Keyboard size={16} />{game.controls}</span><span className="player-best">PERSONAL BEST <b>{best.toLocaleString()}</b></span><span className="player-live"><span className="live-dot" />AD-FREE PLAY</span></div></>
      : <div className="coming-content"><div className="coming-cover">{game.coverUrl && <Image src={game.coverUrl} alt={`${game.title} concept artwork`} fill sizes="(max-width: 700px) 100vw, 50vw" className="cover-image" />}<span className="art-caption mono">CONCEPT ART / NOT A PLAYABLE BUILD</span></div><div className="coming-copy"><span className="eyebrow"><Radio size={14} /> ON OUR RADAR</span><h3>{game.title}<span className="lime">.</span></h3><p className="coming-tagline">{game.tagline}</p><span className="status-badge soon"><span />COMING SOON</span><p className="coming-description">{game.description}</p><button className={`btn btn-outline save-release ${isSaved ? "saved" : ""}`} onClick={() => toggleSaved(game.slug)}>{isSaved ? <Check size={17} /> : <Bookmark size={17} />}{isSaved ? "On your radar" : "Save to my library"}</button><div className="coming-signup"><h4>Be here for the first round. <ArrowUpRight size={16} /></h4><ReleaseSignup slug={game.slug} compact /></div></div></div>}
    </div>
  </dialog>;
}
