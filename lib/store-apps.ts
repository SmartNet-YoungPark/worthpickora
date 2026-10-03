import {PROMOTION_TYPES,MAX_PROMOTION_LINKS,type PromotionType} from "./promotion-types.ts";
export const STORE_APPS = [
  { id: "amazon-ios", store: "Amazon", label: "iPhone / iPad", url: "https://apps.apple.com/us/app/amazon-shopping/id297606951" },
  { id: "amazon-android", store: "Amazon", label: "Android", url: "https://play.google.com/store/apps/details?id=com.amazon.mShop.android.shopping" },
  { id: "walmart", store: "Walmart", label: "Official app guide", url: "https://www.walmart.com/cp/walmart-app/1087865" },
  { id: "best-buy", store: "Best Buy", label: "Official app guide", url: "https://www.bestbuy.com/discover-learn/benefits-of-the-best-buy-app/pcmcat1674162066016" },
  { id: "temu", store: "Temu", label: "Official app guide", url: "https://www.temu.com/app.html" },
  { id: "target", store: "Target", label: "Official app guide", url: "https://www.target.com/c/target-app/-/N-4th2r" },
  { id: "etsy", store: "Etsy", label: "Official app guide", url: "https://www.etsy.com/mobile" },
] as const;
export type StoreLink = {productId?:string;market?:"US"|"CA";currency?:"USD"|"CAD";asin?:string|null;productUrl?:string;termsUrl?:string|null;trackingId?:string|null;regularPrice?:number|null;salePrice?:number|null;discountAmount?:number|null;newCustomerOnly?:boolean;metadata?:Record<string,unknown>;verificationState?:"confirmed"|"unknown"|"expired";verifiedAt?:string|null;verifiedUrl?:string|null;verificationNote?:string|null;id:string;store:string;title:string;description:string;url:string;category?:string;offerType?:PromotionType;discountPercent?:number|null;expiresAt?:string|null;expiresOn?:string|null;promoCode?:string;image?:string;saleInfo?:string};
export function validStoreLinkUrl(value:string){
  try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&!url.port&&!!url.hostname;}catch{return false;}
}
export function validateStoreLinks(value:unknown):value is StoreLink[]{
  if(!Array.isArray(value)||value.length>MAX_PROMOTION_LINKS)return false;
  const ids=new Set<string>();
  return value.every(link=>{
    if(!link||typeof link!=="object"||!["id","store","title","description","url"].every(key=>typeof link[key]==="string"))return false;
    if(!/^(link-[a-f0-9-]{36}|temu-offer)$/.test(link.id)||ids.has(link.id))return false;ids.add(link.id);
    if(link.expiresAt!=null&&(typeof link.expiresAt!=="string"||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(link.expiresAt)||!Number.isFinite(Date.parse(link.expiresAt))))return false;
    if(link.market!==undefined&&!["US","CA"].includes(link.market))return false;
    if(link.currency!==undefined&&link.currency!==(link.market==="CA"?"CAD":"USD"))return false;
    if(link.productId!==undefined&&(typeof link.productId!=="string"||!/^(link-[a-f0-9-]{36}|temu-offer)$/.test(link.productId)))return false;
    for(const field of ["productUrl","termsUrl"]){if(link[field]!=null&&(typeof link[field]!=="string"||link[field].length>2048||(link[field]&&!validStoreLinkUrl(link[field]))))return false;}
    for(const field of ["regularPrice","salePrice","discountAmount"]){if(link[field]!=null&&(typeof link[field]!=="number"||!Number.isFinite(link[field])||link[field]<0||link[field]>9999999999.99||(field==="discountAmount"&&link[field]===0)))return false;}
    if(link.metadata!==undefined&&(!link.metadata||typeof link.metadata!=="object"||Array.isArray(link.metadata)||JSON.stringify(link.metadata).length>10000))return false;
    if(link.category!==undefined&&(typeof link.category!=="string"||link.category.length>80))return false;
    if(link.offerType!==undefined&&!PROMOTION_TYPES.some(type=>type.value===link.offerType))return false;
    if(link.discountPercent!=null&&(typeof link.discountPercent!=="number"||!Number.isFinite(link.discountPercent)||link.discountPercent<=0||link.discountPercent>100))return false;
    if(link.promoCode!==undefined&&(typeof link.promoCode!=="string"||link.promoCode.length>80||/[\r\n\x00-\x1f]/.test(link.promoCode)))return false;
    if(link.offerType==="promo-code"&&!link.promoCode?.trim())return false;
    if(link.saleInfo!==undefined&&(typeof link.saleInfo!=="string"||link.saleInfo.length>300))return false;
    if(link.image!==undefined&&(typeof link.image!=="string"||link.image.length>2048||(link.image&&!validStoreLinkUrl(link.image))))return false;
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
