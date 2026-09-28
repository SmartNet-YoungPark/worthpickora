import "server-only";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { torontoDate } from "./click-analytics";
import {legacyStoreLinks,validateStoreLinks,type StoreLink} from "./store-apps";
export type AppClick = { click_date: string; link_id: string; clicks: number; store_name?:string; link_title?:string };
type AmazonProduct = Pick<StoreLink,"id"|"title"|"description"|"url"|"image">;
type AmazonPromotion = {productId:string;offerType:StoreLink["offerType"];promoCode?:string;saleInfo?:string};
type State = { offer: string; rows: AppClick[]; banner?: string; links?:StoreLink[]; amazonProducts?:AmazonProduct[]; amazonPromotions?:AmazonPromotion[] };
function splitAmazon(state:State,links:StoreLink[]){
  state.links=links.filter(link=>link.store!=="Amazon");
  state.amazonProducts=links.filter(link=>link.store==="Amazon").map(({id,title,description,url,image})=>({id,title,description,url,image}));
  state.amazonPromotions=links.filter(link=>link.store==="Amazon").map(({id,offerType,promoCode,saleInfo})=>({productId:id,offerType:offerType||"general",promoCode,saleInfo}));
}
function combinedLinks(state:State):StoreLink[]{
  return [...(state.links??legacyStoreLinks(state.offer)),...(state.amazonProducts||[]).map(product=>{const promotion=state.amazonPromotions?.find(row=>row.productId===product.id);return {...product,store:"Amazon",offerType:promotion?.offerType||"general",promoCode:promotion?.promoCode,saleInfo:promotion?.saleInfo};})];
}
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.env.CATALOG_DATA_FILE ? process.env.CATALOG_DATA_FILE + ".store-apps.json" : resolve(".data/store-apps.json");
const globalState = globalThis as typeof globalThis & { storeAppsQueue?: Promise<unknown> };
async function database(path: string, method = "GET", body?: object) {
  const headers: Record<string, string> = { apikey: key!, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" };
  if (!key!.startsWith("sb_secret_")) headers.Authorization = "Bearer " + key;
  const response = await fetch(new URL("/rest/v1/" + path, url), { method, headers, body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Store app settings/analytics unavailable. Apply the store-app and 20260927010000_amazon_promotions.sql migrations in Supabase and check the server connection.");
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
export async function readStoreLinks():Promise<StoreLink[]>{
  let links:unknown,offer:string;
  if(url&&key){
    const [settings,snapshot]=await Promise.all([database("store_app_settings?id=eq.1&select=links,temu_offer_url"),database("rpc/promotion_links_snapshot","POST",{})]);
    offer=settings[0]?.temu_offer_url||"";
    links=settings[0]?.links==null?[...legacyStoreLinks(offer),...snapshot]:snapshot;
  } else { const settings=await local();links=combinedLinks(settings);offer=settings.offer; }
  if(links==null)return legacyStoreLinks(offer);
  if(!validateStoreLinks(links))throw new Error("Invalid store links configuration.");
  return links;
}
export async function saveStoreLinks(links:StoreLink[]){
  if(!validateStoreLinks(links))throw new Error("Invalid store links.");
  if(url&&key){
    try{await database("rpc/promotion_links_save","POST",{p_links:links});}
    catch{throw new Error("Could not save links. Apply 20260927010000_amazon_promotions.sql in Supabase and check the connection.");}
    return;
  }
  await updateLocal(state=>{splitAmazon(state,links);state.offer=links.find(link=>link.id==="temu-offer")?.url||"";});
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
export async function recordAppClick(id: string,link?:StoreLink) {
  if (url && key) { await database(link?"rpc/store_link_click":"rpc/store_app_click", "POST", link?{p_link_id:id,p_store:link.store,p_title:link.title}:{ p_link_id: id }); return; }
  await updateLocal(state => {
    const date = torontoDate(), row = state.rows.find(row => row.click_date === date && row.link_id === id);
    if (row) {row.clicks++;if(link){row.store_name=link.store;row.link_title=link.title;}} else state.rows.push({ click_date: date, link_id: id, clicks: 1,...(link?{store_name:link.store,link_title:link.title}:{}) });
  });
}
export async function appClickReport(): Promise<AppClick[]> {
  // Page through all daily rows, including multiple links for each store.
  const end = torontoDate(), start = new Date(Date.parse(end) - 29 * 86400000).toISOString().slice(0, 10);
  if (url && key) {const rows:AppClick[]=[];for(let offset=0;;offset+=1000){const page:AppClick[]=await database(`store_app_clicks?click_date=gte.${start}&click_date=lte.${end}&order=click_date.desc,link_id.asc&limit=1000&offset=${offset}`);rows.push(...page);if(page.length<1000)return rows;}}
  return (await local()).rows.filter(row => row.click_date >= start && row.click_date <= end).sort((a, b) => b.click_date.localeCompare(a.click_date));
}
