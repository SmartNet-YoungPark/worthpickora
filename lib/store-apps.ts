export const STORE_APPS = [
  { id: "amazon-ios", store: "Amazon", label: "iPhone / iPad", url: "https://apps.apple.com/us/app/amazon-shopping/id297606951" },
  { id: "amazon-android", store: "Amazon", label: "Android", url: "https://play.google.com/store/apps/details?id=com.amazon.mShop.android.shopping" },
  { id: "walmart", store: "Walmart", label: "Official app guide", url: "https://www.walmart.com/cp/walmart-app/1087865" },
  { id: "best-buy", store: "Best Buy", label: "Official app guide", url: "https://www.bestbuy.com/discover-learn/benefits-of-the-best-buy-app/pcmcat1674162066016" },
  { id: "temu", store: "Temu", label: "Official app guide", url: "https://www.temu.com/app.html" },
  { id: "target", store: "Target", label: "Official app guide", url: "https://www.target.com/c/target-app/-/N-4th2r" },
  { id: "etsy", store: "Etsy", label: "Official app guide", url: "https://www.etsy.com/mobile" },
] as const;
export type StoreLink = {id:string;store:string;title:string;description:string;url:string;offerType?:"general"|"promo-code"|"clip-coupon";promoCode?:string};
export function validStoreLinkUrl(value:string){
  try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&!url.port&&!!url.hostname;}catch{return false;}
}
export function validateStoreLinks(value:unknown):value is StoreLink[]{
  if(!Array.isArray(value)||value.length>50)return false;
  const ids=new Set<string>();
  return value.every(link=>{
    if(!link||typeof link!=="object"||!["id","store","title","description","url"].every(key=>typeof link[key]==="string"))return false;
    if(!/^(link-[a-f0-9-]{36}|temu-offer)$/.test(link.id)||ids.has(link.id))return false;ids.add(link.id);
    if(link.offerType!==undefined&&!["general","promo-code","clip-coupon"].includes(link.offerType))return false;
    if(link.promoCode!==undefined&&(typeof link.promoCode!=="string"||link.promoCode.length>80||/[\r\n\x00-\x1f]/.test(link.promoCode)))return false;
    if(link.offerType==="promo-code"&&!link.promoCode?.trim())return false;
    return !!link.store.trim()&&link.store.length<=80&&!!link.title.trim()&&link.title.length<=80&&link.description.length<=160&&link.url.length<=2048&&validStoreLinkUrl(link.url);
  });
}
export function legacyStoreLinks(offer:string):StoreLink[]{return validTemuOffer(offer)?[{id:"temu-offer",store:"Temu",title:"Check new-customer offers",description:"Eligibility and terms apply. Check current details at Temu.",url:offer}]:[];}
export function validTemuOffer(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === "temu.com" || url.hostname.endsWith(".temu.com"));
  } catch { return false; }
}
export function storeAppDestination(id: string, offer = "") {
  return id === "temu-offer" ? (validTemuOffer(offer) ? offer : null) : STORE_APPS.find(app => app.id === id)?.url ?? null;
}
