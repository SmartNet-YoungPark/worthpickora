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
