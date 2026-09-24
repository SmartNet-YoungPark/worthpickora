import "server-only";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { torontoDate } from "./click-analytics";
export type AppClick = { click_date: string; link_id: string; clicks: number };
type State = { offer: string; rows: AppClick[]; banner?: string };
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.env.CATALOG_DATA_FILE ? process.env.CATALOG_DATA_FILE + ".store-apps.json" : resolve(".data/store-apps.json");
const globalState = globalThis as typeof globalThis & { storeAppsQueue?: Promise<unknown> };
async function database(path: string, method = "GET", body?: object) {
  const headers: Record<string, string> = { apikey: key!, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" };
  if (!key!.startsWith("sb_secret_")) headers.Authorization = "Bearer " + key;
  const response = await fetch(new URL("/rest/v1/" + path, url), { method, headers, body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Store app settings/analytics unavailable. Apply 20260924010000_store_apps.sql in Supabase and check the server connection.");
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
async function local(): Promise<State> {
  if (process.env.VERCEL) throw new Error("Configure Supabase to save store app settings and analytics.");
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { offer: "", rows: [] }; throw error; }
}
async function updateLocal(change: (state: State) => void) {
  const operation = (globalState.storeAppsQueue || Promise.resolve()).then(async () => {
    const state = await local(); change(state);
    await mkdir(dirname(file), { recursive: true });
    const temporary = file + "." + randomUUID() + ".tmp";
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 }); await rename(temporary, file);
  });
  globalState.storeAppsQueue = operation.catch(() => {});
  await operation;
}
export async function readStoreOffer(): Promise<string> {
  if (url && key) return (await database("store_app_settings?id=eq.1&select=temu_offer_url"))[0]?.temu_offer_url || "";
  return (await local()).offer;
}
export async function readSiteBanner(): Promise<string> {
  if(url&&key)return (await database("site_banner?id=eq.1&select=message"))[0]?.message || "";
  return (await local()).banner || "";
}
export async function saveSiteBanner(message:string) {
  if(url&&key){await database("site_banner","POST",{id:1,message});return;}
  await updateLocal(state=>{state.banner=message;});
}
export async function saveStoreOffer(offer: string) {
  if (url && key) { await database("store_app_settings", "POST", { id: 1, temu_offer_url: offer }); return; }
  await updateLocal(state => { state.offer = offer; });
}
export async function recordAppClick(id: string) {
  if (url && key) { await database("rpc/store_app_click", "POST", { p_link_id: id }); return; }
  await updateLocal(state => {
    const date = torontoDate(), row = state.rows.find(row => row.click_date === date && row.link_id === id);
    if (row) row.clicks++; else state.rows.push({ click_date: date, link_id: id, clicks: 1 });
  });
}
export async function appClickReport(): Promise<AppClick[]> {
  // 30 calendar days in the same timezone as product analytics; at most 240 rows.
  const end = torontoDate(), start = new Date(Date.parse(end) - 29 * 86400000).toISOString().slice(0, 10);
  if (url && key) return database(`store_app_clicks?click_date=gte.${start}&click_date=lte.${end}&order=click_date.desc,link_id.asc`);
  return (await local()).rows.filter(row => row.click_date >= start && row.click_date <= end).sort((a, b) => b.click_date.localeCompare(a.click_date));
}
