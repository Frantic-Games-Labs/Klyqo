import { NextResponse } from "next/server";
import { getGame, submitScore, topScores } from "@/lib/games";
import { limited, requestKey } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ slug: string }> };
export async function GET(_req: Request, { params }: Ctx) {
  return NextResponse.json({ scores: await topScores((await params).slug) });
}
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  if (limited(`score:${requestKey(req)}`, 15)) return NextResponse.json({ error: "Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => null);
  if (!body || !Number.isInteger(body.score) || body.score < 0 || body.score > 10_000_000) return NextResponse.json({ error: "Invalid score." }, { status: 400 });
  const game = await getGame(slug);
  if (!game || game.status !== "live") return NextResponse.json({ error: "Game unavailable." }, { status: 404 });
  const player = typeof body.player === "string" ? body.player.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 24) || "Player" : "Player";
  await submitScore(slug, player, body.score);
  return NextResponse.json({ ok: true, scores: await topScores(slug) });
}
