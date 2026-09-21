"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
export default function ReleaseSignup({ slug = "all", compact = false }: { slug?: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setState("busy"); setError("");
    try {
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, slug, consent }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not join. Please try again.");
      setState("done");
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); setState("idle"); }
  }
  if (state === "done") return <div className="signup-success" role="status"><span><Check size={21} /></span><div><strong>You’re on the list.</strong><p>A little less FOMO. A little more play.</p></div></div>;
  return <form className={`release-form ${compact ? "compact" : ""}`} onSubmit={submit}>
    <div className="signup-input-row"><label className="sr-only" htmlFor={`email-${slug}`}>Email address</label><input id={`email-${slug}`} type="email" required maxLength={254} placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /><button className="btn btn-lime" type="submit" disabled={state === "busy"}>{state === "busy" ? <LoaderCircle size={18} className="spin" /> : <>Keep me in the loop <ArrowUpRight size={17} /></>}</button></div>
    <label className="consent-check"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I’d like occasional game updates. No spam. <Link href="/privacy">Privacy policy</Link></span></label>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
