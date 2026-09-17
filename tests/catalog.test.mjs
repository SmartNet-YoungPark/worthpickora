import assert from "node:assert/strict";
import test from "node:test";
import { CATEGORIES, exportCsv, importCsv, normalizeLegacyCategory, parseCsv, prepareCsvImport, productSets, sortProductsBySetCode, storefrontProducts, seedProducts, validateCategories, validateProduct, validateSetCapacity, validUrl } from "../lib/catalog.ts";

test("CSV preserves quoted commas, escaped quotes, Unicode, and multiline descriptions", () => {
  const product = { ...seedProducts[0], name: '이어버드, "Everyday"', description: "First line\nSecond line" };
  const imported = importCsv(exportCsv([product]), []);
  assert.equal(imported[0].name, product.name);
  assert.equal(imported[0].description, product.description);
  assert.equal(imported[0].photo, null);
});

test("matching codes in a different set update in place and keep other products", () => {
  const edited = { ...seedProducts[0], name: "Updated Earbuds", status: "Draft", set: 2 };
  const next = importCsv(exportCsv([edited]), seedProducts);
  assert.equal(next.length, seedProducts.length);
  assert.equal(next[0].id, seedProducts[0].id);
  assert.equal(next[0].name, "Updated Earbuds");
  assert.equal(next[0].status, "Draft");
  assert.deepEqual(next[1], seedProducts[1]);
});

test("new products are added with stable unique IDs and default draft status", () => {
  const next = importCsv("name,code,category,store,url\nNew Lamp,H999,Home,Amazon,https://example.com/lamp", seedProducts);
  assert.equal(next.length, seedProducts.length + 1);
  assert.equal(next.at(-1).status, "Draft");
  assert.ok(next.at(-1).id);
  assert.equal(new Set(next.map(item => item.id)).size, next.length);
});

test("sets allow ten products and reject eleven across all publication statuses", () => {
  const ten = Array.from({ length: 10 }, (_, i) => ({ ...seedProducts[0], id: `limit-${i}`, code: `L${i}`, status: i % 2 ? "Draft" : "Archived" }));
  assert.equal(validateSetCapacity(ten), "");
  assert.equal(validateSetCapacity([{ ...ten[0], name: "Edited" }, ...ten.slice(1)]), "");
  const extra = { ...seedProducts[0], id: "extra", code: "L10" };
  assert.match(validateSetCapacity([...ten, extra]), /Tech Set 1.*at most 10/);
  assert.equal(validateSetCapacity([...ten, { ...extra, set: 2 }]), "");
  assert.equal(validateSetCapacity([...ten, { ...extra, category: "Home & Kitchen" }]), "");
  const before = structuredClone(ten);
  assert.throws(() => importCsv(exportCsv([extra]), ten), /Tech Set 1.*at most 10/);
  assert.deepEqual(ten, before);
  assert.equal(importCsv(exportCsv(ten), []).length, 10);
  assert.throws(() => importCsv(exportCsv([...ten, extra]), []), /at most 10/);
});

test("import skips existing duplicates and rejects an entirely duplicate file", () => {
  const before = structuredClone(seedProducts);
  const newProduct = { ...seedProducts[0], code: "T999", set: 2 };
  const duplicate = { ...seedProducts[0], code: " t001 ", name: "Must not overwrite" };
  const report = prepareCsvImport(exportCsv([newProduct, duplicate]), seedProducts);
  assert.equal(report.imported, 1);
  assert.equal(report.products.length, seedProducts.length + 1);
  assert.match(report.skipped[0], /Row 3: product code T001 already exists in Tech Set 1/);
  assert.deepEqual(report.products[0], seedProducts[0]);
  assert.deepEqual(seedProducts, before);
  assert.throws(() => importCsv("name,code,category,store,url\nDuplicate,t001,Tech,Amazon,https://example.com", seedProducts), /already exists in Tech Set 1/);
  const home = seedProducts.find(product => product.category === "Home & Kitchen");
  assert.throws(() => importCsv(exportCsv([{ ...home, category: "Home" }]), seedProducts), /already exists in Home & Kitchen Set 1/);
});

test("a bad CSV row rejects the entire import without mutating the catalog", () => {
  const before = structuredClone(seedProducts);
  const text = exportCsv([{ ...seedProducts[0], name: "Do not save this", set: 2 }, { ...seedProducts[1], set: 2, url: "javascript:alert(1)" }]);
  assert.throws(() => importCsv(text, seedProducts), /Row 3.*URL/);
  assert.deepEqual(seedProducts, before);
});

test("duplicate codes are rejected case-insensitively", () => {
  const duplicate = { ...seedProducts[1], code: "t001" };
  assert.match(validateProduct(duplicate, seedProducts), /already in use/);
  const report = prepareCsvImport(exportCsv([seedProducts[0], duplicate]), []);
  assert.equal(report.products.length, 1);
  assert.equal(report.skipped.length, 1);
});

test("invalid categories, statuses, sets, ASINs, and image sources are rejected", () => {
  for (const change of [{ category: "Unknown" }, { status: "Public" }, { set: 0 }, { asin: "bad" }, { image: "javascript:alert(1)" }]) {
    assert.ok(validateProduct({ ...seedProducts[0], ...change }, seedProducts));
  }
  assert.equal(validateProduct(seedProducts[0], seedProducts), "");
});

test("sets grow automatically by category and sort numerically without a four-set limit", () => {
  const products = [1, 12, 5, 12].map((set, index) => ({ ...seedProducts[0], id: `set-${index}`, set }));
  products.push({ ...seedProducts[10], set: 8 });
  assert.deepEqual(productSets(products, "Tech"), [1, 5, 12]);
  assert.deepEqual(productSets(products, "Home & Kitchen"), [8]);
  assert.deepEqual(productSets(products, "Tech", 25), [1, 5, 12, 25]);
  assert.equal(validateProduct({ ...seedProducts[0], set: 123 }, seedProducts), "");
  for (const set of [0, -1, 1.5, NaN, Infinity]) assert.ok(validateProduct({ ...seedProducts[0], set }, seedProducts));
  const csv = exportCsv([{ ...seedProducts[0], set: 42 }]);
  assert.equal(importCsv(csv, [])[0].set, 42);
  assert.ok(!parseCsv(csv)[0].includes("photo"));
});

test("CSV rejects missing headers, malformed quotes, and uneven columns", () => {
  assert.throws(() => importCsv("name,code\nItem,T100", []), /Missing CSV column/);
  assert.throws(() => parseCsv('name,code\n"unfinished,T100'), /closing quote/);
  assert.throws(() => importCsv("name,code,category,store,url\nItem,T100,Tech", []), /column count/);
});

test("export neutralizes spreadsheet formulas and links allow only HTTP(S)", () => {
  const csv = exportCsv([{ ...seedProducts[0], name: '=HYPERLINK("https://example.com")' }]);
  assert.ok(parseCsv(csv)[1][0].startsWith("'="));
  assert.equal(validUrl("https://example.com/product?a=1"), true);
  assert.equal(validUrl("javascript:alert(1)"), false);
  assert.equal(validUrl("data:text/html,test"), false);
});

test("uploaded images and publication status survive CSV export and import", () => {
  const product = { ...seedProducts[0], image: "data:image/png;base64,iVBORw0KGgo=", photo: null, status: "Archived" };
  const [result] = importCsv(exportCsv([product]), []);
  assert.equal(result.image, product.image);
  assert.equal(result.photo, null);
  assert.equal(result.status, "Archived");
});

test("CSV without image columns preserves existing uploaded and reference images", () => {
  const existing = [{ ...seedProducts[0], image: "data:image/png;base64,iVBORw0KGgo=", photo: null }, seedProducts[1]];
  const csv = "name,code,category,store,url,set\nEdited,T001,Tech,Amazon,https://example.com/1,2\nWatch,T002,Tech,Amazon,https://example.com/2,2";
  const result = importCsv(csv, existing);
  assert.equal(result[0].image, existing[0].image);
  assert.equal(result[1].photo, existing[1].photo);
  assert.equal(result[0].status, "Published");
});

test("image_url columns import HTTP images and reject unsafe sources", () => {
  const csv = "name,code,category,store,url,image_url\nItem,T100,Tech,Amazon,https://example.com/product,https://example.com/image.png";
  assert.equal(importCsv(csv, [])[0].image, "https://example.com/image.png");
  assert.throws(() => importCsv(csv.replace("https://example.com/image.png", "data:text/html;evil"), []), /image/);
});

test("large embedded image data survives export/import without truncation", () => {
  const image = "data:image/jpeg;base64," + Buffer.alloc(300_000, 123).toString("base64");
  const product = { ...seedProducts[0], image, photo: null };
  assert.equal(importCsv(exportCsv([product]), [])[0].image, image);
});

test("server validation rejects malformed products and invalid photo metadata", () => {
  for (const product of [null, {}, { ...seedProducts[0], name: 42 }, { ...seedProducts[0], updated: "invalid" }, { ...seedProducts[0], photo: 9 }]) assert.ok(validateProduct(product, []));
});

test("the requested eleven categories are distinct and legacy names migrate", () => {
  assert.equal(CATEGORIES.length, 11);
  assert.ok(CATEGORIES.includes("Tech"));
  assert.ok(CATEGORIES.includes("Electronics & Tech"));
  assert.equal(normalizeLegacyCategory("Home"), "Home & Kitchen");
  assert.equal(normalizeLegacyCategory("Car"), "Automotive");
  assert.equal(normalizeLegacyCategory("Beauty"), "Beauty & Personal Care");
  assert.equal(normalizeLegacyCategory("Cute Finds"), "Toys & Games");
  assert.ok(seedProducts.every(product => CATEGORIES.includes(product.category)));
});

test("category validation rejects empty, duplicate and untrimmed names", () => {
  for (const value of [[], [""], ["Tech", "tech"], [" Tech"], ["a".repeat(81)], null]) assert.ok(validateCategories(value));
  assert.equal(validateCategories([...CATEGORIES, "Books & Stationery"]), "");
});

test("custom categories survive import and export and removed categories are rejected", () => {
  const categories = [...CATEGORIES, "Books & Stationery"];
  const product = { ...seedProducts[0], category: "Books & Stationery" };
  assert.equal(validateProduct(product, [], categories), "");
  assert.ok(validateProduct(product, [], CATEGORIES));
  assert.equal(importCsv(exportCsv([product]), [], categories)[0].category, "Books & Stationery");
  const legacy = exportCsv([{ ...seedProducts[0], category: "Home" }]);
  assert.equal(importCsv(legacy, [])[0].category, "Home & Kitchen");
});


test("import results sort by numeric set then natural product code without mutating input", () => {
  const products = [[10, "T1"], [2, "T10"], [1, "T20"], [2, "T2"]].map(([set, code]) => ({ ...seedProducts[0], set, code }));
  const report = prepareCsvImport(exportCsv(products), []);
  const before = structuredClone(report.products);
  assert.deepEqual(sortProductsBySetCode(report.products).map(({set, code}) => [set, code]), [[1, "T20"], [2, "T2"], [2, "T10"], [10, "T1"]]);
  assert.deepEqual(report.products, before);
});


test("storefront keeps image bytes out of page data without altering administrator data", () => {
  const product = { ...seedProducts[0], image: "data:image/png;base64,aGVsbG8=", id: "image / product" };
  const draft = { ...product, id: "private", status: "Draft" };
  const result = storefrontProducts([product, draft], "revision-1");
  assert.equal(result.length, 1);
  assert.equal(result[0].image, "/api/products/image%20%2F%20product/image?v=revision-1");
  assert.equal(product.image, "data:image/png;base64,aGVsbG8=");
  assert.notEqual(storefrontProducts([product], "revision-2")[0].image, result[0].image);
  assert.deepEqual(storefrontProducts(result, "revision-1"), result);
});
