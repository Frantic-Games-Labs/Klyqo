import { sql } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { queryGames } from "@/lib/games";
import AdminConsole from "./AdminConsole";
import AdminLogin from "./AdminLogin";
export const dynamic = "force-dynamic";
export const metadata = { title: "Creator studio", robots: { index: false, follow: false } };
export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin configured={Boolean(process.env.ADMIN_SECRET && process.env.ADMIN_SECRET.length >= 16)} />;
  const initial = await queryGames({ limit: 24 });
  const [stats] = await db.select({ total: sql<number>`count(*)::int` }).from(subscribers);
  return <AdminConsole initial={initial} subscribers={stats.total} />;
}
