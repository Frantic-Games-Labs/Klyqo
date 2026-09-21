import { NextResponse } from "next/server";
import { addHype, getGame } from "@/lib/games";
import { limited, requestKey } from "@/lib/rate-limit";
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (limited(`hype:${slug}:${requestKey(req)}`, 1, 86_400_000)) return NextResponse.json({ error: "Already counted. Thanks for the love." }, { status: 429 });
  if (!(await getGame(slug))) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  return NextResponse.json({ hypes: await addHype(slug) });
}
