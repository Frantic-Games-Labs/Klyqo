import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "klyqo-admin";
export function checkSecret(value: string) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || expected.length < 16) return false;
  const a = Buffer.from(value); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function sign(value: string) { return createHmac("sha256", process.env.ADMIN_SECRET || "not-configured").update(value).digest("hex"); }
export async function createAdminSession() {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 8 * 3600 });
}
export async function isAdmin() {
  if (!process.env.ADMIN_SECRET || process.env.ADMIN_SECRET.length < 16) return false;
  const value = (await cookies()).get(COOKIE)?.value || "";
  const [expires, sig] = value.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  const expected = sign(expires);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
export async function clearAdminSession() { (await cookies()).delete(COOKIE); }
