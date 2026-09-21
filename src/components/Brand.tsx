import Link from "next/link";
export function BrandMark({ className = "" }: { className?: string }) {
  return <svg className={className} width="31" height="31" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M2 3h9v10h4V8h5V3h10v9h-5v4h-5v3h5v4h5v7H20v-5h-5v-5h-4v10H2V3Z" fill="currentColor" /></svg>;
}
export default function Brand({ large = false }: { large?: boolean }) {
  return <Link href="/" className={`brand ${large ? "brand-large" : ""}`} aria-label="Klyqo home"><BrandMark /><span>klyqo<span className="brand-stop">.</span></span><sup>™</sup></Link>;
}
