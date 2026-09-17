import "server-only";
import { resolve } from "node:path";
import { CATEGORIES, normalizeLegacyCategory, seedProducts, storefrontProducts } from "./catalog";
import { createCatalogStorage } from "./catalog-storage";

const state = globalThis as typeof globalThis & { worthpickoraStorageV2?: ReturnType<typeof createCatalogStorage> };
export const catalogStorage = state.worthpickoraStorageV2 ??= createCatalogStorage(
  process.env.CATALOG_DATA_FILE || resolve(process.cwd(), ".data", "catalog.json"), seedProducts, CATEGORIES, normalizeLegacyCategory,
);
export async function publicCatalog() {
  const catalog = await catalogStorage.read();
  return { ...catalog, products: storefrontProducts(catalog.products, catalog.revision) };
}
