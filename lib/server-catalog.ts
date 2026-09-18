import "server-only";
import { resolve } from "node:path";
import { CATEGORIES, normalizeLegacyCategory, seedProducts, storefrontProducts } from "./catalog";
import { createCatalogStorage } from "./catalog-storage";
import { createSupabaseCatalogStorage } from "./supabase-catalog-storage";

const state = globalThis as typeof globalThis & { worthpickoraStorageV2?: ReturnType<typeof createCatalogStorage> };
const fileStorage = state.worthpickoraStorageV2 ??= createCatalogStorage(
  process.env.CATALOG_DATA_FILE || resolve(process.cwd(), ".data", "catalog.json"), seedProducts, CATEGORIES, normalizeLegacyCategory,
);
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const catalogStorage = supabaseUrl && supabaseKey
  ? createSupabaseCatalogStorage(supabaseUrl, supabaseKey)
  : {
      read: fileStorage.read,
      async write(...args: Parameters<typeof fileStorage.write>) {
        if (process.env.VERCEL) throw Object.assign(new Error("Configure SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel, then redeploy to enable catalog changes."), { code: "CATALOG_CONFIGURATION" });
        return fileStorage.write(...args);
      },
    };
export async function publicCatalog() {
  const catalog = await catalogStorage.read();
  return { ...catalog, products: storefrontProducts(catalog.products, catalog.revision) };
}
