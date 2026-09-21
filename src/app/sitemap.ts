import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games } from "@/db/schema";
import { ensureSeeded } from "@/lib/games";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!origin) return [];
  await ensureSeeded();
  const live = await db.select({ slug: games.slug, createdAt: games.createdAt }).from(games).where(eq(games.status, "live")).limit(10000);
  return [{ url: origin, changeFrequency: "weekly", priority: 1 }, ...live.map((g) => ({ url: `${origin}/play/${g.slug}`, lastModified: g.createdAt, changeFrequency: "monthly" as const, priority: 0.8 }))];
}
