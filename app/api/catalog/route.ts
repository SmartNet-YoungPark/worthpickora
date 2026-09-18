import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { adminCatalog, catalogStorage, publicCatalog } from "@/lib/server-catalog";
import { saveCatalogPayload } from "@/lib/catalog-save";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private" };

export async function GET(request: NextRequest) {
  const admin = request.nextUrl.searchParams.get("scope") === "admin";
  if (admin && !await isAdmin()) return Response.json({ error: "Sign in to view the administrator catalog." }, { status: 401, headers });
  return Response.json(admin ? await adminCatalog() : await publicCatalog(), { headers });
}

export async function PUT(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await isAdmin()) return Response.json({ error: "Your administrator session has expired. Sign in again before saving." }, { status: 401, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Expected JSON." }, { status: 415, headers });
  const limit = 64 * 1024 * 1024;
  if (Number(request.headers.get("content-length")) > limit) return Response.json({ error: "The catalog exceeds 64 MB." }, { status: 413, headers });
  let data;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing body");
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) { await reader.cancel(); return Response.json({ error: "The catalog exceeds 64 MB." }, { status: 413, headers }); }
      chunks.push(value);
    }
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return Response.json({ error: "Invalid catalog data." }, { status: 400, headers }); }
  return saveCatalogPayload(data);
}

// Send IDs only; deleting must not upload the remaining catalog and its images.
export async function DELETE(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await isAdmin()) return Response.json({ error: "Your administrator session has expired. Sign in again before deleting." }, { status: 401, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Expected JSON." }, { status: 415, headers });
  let data;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing body");
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 2 * 1024 * 1024) { await reader.cancel(); return Response.json({ error: "Too many deletion IDs." }, { status: 413, headers }); }
      chunks.push(value);
    }
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return Response.json({ error: "Invalid deletion request." }, { status: 400, headers }); }
  if (!data || typeof data.revision !== "string" || !Array.isArray(data.ids) || !data.ids.length || data.ids.length > 5000 || data.ids.some((id: unknown) => typeof id !== "string" || !id || id.length > 200)) return Response.json({ error: "Invalid product IDs." }, { status: 400, headers });
  try {
    const current = await catalogStorage.read();
    if (current.revision !== data.revision) return Response.json({ error: "The catalog changed. Refresh and review the products before deleting again." }, { status: 409, headers });
    const ids = new Set<string>(data.ids);
    if ([...ids].some(id => !current.products.some(product => product.id === id))) return Response.json({ error: "A selected product no longer exists. Refresh before deleting again." }, { status: 409, headers });
    const saved = await catalogStorage.write(current.products.filter(product => !ids.has(product.id)), data.revision, current.categories);
    return Response.json({ revision: saved.revision, deleted: [...ids] }, { headers });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : "";
    const conflict = code === "CATALOG_CONFLICT";
    const known = conflict || code === "CATALOG_STORAGE" || code === "CATALOG_CONFIGURATION";
    return Response.json({ error: known ? (error as Error).message : "The server could not delete products. Check the persistent catalog storage configuration." }, { status: conflict ? 409 : 500, headers });
  }
}
