import { NextResponse } from "next/server";
import { getGame, registerPlay } from "@/lib/games";
import { limited, requestKey } from "@/lib/rate-limit";
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (limited(`play:${requestKey(req)}`, 20)) return NextResponse.json({ error: "Try again shortly." }, { status: 429 });
  const game = await getGame(slug);
  if (!game || game.status !== "live") return NextResponse.json({ error: "Not playable yet." }, { status: 404 });
  await registerPlay(slug);
  return NextResponse.json({ ok: true });
}
