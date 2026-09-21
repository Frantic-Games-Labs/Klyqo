"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
export default function AdSenseScript() {
  const [allowed, setAllowed] = useState(false);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
  useEffect(() => { try { setAllowed(localStorage.getItem("klyqo:ads-optout") !== "1"); } catch { setAllowed(false); } }, []);
  if (!enabled || !allowed || !client || !/^ca-pub-\d{16}$/.test(client)) return null;
  // Before enabling, publish Google's certified consent message in AdSense Privacy & messaging.
  // AdSense reads its CMP's TCF consent signal. Never replace it with a home-grown consent banner.
  return <Script id="klyqo-adsense" async strategy="afterInteractive" crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`} onReady={() => { (window as Window & { klyqoAdsReady?: boolean }).klyqoAdsReady = true; window.dispatchEvent(new Event("klyqo:ads-ready")); }} />;
}
