import { createReadStream } from "node:fs";
import { stat, access } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".wasm": "application/wasm", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain" };
function roots() { return [path.resolve(/* turbopackIgnore: true */ process.env.GAME_STORAGE_DIR || path.join(process.cwd(), "storage", "games")), path.join(process.cwd(), "public", "games")]; }
export async function localBuildExists(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return false;
  for (const root of roots()) { try { await access(path.join(root, slug, "index.html")); return true; } catch { /* next root */ } }
  return false;
}
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; asset: string[] }> }) {
  const { slug, asset } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !asset?.length || asset.some((s) => !s || s === "." || s === ".." || s.startsWith(".") || /[\\/\0]/.test(s))) return new Response("Invalid path", { status: 400 });
  for (const root of roots()) {
    const filename = path.join(root, slug, ...asset);
    try {
      const info = await stat(filename); if (!info.isFile()) continue;
      const encoded = filename.endsWith(".br") ? "br" : filename.endsWith(".gz") ? "gzip" : "";
      const plain = encoded ? filename.replace(/\.(br|gz)$/, "") : filename;
      const etag = `W/\"${info.size}-${Math.floor(info.mtimeMs)}\"`;
      const headers = new Headers({ "Content-Type": types[path.extname(plain).toLowerCase()] || "application/octet-stream", "Cache-Control": plain.endsWith(".html") ? "no-cache" : /[.-][a-f0-9]{8,}[.-]/i.test(plain) ? "public, max-age=31536000, immutable" : "public, max-age=3600", ETag: etag, "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes" });
      if (encoded) headers.set("Content-Encoding", encoded);
      if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
      let start = 0, end = info.size - 1, status = 200;
      const range = req.headers.get("range");
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
        start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
        if (start > end || start >= info.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
        status = 206; headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
      }
      headers.set("Content-Length", String(Math.max(0, end - start + 1)));
      if (info.size === 0) return new Response(null, { headers });
      const stream = Readable.toWeb(createReadStream(filename, { start, end })) as ReadableStream<Uint8Array>;
      return new Response(stream, { status, headers });
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") return new Response("Unable to load asset", { status: 500 }); }
  }
  return new Response("This build is not uploaded yet.", { status: 404, headers: { "Content-Type": "text/plain" } });
}
