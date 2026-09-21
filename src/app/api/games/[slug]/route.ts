import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games } from "@/db/schema";
import { getGame } from "@/lib/games";
import { isAdmin } from "@/lib/admin-auth";
import { validateGame } from "@/lib/game-validation";
import { localBuildExists } from "@/lib/game-assets";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ slug: string }> };
export async function GET(_req: Request, { params }: Ctx) {
  const game = await getGame((await params).slug);
  return game ? NextResponse.json({ game }) : NextResponse.json({ error: "Game not found." }, { status: 404 });
}
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  await db.delete(games).where(eq(games.slug, (await params).slug));
  return NextResponse.json({ ok: true });
}
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const data = validateGame(body, true);
    if (!Object.keys(data).length) throw new Error("Nothing to update.");
    const current = await getGame((await params).slug);
    if (!current) return NextResponse.json({ error: "Game not found." }, { status: 404 });
    const nextSource = data.source || current.source;
    const nextStatus = data.status || current.status;
    if (nextStatus === "live" && nextSource === "local" && !(await localBuildExists(current.slug))) return NextResponse.json({ error: "Upload the game build before publishing it." }, { status: 400 });
    if (nextStatus === "live" && nextSource !== "local" && !(data.url || current.url)) return NextResponse.json({ error: "This game needs an HTTPS URL." }, { status: 400 });
    const [game] = await db.update(games).set(data).where(eq(games.slug, current.slug)).returning();
    return game ? NextResponse.json({ game }) : NextResponse.json({ error: "Game not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Check your game details and try again." }, { status: 400 }); }
}
