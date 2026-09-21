"use client";
import { RotateCcw } from "lucide-react";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="text-page"><span className="eyebrow">A SMALL DETOUR</span><h1>The arcade needs<br />a quick reset<span className="lime">.</span></h1><p className="intro">We couldn’t load this page. Give it another try in a moment.</p><button className="btn btn-lime" onClick={reset}>Try again <RotateCcw size={15}/></button></section>;
}
