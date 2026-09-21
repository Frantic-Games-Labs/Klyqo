import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export default function NotFound() { return <section className="text-page"><span className="eyebrow">404 / OFF THE MAP</span><h1>This level<br />doesn’t exist<span className="lime">.</span></h1><p className="intro">Let’s get you back to the good stuff.</p><Link href="/" className="btn btn-lime"><ArrowLeft size={15}/>Back to the playground</Link></section>; }
