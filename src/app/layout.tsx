import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ArcadeProvider from "@/components/ArcadeProvider";
import AdSenseScript from "@/components/ads/AdSenseScript";
import { SiteFooter, TopNav } from "@/components/SiteChrome";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "KLYQO — Less scroll. More play.", template: "%s — KLYQO" },
  description: "Old-school soul. New-school energy. Play Snake and Tetris instantly, save your favourites, and discover the next drop. No installs. No mid-game interruptions.",
  icons: { icon: "/icon.svg" },
  openGraph: { title: "KLYQO — Less scroll. More play.", description: "Your browser’s better half. An independent playground, built for the love of play.", images: ["/images/arcade-hero.png"] },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><ArcadeProvider><AdSenseScript /><TopNav /><div className="site-main"><main>{children}</main><SiteFooter /></div></ArcadeProvider></body></html>;
}
