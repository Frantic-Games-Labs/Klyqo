// Lightweight single-instance protection. Use a shared limiter when horizontally scaling.
const hits = new Map<string, { n: number; until: number }>();
export function limited(key: string, max = 30, ms = 60_000) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.until < now) hits.delete(k);
  const entry = hits.get(key);
  if (!entry || entry.until < now) { hits.set(key, { n: 1, until: now + ms }); return false; }
  entry.n += 1;
  return entry.n > max;
}
export function requestKey(req: Request) { return (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim(); }
