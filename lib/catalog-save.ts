import "server-only";
import { catalogStorage } from "./server-catalog";
import { adminCatalogSnapshot, adminImageUrl, Product, validateCategories, validateProduct, validateSetCapacity } from "./catalog";
const headers = { "Cache-Control": "no-store, private" };
// Call only after verifying the administrator session and same-origin request.
export async function saveCatalogPayload(input: unknown): Promise<Response> {
  const data = input as { products?: unknown; revision?: unknown; categories?: unknown } | null;
  if (!data || !Array.isArray(data.products) || data.products.length > 5000 || typeof data.revision !== "string") return Response.json({ error: "Invalid catalog data." }, { status: 400, headers });
  const current = await catalogStorage.read();
  if (current.revision !== data.revision) return Response.json({ error: "The catalog changed. Refresh and try again." }, { status: 409, headers });
  const products = (data.products as Product[]).map(product => {
    if (!product || typeof product.image !== "string" || !product.image.startsWith("/api/products/")) return product;
    const previous = current.products.find(item => item.id === product.id);
    return previous && product.image === adminImageUrl(product.id, current.revision)
      ? { ...product, image: previous.image } : { ...product, image: "invalid-image-reference" };
  });
  const categories = (data.categories === undefined ? current.categories : data.categories) as string[];
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
  try { return Response.json(adminCatalogSnapshot(await catalogStorage.write(products, data.revision, categories)), { headers }); }
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
