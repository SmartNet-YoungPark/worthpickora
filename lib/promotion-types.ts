import {normalizePromotion} from "./promotion-normalizer.ts";
export const PROMOTION_TYPES = [
  {value:"flyer",label:"Weekly Flyer",icon:"FL"},
  {value:"rollback",label:"Rollback",icon:"RB"},
  {value:"new-user",label:"New User Offer",icon:"NEW"},
  {value:"clip-coupon",label:"Coupon",icon:"✂"},
  {value:"promo-code",label:"Promo Code",icon:"🏷"},
  {value:"price-discount",label:"Price Discount",icon:"↓"},
  {value:"lightning-deal",label:"Lightning Deal",icon:"⚡"},
  {value:"limited-time",label:"Limited-time Deal",icon:"⏳"},
  {value:"prime-exclusive",label:"Prime Exclusive",icon:"👑"},
  {value:"subscribe-save",label:"Subscribe & Save",icon:"↻"},
  {value:"buy-one-get-one",label:"Buy One Get One",icon:"🎁"},
  {value:"multi-buy",label:"Multi-buy",icon:"🛍"},
  {value:"targeted",label:"Targeted Offer",icon:"🎯"},
  {value:"general",label:"General Offer",icon:"☆"},
] as const;
export type PromotionType = typeof PROMOTION_TYPES[number]["value"];
export const MAX_PROMOTION_LINKS=1000;
export function promotionSetAssignments<T extends {offerType?:string}>(offers:T[]){
  const counts=new Map<string,number>();
  return offers.map(offer=>{const type=PROMOTION_TYPES.find(type=>type.value===offer.offerType)||PROMOTION_TYPES[PROMOTION_TYPES.length-1];const index=counts.get(type.value)||0;counts.set(type.value,index+1);return {offer,type,set:Math.floor(index/10)+1};});
}

export function promotionCardSummary(offer:{offerType?:string;discountPercent?:number|null;promoCode?:string;saleInfo?:string;description?:string;url?:string;currency?:string;discountAmount?:number|null;regularPrice?:number|null;salePrice?:number|null}){
  const type=PROMOTION_TYPES.find(type=>type.value===offer.offerType)||PROMOTION_TYPES[PROMOTION_TYPES.length-1];
  const percent=typeof offer.discountPercent==="number"&&Number.isFinite(offer.discountPercent)&&offer.discountPercent>0&&offer.discountPercent<=100?`${offer.discountPercent}%`:"";
  if(offer.discountAmount!=null||offer.regularPrice!=null||offer.salePrice!=null){const n=normalizePromotion({promotionType:type.value,...offer,rawPromotionText:offer.saleInfo});return {headline:n.displayTitle,instruction:"Check current offer terms"};}
  if(type.value==="clip-coupon"){
    const content=(offer.saleInfo||offer.description||"").trim();
    const amount=content.match(/(?:CA\$|C\$|\$)\s*\d+(?:[,.]\d{1,2})?(?=\s+(?:off\s+)?(?:clip\s+)?coupon\b)/i)?.[0]||content.match(/(?:coupon[^.!]{0,30}?)([C$A]*\$\s*\d+(?:\.\d{1,2})?)/i)?.[1];
    let currencyAmount=amount?.replace(/\s+/g,"");
    if(currencyAmount?.startsWith("$")&&offer.url&&/^https:\/\/(?:www\.)?amazon\.ca\//i.test(offer.url))currencyAmount="CA"+currencyAmount;
    const short=content.split(/[.!]\s/)[0];
    return {headline:percent?`${percent} coupon`:currencyAmount?`${currencyAmount} coupon`:short?short.slice(0,65):"Coupon",instruction:"Select coupon on Amazon"};
  }
  if(type.value==="promo-code")return {headline:percent?`${percent} off with code`:"Promo code",instruction:offer.promoCode?`Code: ${offer.promoCode}`:"Check code on Amazon"};
  const instructions:Record<string,string>={"price-discount":"Check current price","lightning-deal":"Limited-time offer","limited-time":"Check offer end time","prime-exclusive":"Prime eligibility required","subscribe-save":"Subscription required","buy-one-get-one":"Check qualifying items","multi-buy":"Minimum quantity may apply","targeted":"Check your eligibility","general":"Check offer on Amazon"};
  return {headline:percent?`${percent} off ? ${type.label}`:type.label,instruction:instructions[type.value]};
}

export function topCouponOffers<T extends {id:string;offerType?:string;category?:string;discountPercent?:number|null;expiresAt?:string|null;expiresOn?:string|null}>(offers:T[],category="",now=Date.now()){
 return offers.filter(offer=>offer.offerType==="clip-coupon"&&promotionStatus(offer.expiresAt,now,offer.expiresOn)!=="expired"&&(!category||offer.category===category)&&typeof offer.discountPercent==="number"&&Number.isFinite(offer.discountPercent)&&offer.discountPercent>0&&offer.discountPercent<=100).sort((a,b)=>(b.discountPercent!-a.discountPercent!)||a.id.localeCompare(b.id)).slice(0,30);
}

export function promotionExpired(expiresAt:string|null|undefined,now=Date.now()){return !!expiresAt&&Number.isFinite(Date.parse(expiresAt))&&Date.parse(expiresAt)<=now;}

export function promotionStatus(expiresAt:string|null|undefined,now=Date.now(),expiresOn?:string|null):"active"|"expired"|"check"{
 if(expiresAt&&Number.isFinite(Date.parse(expiresAt)))return promotionExpired(expiresAt,now)?"expired":"active";
 // Date-only evidence uses the site's calendar date; the expiry day itself is uncertain.
 if(!expiresOn||!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)||!Number.isFinite(Date.parse(expiresOn))||new Date(expiresOn).toISOString().slice(0,10)!==expiresOn)return "check";
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Toronto",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const today=`${part("year")}-${part("month")}-${part("day")}`;
 return expiresOn>today?"active":expiresOn<today?"expired":"check";
}

export function verifiedPromotionStatus(offer:{expiresAt?:string|null;expiresOn?:string|null;verificationState?:string;verifiedAt?:string|null;verifiedUrl?:string|null;productUrl?:string;url:string},now=Date.now()):"active"|"expired"|"check"{
 const expiration=promotionStatus(offer.expiresAt,now,offer.expiresOn);
 if(expiration==="expired"||offer.verificationState==="expired")return "expired";
 const age=offer.verifiedAt?now-Date.parse(offer.verifiedAt):NaN;
 if(offer.verificationState!=="confirmed"||!Number.isFinite(age)||age<0||age>36*3600000||offer.verifiedUrl!==(offer.productUrl||offer.url))return "check";
 // Confirmed live coupon presence can be active even when its end time is not published.
 return "active";
}
