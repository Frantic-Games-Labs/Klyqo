import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
export const dynamic = "force-dynamic";
function cell(value: string) { return `"${(/^[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`; }
export async function GET() {
  if (!(await isAdmin())) return new Response("Not authorized", { status: 401 });
  const rows = await db.select().from(subscribers).orderBy(subscribers.createdAt);
  const csv = ["email,game,consented_at", ...rows.map((s) => [cell(s.email), cell(s.gameSlug), cell(s.createdAt.toISOString())].join(","))].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=klyqo-release-optins.csv", "Cache-Control": "no-store" } });
}
