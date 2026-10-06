import {validAmazonFullLink,validAmazonShortLink} from "./product-affiliate.ts";
export const CATEGORIES: readonly string[] = ["Tech", "Home & Kitchen", "Electronics & Tech", "Beauty & Personal Care", "Health & Household", "Clothing, Shoes & Jewelry", "Sports & Outdoors", "Toys & Games", "Pet Supplies", "Automotive", "Tools & Home Improvement"];
export const STORES = ["Amazon", "Walmart", "Best Buy", "Temu", "Target", "Etsy"] as const;
export const STATUSES = ["Published", "Draft", "Needs Review", "Archived"] as const;
export type Category = string;
export function normalizeLegacyCategory(name: string): string {
  const aliases: Record<string, string> = { Home: "Home & Kitchen", Car: "Automotive", Beauty: "Beauty & Personal Care", "Cute Finds": "Toys & Games" };
  return aliases[name] || name;
}
export function validateCategories(value: unknown): string {
  if (!Array.isArray(value) || !value.length || value.length > 200) return "Keep between 1 and 200 categories.";
  if (value.some(name => typeof name !== "string" || !name.trim() || name !== name.trim() || name.length > 80)) return "Category names must contain 1–80 characters, without leading or trailing spaces.";
  if (new Set(value.map(name => name.toLowerCase())).size !== value.length) return "Category names must be unique.";
  return "";
}
export type ProductStatus = typeof STATUSES[number];
export type Product = {
  id: string;
  name: string;
  code: string;
  description: string;
  category: Category;
  set: number;
  store: string;
  brand: string;
  asin: string;
  url: string;
  urlUS?: string;
  urlCA?: string;
  urlShortUS?: string;
  urlShortCA?: string;
  image: string;
  photo: number | null;
  status: ProductStatus;
  updated: string;
};
export type CatalogSnapshot = { products: Product[]; categories: string[]; revision: string; persisted: boolean };

export function adminImageUrl(id: string, revision: string) {
  return `/api/products/${encodeURIComponent(id)}/image?scope=admin&v=${encodeURIComponent(revision)}`;
}
export function adminCatalogSnapshot(catalog: CatalogSnapshot): CatalogSnapshot {
  return { ...catalog, products: catalog.products.map(product => ({ ...product,
    image: product.image.startsWith("data:image/") || product.image.startsWith(`/api/products/${encodeURIComponent(product.id)}/image?scope=admin&v=`) ? adminImageUrl(product.id, catalog.revision) : product.image,
  })) };
}

export function storefrontProducts(products: Product[], revision: string): Product[] {
  return products.filter(product => product.status === "Published").map(product => ({
    ...product,
    image: product.image.startsWith("data:image/") || product.image.startsWith(`/api/products/${encodeURIComponent(product.id)}/image?scope=admin&v=`)
      ? `/api/products/${encodeURIComponent(product.id)}/image?v=${encodeURIComponent(revision)}`
      : product.image,
  }));
}

export function compareSetCode(a: Product, b: Product): number {
  return a.set - b.set || a.code.localeCompare(b.code, "en", { numeric: true, sensitivity: "base" });
}

export function sortProductsBySetCode(products: Product[]): Product[] {
  return [...products].sort(compareSetCode);
}

export function validateSetCapacity(products: Product[]): string {
  const counts = new Map<string, number>();
  for (const product of products) {
    const key = JSON.stringify([product.category, product.set]);
    const count = (counts.get(key) || 0) + 1;
    if (count > 10) return `${product.category} Set ${product.set}: a set can contain at most 10 products. Move products to another set before saving or importing.`;
    counts.set(key, count);
  }
  return "";
}

export function productSets(products: Product[], category?: string, selected?: number): number[] {
  const sets = products.filter(product => !category || product.category === category).map(product => product.set);
  if (selected !== undefined) sets.push(selected);
  const values = [...new Set(sets.filter(value => Number.isSafeInteger(value) && value > 0))].sort((a, b) => a - b);
  return values.length ? values : [1];
}

const names: Record<Category, string[]> = {
  Tech: ["Wireless Earbuds", "Smart Watch", "Laptop Stand", "Bluetooth Speaker", "USB-C Hub", "Noise-Cancelling Earbuds", "Fitness Smart Watch", "Foldable Laptop Stand", "Portable Speaker", "Multiport USB-C Adapter"],
  Home: ["Ceramic Table Lamp", "Linen Cushion", "Minimal Desk Organizer", "Essential Oil Diffuser", "Everyday Ceramic Mug"],
  Car: ["Magnetic Phone Mount", "Car Seat Organizer", "Portable Car Vacuum", "Car Air Freshener", "USB Car Charger"],
  Beauty: ["Daily Face Roller", "Travel Makeup Bag", "LED Vanity Mirror", "Skincare Organizer", "Soft Makeup Brushes"],
  "Cute Finds": ["Mini Mushroom Lamp", "Little Cat Planter", "Cloud Night Light", "Cozy Bear Keychain", "Smiley Ceramic Mug"],
};
export function retailerSearch(store: string, name: string) {
  const roots: Record<string, string> = { Amazon: "https://www.amazon.com/s?k=", Walmart: "https://www.walmart.com/search?q=", "Best Buy": "https://www.bestbuy.com/site/searchpage.jsp?st=", Temu: "https://www.temu.com/search_result.html?search_key=", Target: "https://www.target.com/s?searchTerm=", Etsy: "https://www.etsy.com/search?q=" };
  return (roots[store] || roots.Amazon) + encodeURIComponent(name);
}
export const seedProducts: Product[] = Object.keys(names).flatMap(category => names[category].map((name, index) => ({
  id: `${category}-${index}`, name, code: `${category === "Cute Finds" ? "F" : category[0]}${String(index + 1).padStart(3, "0")}`,
  description: category === "Tech" ? ["Small size. Beautiful sound.", "Your everyday fitness companion.", "Adjustable aluminum design.", "Big sound, wherever you go.", "Everything connected."][index % 5] : "A thoughtful find for your everyday.",
  category: normalizeLegacyCategory(category), set: 1, store: "Amazon", brand: "", asin: "", url: retailerSearch("Amazon", name), image: "",
  photo: category === "Tech" ? index % 5 : null,
  status: "Published", updated: "2026-09-16T12:00:00.000Z",
})));

export function validUrl(value: string) {
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}
export function validateProduct(product: Product, existing: Product[], categories: readonly string[] = CATEGORIES) {
  if (!product || ["id", "name", "code", "description", "category", "store", "brand", "asin", "url", "image", "status", "updated"].some(field => typeof product[field as keyof Product] !== "string")) return "The product contains missing or invalid fields.";
  if (!product.id || !Number.isFinite(Date.parse(product.updated))) return "The product ID or updated date is invalid.";
  if (!product.name.trim()) return "Enter a product name.";
  if (!/^[a-z0-9_-]{2,24}$/i.test(product.code)) return "Use 2–24 letters, numbers, hyphens, or underscores for the code.";
  if (existing.some(item => item.id !== product.id && item.code.toLowerCase() === product.code.toLowerCase())) return "This product code is already in use.";
  for(const field of ["urlUS","urlCA","urlShortUS","urlShortCA"] as const)if(product[field]!==undefined&&typeof product[field]!=="string")return "Invalid regional affiliate link.";
  if(product.urlUS||product.urlCA||product.urlShortUS||product.urlShortCA){
    if(product.store!=="Amazon")return "Regional Amazon links require the Amazon store.";
    if((product.urlUS&&!validAmazonFullLink(product.urlUS,"US"))||(product.urlCA&&!validAmazonFullLink(product.urlCA,"CA")))return "Use the matching Amazon.com or Amazon.ca product URL in each full-link field.";
    if((product.urlShortUS&&!validAmazonShortLink(product.urlShortUS))||(product.urlShortCA&&!validAmazonShortLink(product.urlShortCA)))return "Short links must be complete https://amzn.to/... or https://a.co/... URLs.";
    if(!(product.urlUS||product.urlShortUS)||!(product.urlCA||product.urlShortCA))return "Enter at least one full or short link for each country.";
  }
  if (!validUrl(product.url)) return "Enter a complete http:// or https:// affiliate URL.";
  if (!categories.includes(product.category)) return "Choose a valid category from the current category list.";
  if (!STORES.includes(product.store as typeof STORES[number])) return "Choose a valid store.";
  if (!STATUSES.includes(product.status)) return "Choose a valid status.";
  if (!Number.isSafeInteger(product.set) || product.set < 1) return "Use a positive whole number for the product set.";
  if (product.asin && !/^[a-z0-9]{10}$/i.test(product.asin)) return "An ASIN must contain exactly 10 letters or numbers.";
  if (product.photo !== null && ![0, 1, 2, 3, 4].includes(product.photo)) return "The product photo is invalid.";
  if (product.image.length > 8 * 1024 * 1024) return "The product image is too large.";
  if (product.image && !/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(product.image) && !validUrl(product.image) && !product.image.startsWith(`/api/products/${encodeURIComponent(product.id)}/image?scope=admin&v=`)) return "Use JPG, PNG, WebP image data or an http(s) image URL.";
  return "";
}

const CSV_FIELDS = ["name", "code", "description", "category", "set", "store", "brand", "asin", "url", "urlUS", "urlCA", "urlShortUS", "urlShortCA", "status", "image"] as const;
// Quoted fields can contain commas, newlines, and escaped quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || field.length === 0) quoted = !quoted;
      else throw new Error("Invalid quote in CSV field.");
    } else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("A quoted CSV field is missing its closing quote.");
  row.push(field); if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function exportCsv(products: Product[]) {
  const escape = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return "\uFEFF" + [CSV_FIELDS.join(","), ...products.map(product => CSV_FIELDS.map(field => escape(product[field])).join(","))].join("\r\n");
}
export function importCsv(text: string, existing: Product[], categories: readonly string[] = CATEGORIES): Product[] {
  return prepareCsvImport(text, existing, categories).products;
}
export function prepareCsvImport(text: string, existing: Product[], categories: readonly string[] = CATEGORIES) {
  const [header, ...rows] = parseCsv(text);
  if (!header || !rows.length) throw new Error("The CSV must contain a header and at least one product.");
  const fields = header.map(field => field.trim().toLowerCase() === "image_url" ? "image" : field.trim().toLowerCase());
  if (new Set(fields).size !== fields.length) throw new Error("The CSV contains duplicate column names.");
  for (const required of ["name", "code", "category", "store", "url"]) if (!fields.includes(required)) throw new Error(`Missing CSV column: ${required}. Export products to get a template.`);
  const result = [...existing];
  const seen = new Set<string>();
  const skipped: string[] = [];
  let imported = 0;
  rows.forEach((row, index) => {
    if (row.length !== header.length) throw new Error(`Row ${index + 2}: the column count does not match the header.`);
    const data = Object.fromEntries(fields.map((field, i) => [field, row[i].trim()]));
    const code = data.code.toUpperCase();
    const category = categories.includes(data.category) ? data.category : normalizeLegacyCategory(data.category);
    const set = Number(data.set || 1);
    const previous = result.find(product => product.code.toUpperCase() === code);
    if (previous && previous.category === category && previous.set === set) {
      skipped.push(`Row ${index + 2}: product code ${code} already exists in ${category} Set ${set}.`);
      return;
    }
    if (seen.has(code)) throw new Error(`Row ${index + 2}: duplicate product code ${code} in different sets.`);
    seen.add(code);
    const product: Product = {
      id: previous?.id || crypto.randomUUID(), name: data.name, code, description: data.description || "",
      category, store: data.store, set, brand: data.brand || "", asin: data.asin || "",
      urlShortUS: fields.includes("urlshortus") ? data.urlshortus : previous?.urlShortUS, urlShortCA: fields.includes("urlshortca") ? data.urlshortca : previous?.urlShortCA, url: data.url, urlUS: fields.includes("urlus") ? data.urlus : previous?.urlUS, urlCA: fields.includes("urlca") ? data.urlca : previous?.urlCA, image: fields.includes("image") ? data.image : previous?.image || "",
      photo: fields.includes("photo") ? data.photo && /^[0-4]$/.test(data.photo) ? Number(data.photo) : null : data.image ? null : previous?.photo ?? null,
      status: (data.status || previous?.status || "Draft") as ProductStatus, updated: new Date().toISOString(),
    };
    const error = validateProduct(product, result, categories);
    if (error) throw new Error(`Row ${index + 2}: ${error}`);
    const position = result.findIndex(item => item.id === product.id);
    if (position < 0) result.push(product); else result[position] = product;
    imported++;
  });
  if (!imported) throw new Error(`All ${skipped.length} products already exist in the same sets. Nothing was imported. ${skipped[0] || ""}`);
  const capacityError = validateSetCapacity(result);
  if (capacityError) throw new Error(capacityError);
  return { products: result, skipped, imported };
}
