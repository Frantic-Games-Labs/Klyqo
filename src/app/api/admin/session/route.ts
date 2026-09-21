import { NextResponse } from "next/server";
import { checkSecret, createAdminSession, clearAdminSession } from "@/lib/admin-auth";
import { limited, requestKey } from "@/lib/rate-limit";
export async function POST(req: Request) {
  if (limited(`login:${requestKey(req)}`, 5, 300_000)) return NextResponse.json({ error: "Too many attempts. Try again in five minutes." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.secret !== "string" || !checkSecret(body.secret)) return NextResponse.json({ error: "Invalid key, or ADMIN_SECRET is not configured." }, { status: 401 });
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
export async function DELETE() { await clearAdminSession(); return NextResponse.json({ ok: true }); }
