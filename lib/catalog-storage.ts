import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { CatalogSnapshot, Product } from "./catalog";

export class CatalogConflict extends Error {
  readonly code = "CATALOG_CONFLICT";
  constructor() { super("The catalog changed in another session. Review the latest products and save again."); }
}

export function createCatalogStorage(file: string, seed: Product[], defaults: readonly string[] = [...new Set(seed.map(product => product.category))], migrateCategory: (name: string) => string = name => name) {
  let pending: Promise<unknown> = Promise.resolve();
  async function read(): Promise<CatalogSnapshot> {
    try {
      const data = JSON.parse(await readFile(file, "utf8"));
      if (!Array.isArray(data.products) || typeof data.revision !== "string") throw new Error("The saved catalog is invalid.");
      const legacy = !Array.isArray(data.categories);
      const products: Product[] = legacy ? data.products.map((product: Product) => ({ ...product, category: migrateCategory(product.category) })) : data.products;
      const categories: string[] = legacy ? [...new Set([...defaults, ...products.map(product => product.category)])] : data.categories;
      return { products, categories, revision: data.revision, persisted: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { products: seed, categories: [...defaults], revision: "initial", persisted: false };
      throw error; // Never replace unreadable user data with starter products.
    }
  }
  function write(products: Product[], revision: string, categories?: string[]): Promise<CatalogSnapshot> {
    const operation = pending.then(async () => {
      const current = await read();
      if (current.revision !== revision) throw new CatalogConflict();
      const next = { products, categories: categories || current.categories, revision: randomUUID(), persisted: true };
      await mkdir(dirname(file), { recursive: true });
      const temporary = `${file}.${randomUUID()}.tmp`;
      try { await writeFile(temporary, JSON.stringify(next), { encoding: "utf8", mode: 0o600 }); await rename(temporary, file); }
      catch (error) { await unlink(temporary).catch(() => {}); throw error; }
      return next;
    });
    pending = operation.catch(() => {});
    return operation;
  }
  return { read, write };
}
