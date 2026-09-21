import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appMigrations, games, scores, type Game } from "@/db/schema";
import { seedGames } from "./seed-games";

let seedPromise: Promise<void> | null = null;
export async function ensureSeeded() {
  if (!seedPromise) seedPromise = db.transaction(async (tx) => {
    const migration = await tx.insert(appMigrations).values({ name: "klyqo-catalog-v2" }).onConflictDoNothing().returning();
    if (!migration.length) return;
    // Only remove the previous demo catalogue; preserve user-created games.
    await tx.delete(games).where(inArray(games.slug, ["neon-serpent", "blockfall-2077", "hyperlane", "void-breaker", "shardlands", "circuit-duel", "mindmesh", "pitstop-fury"]));
    await tx.insert(games).values(seedGames).onConflictDoNothing();
  }).catch((error) => { seedPromise = null; throw error; });
  return seedPromise;
}

export type CatalogQuery = { q?: string; category?: string; status?: string; sort?: string; page?: number; limit?: number; slugs?: string[] };
export async function queryGames(options: CatalogQuery = {}) {
  await ensureSeeded();
  const clauses: SQL[] = [];
  const q = (options.q || "").trim().slice(0, 120).replace(/[\\%_]/g, "\\$&");
  if (q) clauses.push(or(ilike(games.title, `%${q}%`), ilike(games.tags, `%${q}%`), ilike(games.category, `%${q}%`))!);
  if (options.category && options.category !== "All games") clauses.push(eq(games.category, options.category));
  if (options.status === "live" || options.status === "soon") clauses.push(eq(games.status, options.status));
  if (options.slugs) clauses.push(options.slugs.length ? inArray(games.slug, options.slugs.slice(0, 200)) : sql`false`);
  const where = clauses.length ? and(...clauses) : undefined;
  const limit = Math.max(1, Math.min(24, Math.floor(options.limit || 12)));
  const page = Math.max(1, Math.min(10000, Math.floor(options.page || 1)));
  const order = options.sort === "popular" ? [desc(games.plays), asc(games.id)] : options.sort === "new" ? [desc(games.createdAt), desc(games.id)] : options.sort === "az" ? [asc(games.title), asc(games.id)] : [asc(games.sortOrder), asc(games.id)];
  const [items, [count], cats] = await Promise.all([
    db.select().from(games).where(where).orderBy(...order).limit(limit).offset((page - 1) * limit),
    db.select({ total: sql<number>`count(*)::int` }).from(games).where(where),
    db.selectDistinct({ category: games.category }).from(games).orderBy(games.category),
  ]);
  return { games: items, total: count.total, page, hasMore: page * limit < count.total, categories: cats.map((c) => c.category) };
}
export async function listGames(): Promise<Game[]> { return (await queryGames({ limit: 24 })).games; }
export async function getGame(slug: string): Promise<Game | null> {
  await ensureSeeded();
  const [game] = await db.select().from(games).where(eq(games.slug, slug)).limit(1);
  return game || null;
}
export async function relatedGames(game: Game, limit = 4) {
  return (await db.select().from(games).where(sql`${games.slug} != ${game.slug}`).orderBy(games.sortOrder).limit(limit));
}
export async function registerPlay(slug: string) {
  await db.update(games).set({ plays: sql`${games.plays} + 1` }).where(and(eq(games.slug, slug), eq(games.status, "live")));
}
export async function addHype(slug: string) {
  const [row] = await db.update(games).set({ hypes: sql`${games.hypes} + 1` }).where(eq(games.slug, slug)).returning({ hypes: games.hypes });
  return row?.hypes || 0;
}
export async function topScores(slug: string, limit = 10) {
  return db.select().from(scores).where(eq(scores.gameSlug, slug)).orderBy(desc(scores.score)).limit(limit);
}
export async function submitScore(slug: string, player: string, score: number) {
  await db.insert(scores).values({ gameSlug: slug, player: player.slice(0, 24) || "Player", score });
}
export function gameUrl(game: Game): string | null {
  if (game.status !== "live") return null;
  return game.source === "local" ? `/games/${game.slug}/index.html` : game.url;
}
