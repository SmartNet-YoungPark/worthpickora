import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCatalogStorage, CatalogConflict } from "../lib/catalog-storage.ts";
import { CATEGORIES, normalizeLegacyCategory, seedProducts } from "../lib/catalog.ts";

test("saved product edits and images survive a new storage instance", async () => {
  const directory = await mkdtemp(join(tmpdir(), "worthpickora-storage-"));
  const file = join(directory, "catalog.json");
  try {
    const store = createCatalogStorage(file, seedProducts);
    const initial = await store.read();
    assert.equal(initial.persisted, false);
    const products = structuredClone(initial.products);
    products[0].name = "Updated across every browser";
    products[0].image = "data:image/png;base64,iVBORw0KGgo=";
    products[0].photo = null;
    const saved = await store.write(products, initial.revision);
    assert.notEqual(saved.revision, initial.revision);
    assert.equal(saved.persisted, true);
    const reloaded = await createCatalogStorage(file, seedProducts).read();
    assert.deepEqual(reloaded, saved);
    assert.equal(JSON.parse(await readFile(file, "utf8")).products[0].image, products[0].image);
  } finally { await unlink(file).catch(() => {}); await rmdir(directory); }
});

test("permanently deleted products and images stay removed after reload, including an empty catalog", async () => {
  const directory = await mkdtemp(join(tmpdir(), "worthpickora-delete-"));
  const file = join(directory, "catalog.json");
  try {
    const store = createCatalogStorage(file, seedProducts);
    const initial = await store.read();
    const saved = await store.write(initial.products.slice(1), initial.revision);
    const reloaded = await createCatalogStorage(file, seedProducts).read();
    assert.deepEqual(reloaded.products, seedProducts.slice(1));
    assert.ok(!reloaded.products.some(product => product.id === seedProducts[0].id));
    await assert.rejects(store.write(initial.products, initial.revision), CatalogConflict);
    await store.write([], saved.revision);
    assert.deepEqual((await createCatalogStorage(file, seedProducts).read()).products, []);
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")).products, []);
  } finally { await unlink(file).catch(() => {}); await rmdir(directory); }
});

test("legacy catalogs migrate category names without losing product IDs, images or sets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "worthpickora-migration-"));
  const file = join(directory, "catalog.json");
  try {
    const product = { ...seedProducts[0], category: "Home", set: 29, image: "data:image/png;base64,iVBORw0KGgo=" };
    await writeFile(file, JSON.stringify({ products: [product], revision: "old-revision" }));
    const store = createCatalogStorage(file, seedProducts, CATEGORIES, normalizeLegacyCategory);
    const migrated = await store.read();
    assert.deepEqual(migrated.categories, CATEGORIES);
    assert.deepEqual(migrated.products[0], { ...product, category: "Home & Kitchen" });
    const editedCategories = migrated.categories.filter(name => name !== "Tech");
    const saved = await store.write(migrated.products, migrated.revision, editedCategories);
    const fresh = await createCatalogStorage(file, seedProducts, CATEGORIES, normalizeLegacyCategory).read();
    assert.deepEqual(fresh, saved);
    assert.ok(!fresh.categories.includes("Tech"), "deleted defaults must not be recreated on reload");
  } finally { await unlink(file).catch(() => {}); await rmdir(directory); }
});

test("concurrent stale writes cannot overwrite a successfully saved catalog", async () => {
  const directory = await mkdtemp(join(tmpdir(), "worthpickora-conflict-"));
  const file = join(directory, "catalog.json");
  try {
    const store = createCatalogStorage(file, seedProducts);
    const original = await store.read();
    const first = [{ ...seedProducts[0], name: "First edit" }];
    const second = [{ ...seedProducts[0], name: "Stale edit" }];
    const results = await Promise.allSettled([store.write(first, original.revision), store.write(second, original.revision)]);
    assert.equal(results[0].status, "fulfilled");
    assert.equal(results[1].status, "rejected");
    assert.ok(results[1].reason instanceof CatalogConflict);
    assert.equal((await store.read()).products[0].name, "First edit");
  } finally { await unlink(file).catch(() => {}); await rmdir(directory); }
});
