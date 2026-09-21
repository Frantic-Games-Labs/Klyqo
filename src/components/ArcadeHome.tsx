"use client";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, Play, Zap, Monitor, ShieldCheck, MousePointer2, Plus } from "lucide-react";
import Catalog, { type CatalogData } from "./Catalog";
import { useArcade } from "./ArcadeProvider";
import ReleaseSignup from "./ReleaseSignup";
import AdSlot from "./ads/AdSlot";
export default function ArcadeHome({ initial }: { initial: CatalogData }) {
  const { openGame, setView, setSearch } = useArcade();
  const live = initial.games.filter((g) => g.status === "live");
  function play() { if (live.length) openGame(live[Math.floor(Math.random() * live.length)]); else document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }
  return <div className="home-content"><div className="page-prelude mono"><span><span className="live-dot" />THE INTERNET’S STILL A PLAYGROUND.</span><span>VOL. 001 <i>/</i> THE GOOD OLD NEW DAYS <ArrowUpRight size={13} /></span></div>
    <section className="hero-section" aria-labelledby="hero-heading"><div className="hero-art"><Image src="/images/arcade-hero.png" alt="A retro-futuristic silver handheld console with an acid-green Snake screen" fill priority sizes="(max-width: 800px) 100vw, 75vw" /><div className="hero-art-shade" /></div><span className="hero-corner top-left"><Plus size={15} /></span><span className="hero-corner top-right"><Plus size={15} /></span><div className="hero-copy"><div className="hero-eyebrow mono"><span className="hero-mini-lines">▰▰▰</span> BUILT FOR THE LOVE OF PLAY</div><h1 id="hero-heading">Less scroll.<br /><span>More play.</span><span className="hero-period">✳</span></h1><p>Old-school soul. New-school energy.<br />Your next favourite game is one click away.</p><div className="hero-actions"><button className="btn btn-lime" onClick={play}><Play size={15} fill="currentColor" />Let’s play<ArrowUpRight size={17} /></button><a href="#collection" onClick={() => { setView("all"); setSearch(""); }}>Explore the collection <ArrowDownRight size={17} /></a></div><div className="hero-footnote mono"><span />NO DOWNLOADS. NO SIGN-UPS. NO BIG DEAL.</div></div><div className="hero-stamp"><span className="mono">INSERT COIN?</span><strong>Not here.</strong><span className="mono">100% FREE TO PLAY <ArrowUpRight size={13} /></span></div><div className="hero-art-label mono"><span>KQ—001</span><span>A FAMILIAR FEELING.<br />A WHOLE NEW PLAYGROUND.</span></div><span className="hero-corner bottom-right"><Plus size={15} /></span></section>
    <div className="promise-strip"><span><Zap size={16} />Instantly in the game</span><span><Monitor size={16} />Your browser. Your arcade.</span><span><MousePointer2 size={16} />One click. You’re playing.</span><span><ShieldCheck size={16} />No mid-game interruptions</span></div>
    <Catalog initial={initial} />
    <AdSlot slot="collection" />
    <section id="next-drop" className="next-drop-section"><div className="drop-copy"><span className="eyebrow">THIS IS JUST LEVEL ONE</span><h2>The good stuff<br />is only getting started<span className="lime">.</span></h2><p>Fresh games. Familiar favourites. A few happy surprises.<br />Be the first to know what lands next.</p><ReleaseSignup /></div><div className="drop-art" aria-hidden="true"><div className="drop-grid" /><span className="floating-pixel pixel-one" /><span className="floating-pixel pixel-two" /><span className="floating-pixel pixel-three" /><div className="drop-symbol"><Plus /></div><span className="drop-coordinate mono">NEXT LEVEL<br />LOADING_</span></div><div className="drop-bottom mono"><span>GOOD THINGS COME TO THOSE WHO PLAY.</span><ArrowUpRight size={19} /></div></section>
  </div>;
}
