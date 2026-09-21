import type { NewGame } from "@/db/schema";
export function validateGame(body: Record<string, unknown>, partial = false): Partial<NewGame> {
  const out: Record<string, unknown> = {};
  const fields: Record<string, number> = { title: 160, tagline: 240, description: 6000, category: 60, tags: 600, controls: 400 };
  for (const [key, max] of Object.entries(fields)) {
    if (typeof body[key] === "string") out[key] = body[key].trim().slice(0, max);
  }
  if ((!partial || body.title !== undefined) && !out.title) throw new Error("A title is required.");
  if (!partial) {
    const slug = String(body.slug || body.title || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
    if (!slug) throw new Error("Use a slug with letters or numbers.");
    out.slug = slug;
  }
  for (const [key, values] of Object.entries({ source: ["local", "embed", "external"], status: ["live", "soon", "maintenance"], weight: ["light", "medium", "heavy"], orientation: ["landscape", "portrait"] })) {
    if (body[key] !== undefined) { if (!values.includes(String(body[key]))) throw new Error(`Invalid ${key}.`); out[key] = body[key]; }
  }
  for (const key of ["accent", "accent2"]) if (body[key]) { if (!/^#[0-9a-f]{6}$/i.test(String(body[key]))) throw new Error("Use a six-digit hex color."); out[key] = body[key]; }
  for (const key of ["coverUrl", "url"]) if (typeof body[key] === "string") {
    const value = body[key].trim();
    if (value && !(value.startsWith("/") && !value.startsWith("//")) && !/^https:\/\//.test(value)) throw new Error(`${key} must be a local path or an HTTPS URL.`);
    if (key === "url" && value && !/^https:\/\//.test(value)) throw new Error("Embed and external URLs must use HTTPS.");
    out[key] = value || null;
  }
  if (!partial && ["embed", "external"].includes(String(out.source)) && !out.url) throw new Error("This source needs an HTTPS URL.");
  if (typeof body.featured === "boolean") out.featured = body.featured;
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) out.sortOrder = Math.max(0, Math.min(100000, Math.floor(body.sortOrder)));
  return out;
}
