import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomInt } from "node:crypto";
import { mkdtemp, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { setTimeout as pause } from "node:timers/promises";
import { createSession, hashPassword, SESSION_COOKIE, SESSION_SECONDS } from "../lib/admin-security.ts";

// Uses an isolated production server and ephemeral credentials, never .env.local.
const port = 3187;
const origin = `http://localhost:${port}`;
const password = String(randomInt(10000)).padStart(4, "0");
const passwordHash = await hashPassword(password);
const secret = randomBytes(48).toString("hex");
const testDirectory = await mkdtemp(join(tmpdir(), "worthpickora-http-"));
const catalogFile = join(testDirectory, "catalog.json");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  env: { ...process.env, NODE_ENV: "production", ADMIN_PASSWORD_HASH: passwordHash, ADMIN_SESSION_SECRET: secret, CATALOG_DATA_FILE: catalogFile }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
});
let startupError;
child.on("error", error => { startupError = error; });
child.stdout.resume(); child.stderr.resume();
const request = (path, options = {}) => fetch(origin + path, { redirect: "manual", ...options });
const post = (path, passwordValue, source = origin) => request(path, { method: "POST", headers: { Origin: source }, body: new URLSearchParams({ password: passwordValue }) });

try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (startupError) throw startupError;
    if (child.exitCode !== null) throw new Error("Isolated test server could not start.");
    try { if ((await request("/admin/login")).ok) { ready = true; break; } } catch { /* Wait for startup. */ }
    await pause(100);
  }
  assert.ok(ready, "test server starts");
  const denied = await request("/admin/products");
  assert.equal(denied.status, 307); assert.ok(denied.headers.get("location").endsWith("/admin/login"));
  assert.equal((await request("/api/admin/session")).status, 401);
  const publicHome = await (await request("/")).text();
  assert.ok(publicHome.includes("Admin Login")); assert.ok(!publicHome.includes("Manage products"));
  assert.equal((await post("/api/admin/login", password, "https://other.example")).status, 403);
  const wrong = await post("/api/admin/login", "wrong-password");
  assert.ok(wrong.headers.get("location").includes("error=invalid")); assert.equal(wrong.headers.get("set-cookie"), null);
  for (const invalid of [password.slice(1), password + "0", "12ab"]) {
    const rejected = await post("/api/admin/login", invalid);
    assert.ok(rejected.headers.get("location").includes("error=invalid"));
    assert.equal(rejected.headers.get("set-cookie"), null);
  }
  const login = await post("/api/admin/login", password);
  assert.equal(login.status, 303); assert.ok(login.headers.get("location").endsWith("/admin/products"));
  const setCookie = login.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /Secure/i); assert.match(setCookie, /SameSite=strict/i);
  const cookie = setCookie.split(";")[0];
  const authed = { headers: { Cookie: cookie } };
  assert.equal((await request("/api/admin/session", authed)).status, 200);
  const admin = await request("/admin/products", authed);
  assert.equal(admin.status, 200); assert.ok((await admin.text()).includes("Landing Page"));
  const home = await (await request("/", authed)).text();
  assert.ok(home.includes("Admin Page")); assert.ok(home.includes("Manage products"));
  assert.equal((await request("/api/catalog?scope=admin")).status, 401);
  const initialCatalog = await (await request("/api/catalog?scope=admin", authed)).json();
  const updatedProducts = structuredClone(initialCatalog.products);
  updatedProducts[0] = { ...updatedProducts[0], name: "Save Regression Updated Earbuds", set: 27, image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=", photo: null };
  updatedProducts[1] = { ...updatedProducts[1], name: "Private Draft Must Not Leak", status: "Draft", set: 99, image: updatedProducts[0].image };
  updatedProducts[2].set = 2;
  updatedProducts[3].set = 3;
  const putOptions = { method: "PUT", headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ products: updatedProducts, revision: initialCatalog.revision }) };
  assert.equal((await request("/api/catalog", { ...putOptions, headers: { Origin: origin, "Content-Type": "application/json" } })).status, 401);
  assert.equal((await request("/api/catalog", { ...putOptions, headers: { ...putOptions.headers, Origin: "https://other.example" } })).status, 403);
  const savedResponse = await request("/api/catalog", putOptions);
  assert.equal(savedResponse.status, 200);
  const savedCatalog = await savedResponse.json();
  assert.notEqual(savedCatalog.revision, initialCatalog.revision);
  const publicResponse = await request("/api/catalog");
  assert.match(publicResponse.headers.get("cache-control"), /no-store/);
  const publicProducts = (await publicResponse.json()).products;
  const publicImageUrl = publicProducts.find(product => product.id === updatedProducts[0].id).image;
  assert.ok(publicImageUrl.startsWith("/api/products/"));
  assert.ok(!JSON.stringify(publicProducts).includes("data:image/"));
  const imageResponse = await request(publicImageUrl);
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), Buffer.from(updatedProducts[0].image.split(",")[1], "base64"));
  assert.equal((await request(`/api/products/${encodeURIComponent(updatedProducts[1].id)}/image`)).status, 404);
  assert.equal((await request("/api/products/missing-product/image")).status, 404);
  assert.ok(!publicProducts.some(product => product.id === updatedProducts[1].id));
  const refreshedLanding = await (await request("/")).text();
  assert.ok(refreshedLanding.includes("Save Regression Updated Earbuds"));
  assert.match(refreshedLanding, /Set (?:<!-- -->)?27/);
  // Verify actual row headings, not just tabs or serialized React data.
  const techSection = refreshedLanding.match(/<section[^>]*aria-label="Tech product sets"[^>]*>([\s\S]*?)<\/section>/)?.[1].replace(/<!--[\s\S]*?-->/g, "");
  assert.ok(techSection);
  const setRows = [...techSection.matchAll(/<h3>Tech Set (\d+)<\/h3>/g)].map(match => Number(match[1]));
  assert.deepEqual(setRows, [1, 2, 3, 27], "all populated sets have rows without needing View All Sets");
  assert.ok(!techSection.includes("Set 99"), "draft-only sets remain private");
  assert.ok(!refreshedLanding.includes("Private Draft Must Not Leak"));
  assert.ok(refreshedLanding.includes(publicImageUrl));
  assert.ok(!refreshedLanding.includes(updatedProducts[0].image));
  assert.equal((await request("/api/catalog", putOptions)).status, 409);
  const badProduct = { ...updatedProducts[0], image: "javascript:alert(1)" };
  assert.equal((await request("/api/catalog", { ...putOptions, body: JSON.stringify({ products: [badProduct], revision: savedCatalog.revision }) })).status, 400);
  assert.equal(savedCatalog.categories.length, 11);
  const categoryWrite = (products, categories, revision) => request("/api/catalog", { ...putOptions, body: JSON.stringify({ products, categories, revision }) });
  const addedResponse = await categoryWrite(savedCatalog.products, [...savedCatalog.categories, "Books & Stationery"], savedCatalog.revision);
  assert.equal(addedResponse.status, 200);
  const added = await addedResponse.json();
  assert.ok((await (await request("/api/catalog")).json()).categories.includes("Books & Stationery"));
  const renamedCategories = added.categories.map(name => name === "Tech" ? "Everyday Tech" : name);
  const renamedProducts = added.products.map(product => product.category === "Tech" ? { ...product, category: "Everyday Tech" } : product);
  const renamedResponse = await categoryWrite(renamedProducts, renamedCategories, added.revision);
  assert.equal(renamedResponse.status, 200);
  const renamed = await renamedResponse.json();
  const renamedHtml = await (await request("/")).text();
  assert.ok(renamedHtml.includes("Everyday Tech"));
  assert.equal(renamed.products[0].set, 27);
  assert.equal(renamed.products[0].image, savedCatalog.products[0].image);
  const deletedCategories = renamed.categories.filter(name => name !== "Everyday Tech");
  assert.equal((await categoryWrite(renamed.products, deletedCategories, renamed.revision)).status, 400, "cannot leave products in a deleted category");
  const movedProducts = renamed.products.map(product => product.category === "Everyday Tech" ? { ...product, category: "Electronics & Tech" } : product);
  const deletedResponse = await categoryWrite(movedProducts, deletedCategories, renamed.revision);
  assert.equal(deletedResponse.status, 200);
  const deleted = await deletedResponse.json();
  assert.equal(deleted.products.length, savedCatalog.products.length);
  assert.ok(!deleted.categories.includes("Everyday Tech"));
  assert.equal(deleted.products[0].category, "Electronics & Tech");
  assert.equal((await categoryWrite(deleted.products, [...deleted.categories, "tech", "TECH"], deleted.revision)).status, 400);
  assert.equal((await request("/admin/products", { headers: { Cookie: `${SESSION_COOKIE}=forged` } })).status, 307);
  const expired = createSession(secret, passwordHash, Date.now() - SESSION_SECONDS * 1000 - 1000);
  assert.equal((await request("/api/admin/session", { headers: { Cookie: `${SESSION_COOKIE}=${expired}` } })).status, 401);
  assert.equal((await request("/api/admin/logout")).status, 405);
  assert.equal((await post("/api/admin/logout", "", "https://other.example")).status, 403);
  const logout = await request("/api/admin/logout", { method: "POST", headers: { Origin: origin, Cookie: cookie } });
  assert.equal(logout.status, 303); assert.match(logout.headers.get("set-cookie"), /Max-Age=0/i);
  assert.equal((await request("/admin/products")).status, 307);
  console.log("PASS: authentication; saved product name/image immediately visible on public landing page; draft privacy; write authorization; stale-write protection; invalid image rejection; logout.");
} finally {
  const stopped = child.exitCode === null ? once(child, "close") : Promise.resolve();
  child.kill(); await stopped;
  await unlink(catalogFile).catch(() => {}); await rmdir(testDirectory);
}
