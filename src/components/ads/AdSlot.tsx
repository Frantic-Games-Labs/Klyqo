"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Orbit } from "lucide-react";
import { useArcade } from "../ArcadeProvider";
const slots: Record<string, string | undefined> = { collection: process.env.NEXT_PUBLIC_ADSENSE_SLOT_COLLECTION, footer: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER };
export default function AdSlot({ slot, className = "" }: { slot: string; className?: string; format?: string; label?: string }) {
  const { active } = useArcade();
  const container = useRef<HTMLDivElement>(null);
  const requested = useRef(false);
  const [inView, setInView] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slotId = slots[slot];
  const configured = process.env.NEXT_PUBLIC_ADS_ENABLED === "true" && /^ca-pub-\d{16}$/.test(client || "") && /^\d+$/.test(slotId || "");
  useEffect(() => {
    const update = () => setScriptReady(Boolean((window as Window & { klyqoAdsReady?: boolean }).klyqoAdsReady)); update();
    window.addEventListener("klyqo:ads-ready", update); return () => window.removeEventListener("klyqo:ads-ready", update);
  }, []);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    observer.observe(container.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!configured || !scriptReady || !inView || active || requested.current) return;
    try { const w = window as Window & { adsbygoogle?: unknown[] }; (w.adsbygoogle = w.adsbygoogle || []).push({}); requested.current = true; } catch { /* Empty or blocked ads never block the site. */ }
  }, [configured, scriptReady, inView, active]);
  return <div className={`advertisement ${className}`} ref={container}><div className="ad-label mono"><span>ADVERTISEMENT</span><span>A LITTLE SPACE TO KEEP THE GAMES FREE</span></div>{configured && scriptReady ? <div className="adsense-space"><ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={client} data-ad-slot={slotId} data-ad-format="horizontal" data-full-width-responsive="true" /></div> : <div className="house-ad"><span className="ad-orbit"><Orbit size={29} /></span><div><strong>A little space for our partners.</strong><p>The ads stay here. Your game stays yours.</p></div><Link href="/why-ads">Our ad promise <ArrowUpRight size={15} /></Link><span className="ad-background-word" aria-hidden="true">play.</span></div>}</div>;
}
