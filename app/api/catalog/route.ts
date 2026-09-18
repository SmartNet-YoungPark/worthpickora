import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { catalogStorage, publicCatalog } from "@/lib/server-catalog";
import { Product, validateCategories, validateProduct, validateSetCapacity } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private" };

export async function GET(request: NextRequest) {
  const admin = request.nextUrl.searchParams.get("scope") === "admin";
  if (admin && !await isAdmin()) return Response.json({ error: "Sign in to view the administrator catalog." }, { status: 401, headers });
  return Response.json(admin ? await catalogStorage.read() : await publicCatalog(), { headers });
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
  if (!data || !Array.isArray(data.products) || data.products.length > 5000 || typeof data.revision !== "string") return Response.json({ error: "Invalid catalog data." }, { status: 400, headers });
  const products = data.products as Product[];
  const categories = data.categories === undefined ? (await catalogStorage.read()).categories : data.categories;
  const categoryError = validateCategories(categories);
  if (categoryError) return Response.json({ error: categoryError }, { status: 400, headers });
  const ids = new Set<string>(); const codes = new Set<string>();
  for (const product of products) {
    const problem = validateProduct(product, [], categories);
    if (problem) return Response.json({ error: problem }, { status: 400, headers });
    if (ids.has(product.id) || codes.has(product.code.toLowerCase())) return Response.json({ error: "Duplicate product ID or code." }, { status: 400, headers });
    ids.add(product.id); codes.add(product.code.toLowerCase());
  }
  const capacityError = validateSetCapacity(products);
  if (capacityError) return Response.json({ error: capacityError }, { status: 400, headers });
  try { return Response.json(await catalogStorage.write(products, data.revision, categories), { headers }); }
  catch (error) {
    // Next.js can load server modules in separate route bundles, so classify
    // storage errors by their stable code rather than class identity.
    const conflict = error instanceof Error && "code" in error && error.code === "CATALOG_CONFLICT";
    const code = error instanceof Error && "code" in error ? error.code : "";
    const storageError = code === "EROFS"
      ? "The server filesystem is read-only. Connect catalog storage to a persistent database before adding, editing, or deleting products."
      : code === "EACCES" || code === "EPERM"
        ? "The server does not have permission to write the catalog. Check the catalog storage configuration."
        : "The server could not save the catalog. Please try again.";
    const known = code === "CATALOG_CONFIGURATION" || code === "CATALOG_STORAGE";
    return Response.json({ error: conflict || known ? (error as Error).message : storageError }, { status: conflict ? 409 : 500, headers });
  }
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
