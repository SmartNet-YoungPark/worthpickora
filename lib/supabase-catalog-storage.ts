import type { CatalogSnapshot, Product } from "./catalog";
import { CatalogConflict } from "./catalog-storage.ts";

// Only imported by server-catalog.ts (which enforces the server-only boundary).
export function createSupabaseCatalogStorage(url: string, key: string, transport: typeof fetch = fetch) {
  const endpoint = new URL("/rest/v1/rpc/", url);
  async function rpcRaw(name: string, body: object): Promise<unknown> {
    const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
    // Legacy service_role keys are JWTs; new sb_secret keys use apikey only.
    if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
    const response = await transport(new URL(name, endpoint), {
      method: "POST", headers, body: JSON.stringify(body), cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (data?.code === "40001") throw new CatalogConflict();
      const providerCode = typeof data?.code === "string" && /^[A-Z0-9]{5,12}$/.test(data.code) ? data.code : "UNKNOWN";
      const message = response.status === 401 || response.status === 403
        ? "Supabase catalog access was denied. Check the server's Supabase secret key."
        : data?.code === "PGRST202"
          ? "The Supabase catalog functions are missing. Apply the catalog bridge migration."
          : data?.code === "23505"
            ? "A duplicate product code or category was rejected. Refresh the catalog and try again."
            : data?.code === "23514"
              ? "A catalog constraint failed. Check product fields and the 10-product set limit."
              : data?.code === "57014"
                ? "Supabase timed out while processing the catalog. Refresh to check the current catalog before retrying."
                : data?.code === "23503"
                  ? "Supabase could not find a referenced category, set, store, or brand. Refresh the catalog before retrying."
                  : data?.code === "55P03" || data?.code === "40P01"
                    ? "Another catalog operation is blocking this save. Please retry after it finishes."
                    : response.status === 413
                      ? "Supabase rejected the catalog payload size. The database request needs a smaller payload."
                      : "Supabase could not save or load the catalog. No successful save was confirmed.";
      throw Object.assign(new Error(`${message} [${name}: HTTP ${response.status}, code ${providerCode}]`), { code: "CATALOG_STORAGE" }); // Never expose raw provider responses.
    }
    return data;
  }
  async function rpc(name: string, body: object): Promise<CatalogSnapshot> {
    const data = await rpcRaw(name, body) as CatalogSnapshot | null;
    if (!data || !Array.isArray(data.products) || !Array.isArray(data.categories) || typeof data.revision !== "string") {
      throw new Error("Supabase returned an invalid catalog response.");
    }
    return data as CatalogSnapshot;
  }
  async function readMetadata(): Promise<CatalogSnapshot> {
      const snapshot = await rpc("catalog_snapshot_metadata", {});
      return { ...snapshot, products: snapshot.products.map(product => {
        const { image_embedded: embedded, ...fields } = product as Product & { image_embedded?: boolean };
        return { ...fields, image: embedded ? `/api/products/${encodeURIComponent(product.id)}/image?scope=admin&v=${encodeURIComponent(snapshot.revision)}` : product.image };
      }) };
    }
  return {
    read: readMetadata,
    readMetadata,
    async readImage(id: string): Promise<Pick<Product, "id" | "image" | "status"> | null> {
      const data = await rpcRaw("catalog_product_image", { p_id: id }) as Pick<Product, "id" | "image" | "status"> | null;
      if (data === null) return null;
      if (data.id !== id || typeof data.image !== "string" || typeof data.status !== "string") throw new Error("Supabase returned an invalid image response.");
      return data;
    },
    async write(products: Product[], revision: string, categories?: string[]) {
      const current = await readMetadata();
      if (current.revision !== revision) throw new CatalogConflict();
      if(products.some(product=>product.options?.trim())&&!(current as CatalogSnapshot & {productOptionsSupported?:boolean}).productOptionsSupported)throw new Error("Apply 20260924040000_product_options.sql in Supabase before saving product options.");
      const names = categories ?? current.categories;
      const previous = new Map(current.products.map(product => [product.id, product]));
      const ids = new Set(products.map(product => product.id));
      const upserts = products.filter(product => JSON.stringify(product) !== JSON.stringify(previous.get(product.id))).map(product => {
        if (!product.image?.startsWith("/api/products/")) return product;
        if (previous.get(product.id)?.image !== product.image) throw new Error("Invalid image reference. Refresh before saving.");
        const fields: Partial<Product> = { ...product };
        delete fields.image; // Missing image means preserve the stored bytes inside the transaction.
        return fields;
      });
      const saved = await rpc("catalog_apply_metadata", {
        p_upserts: upserts,
        p_delete_ids: current.products.filter(product => !ids.has(product.id)).map(product => product.id),
        p_categories: names,
        p_remove_categories: current.categories.filter(name => !names.includes(name)),
        p_revision: revision,
      });
      return { ...saved, products: saved.products.map(product => {
        const { image_embedded: embedded, ...fields } = product as Product & { image_embedded?: boolean };
        return { ...fields, image: embedded ? `/api/products/${encodeURIComponent(product.id)}/image?scope=admin&v=${encodeURIComponent(saved.revision)}` : product.image };
      }) };
    },
  };
}
