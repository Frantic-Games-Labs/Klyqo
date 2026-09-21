import { NextResponse } from "next/server";
import { db } from "@/db";
import { games, type NewGame } from "@/db/schema";
import { queryGames } from "@/lib/games";
import { isAdmin } from "@/lib/admin-auth";
import { validateGame } from "@/lib/game-validation";
import { localBuildExists } from "@/lib/game-assets";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const result = await queryGames({ q: p.get("q") || "", category: p.get("category") || "", status: p.get("status") || "", sort: p.get("sort") || "", page: Number(p.get("page")) || 1, limit: Number(p.get("limit")) || 12, slugs: p.has("slugs") ? (p.get("slugs") || "").split(",").filter(Boolean) : undefined });
  return NextResponse.json(result);
}
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Sign in to publish games." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  let data: Partial<NewGame>;
  try { data = validateGame(body); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid game." }, { status: 400 }); }
  if (data.status === "live" && (data.source || "local") === "local" && !(await localBuildExists(data.slug!))) return NextResponse.json({ error: "Upload your build before publishing, or keep it marked Coming soon." }, { status: 400 });
  try {
    const [game] = await db.insert(games).values(data as NewGame).returning();
    return NextResponse.json({ game }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not publish. That slug may already exist." }, { status: 409 }); }
}
