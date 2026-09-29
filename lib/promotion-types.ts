export const PROMOTION_TYPES = [
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

export function promotionCardSummary(offer:{offerType?:string;discountPercent?:number|null;promoCode?:string;saleInfo?:string}){
  const type=PROMOTION_TYPES.find(type=>type.value===offer.offerType)||PROMOTION_TYPES[PROMOTION_TYPES.length-1];
  const percent=typeof offer.discountPercent==="number"&&Number.isFinite(offer.discountPercent)&&offer.discountPercent>0&&offer.discountPercent<=100?`${offer.discountPercent}%`:"";
  if(type.value==="clip-coupon"){
    const amount=offer.saleInfo?.match(/\$\d+(?:\.\d{1,2})?\s+(?:clip\s+)?coupon\b/i)?.[0].replace(/\s+(?:clip\s+)?coupon$/i,"");
    return {headline:percent?`${percent} coupon`:amount?`${amount} coupon`:"Coupon",instruction:"Select coupon on Amazon"};
  }
  if(type.value==="promo-code")return {headline:percent?`${percent} off with code`:"Promo code",instruction:offer.promoCode?`Code: ${offer.promoCode}`:"Check code on Amazon"};
  const instructions:Record<string,string>={"price-discount":"Check current price","lightning-deal":"Limited-time offer","limited-time":"Check offer end time","prime-exclusive":"Prime eligibility required","subscribe-save":"Subscription required","buy-one-get-one":"Check qualifying items","multi-buy":"Minimum quantity may apply","targeted":"Check your eligibility","general":"Check offer on Amazon"};
  return {headline:percent?`${percent} off ? ${type.label}`:type.label,instruction:instructions[type.value]};
}

export function topCouponOffers<T extends {id:string;offerType?:string;category?:string;discountPercent?:number|null;expiresAt?:string|null}>(offers:T[],category="",now=Date.now()){
 return offers.filter(offer=>offer.offerType==="clip-coupon"&&!promotionExpired(offer.expiresAt,now)&&(!category||offer.category===category)&&typeof offer.discountPercent==="number"&&Number.isFinite(offer.discountPercent)&&offer.discountPercent>0&&offer.discountPercent<=100).sort((a,b)=>(b.discountPercent!-a.discountPercent!)||a.id.localeCompare(b.id)).slice(0,30);
}

export function promotionExpired(expiresAt:string|null|undefined,now=Date.now()){return !!expiresAt&&Number.isFinite(Date.parse(expiresAt))&&Date.parse(expiresAt)<=now;}
