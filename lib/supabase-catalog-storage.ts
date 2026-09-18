import type { CatalogSnapshot, Product } from "./catalog";
import { CatalogConflict } from "./catalog-storage.ts";

// Only imported by server-catalog.ts (which enforces the server-only boundary).
export function createSupabaseCatalogStorage(url: string, key: string, transport: typeof fetch = fetch) {
  const endpoint = new URL("/rest/v1/rpc/", url);
  async function rpc(name: string, body: object): Promise<CatalogSnapshot> {
    const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
    // Legacy service_role keys are JWTs; new sb_secret keys use apikey only.
    if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
    const response = await transport(new URL(name, endpoint), {
      method: "POST", headers, body: JSON.stringify(body), cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (data?.code === "40001") throw new CatalogConflict();
      const message = response.status === 401 || response.status === 403
        ? "Supabase catalog access was denied. Check the server's Supabase secret key."
        : data?.code === "PGRST202"
          ? "The Supabase catalog functions are missing. Apply the catalog bridge migration."
          : data?.code === "23505"
            ? "A duplicate product code or category was rejected. Refresh the catalog and try again."
            : data?.code === "23514"
              ? "A catalog constraint failed. Check product fields and the 10-product set limit."
              : "Supabase could not save or load the catalog. No successful save was confirmed.";
      throw Object.assign(new Error(message), { code: "CATALOG_STORAGE" }); // Never expose raw provider responses.
    }
    if (!data || !Array.isArray(data.products) || !Array.isArray(data.categories) || typeof data.revision !== "string") {
      throw new Error("Supabase returned an invalid catalog response.");
    }
    return data as CatalogSnapshot;
  }
  return {
    read: () => rpc("catalog_snapshot", {}),
    async write(products: Product[], revision: string, categories?: string[]) {
      const current = await rpc("catalog_snapshot", {});
      if (current.revision !== revision) throw new CatalogConflict();
      const names = categories ?? current.categories;
      const previous = new Map(current.products.map(product => [product.id, product]));
      const ids = new Set(products.map(product => product.id));
      return rpc("catalog_apply", {
        p_upserts: products.filter(product => JSON.stringify(product) !== JSON.stringify(previous.get(product.id))),
        p_delete_ids: current.products.filter(product => !ids.has(product.id)).map(product => product.id),
        p_categories: names,
        p_remove_categories: current.categories.filter(name => !names.includes(name)),
        p_revision: revision,
      });
    },
  };
}
