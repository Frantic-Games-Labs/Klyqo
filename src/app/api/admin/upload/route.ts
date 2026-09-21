import { NextResponse } from "next/server";
import { unzipSync } from "fflate";
import { mkdir, writeFile, rename, rm, access } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isAdmin } from "@/lib/admin-auth";
import { limited, requestKey } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Publisher sign-in required." }, { status: 401 });
  if (limited(`upload:${requestKey(req)}`, 5, 60_000)) return NextResponse.json({ error: "Please wait a minute between upload batches." }, { status: 429 });
  if (Number(req.headers.get("content-length")) > 32 * 1024 * 1024) return NextResponse.json({ error: "ZIP must be smaller than 30 MB." }, { status: 413 });
  let temporary = "";
  try {
    const form = await req.formData(); const file = form.get("file"); const slug = String(form.get("slug") || "");
    if (!(file instanceof File) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) throw new Error("Add a valid title and slug, then choose a ZIP build.");
    if (file.size > 30 * 1024 * 1024 || !file.name.toLowerCase().endsWith(".zip")) throw new Error("Use a ZIP file smaller than 30 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let expandedSize = 0; const paths: string[] = [];
    unzipSync(bytes, { filter: (entry) => {
      if (entry.name.startsWith("__MACOSX/") || entry.name.endsWith("/")) return false;
      if (entry.name.includes("\\") || entry.name.startsWith("/") || entry.name.split("/").some((part) => part === ".." || part === "." || part.startsWith(".")) || entry.name.includes(":")) throw new Error("Unsafe archive path.");
      expandedSize += entry.originalSize;
      if (!Number.isFinite(expandedSize) || expandedSize > 150 * 1024 * 1024 || paths.length >= 2000) throw new Error("Build exceeds 150 MB expanded or 2,000 files. Deploy larger builds directly.");
      paths.push(entry.name); return false;
    } });
    const index = paths.filter((name) => name === "index.html" || name.endsWith("/index.html")).sort((a, b) => a.split("/").length - b.split("/").length)[0];
    if (!index) throw new Error("The ZIP needs an index.html entry point.");
    const prefix = index.slice(0, -"index.html".length);
    const selected = new Set(paths.filter((p) => p.startsWith(prefix)));
    const files = unzipSync(bytes, { filter: (entry) => selected.has(entry.name) });
    const base = path.resolve(/* turbopackIgnore: true */ process.env.GAME_STORAGE_DIR || path.join(process.cwd(), "storage", "games"));
    await mkdir(base, { recursive: true });
    temporary = path.join(base, `.upload-${randomUUID()}`); await mkdir(temporary);
    for (const [name, contents] of Object.entries(files)) {
      const relative = name.slice(prefix.length); if (!relative || relative.endsWith("/")) continue;
      const destination = path.resolve(temporary, relative);
      if (!destination.startsWith(temporary + path.sep)) throw new Error("Unsafe archive path.");
      await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, contents);
    }
    await access(path.join(temporary, "index.html"));
    const target = path.join(base, slug); const backup = path.join(base, `.old-${randomUUID()}`);
    let existed = false; try { await rename(target, backup); existed = true; } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    try { await rename(temporary, target); temporary = ""; } catch (e) { if (existed) await rename(backup, target); throw e; }
    if (existed) await rm(backup, { recursive: true, force: true });
    return NextResponse.json({ ok: true, url: `/games/${slug}/index.html`, files: Object.keys(files).length });
  } catch (e) {
    if (temporary) await rm(temporary, { recursive: true, force: true }).catch(() => {});
    return NextResponse.json({ error: e instanceof Error && /ZIP|archive|Build|index.html|valid title|Deploy/.test(e.message) ? e.message : "Could not read this build. Use a standard, unencrypted ZIP archive." }, { status: 400 });
  }
}
