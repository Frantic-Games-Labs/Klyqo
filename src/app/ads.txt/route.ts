export const dynamic = "force-dynamic";
export async function GET() {
  const publisher = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.replace(/^ca-/, "");
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
  if (!enabled || !publisher || !/^pub-\d{16}$/.test(publisher)) return new Response("# Advertising is not enabled on this site.\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(`google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
