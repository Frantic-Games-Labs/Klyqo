import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers, games } from "@/db/schema";
import { limited, requestKey } from "@/lib/rate-limit";
export async function POST(req: Request) {
  if (limited(`subscribe:${requestKey(req)}`, 8, 60_000)) return NextResponse.json({ error: "A few too many requests. Try again in a minute." }, { status: 429 });
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const slug = typeof body?.slug === "string" ? body.slug.slice(0, 120) : "all";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || body?.consent !== true) return NextResponse.json({ error: "Enter a valid email and agree to receive release updates." }, { status: 400 });
  if (slug !== "all" && !(await db.select({ id: games.id }).from(games).where(eq(games.slug, slug)).limit(1)).length) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  await db.insert(subscribers).values({ email, gameSlug: slug }).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
export async function DELETE(req: Request) {
  if (limited(`unsubscribe:${requestKey(req)}`, 6, 60_000)) return NextResponse.json({ error: "Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  await db.delete(subscribers).where(eq(subscribers.email, email));
  return NextResponse.json({ ok: true });
}
