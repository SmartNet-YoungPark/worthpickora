export type DealInput={promotionType:string;regularPrice?:number|null;salePrice?:number|null;discountPercent?:number|null;discountAmount?:number|null;rawPromotionText?:string;currency?:string};
export function calculateDiscountPercent(regular?:number|null,sale?:number|null){if(typeof regular!=="number"||typeof sale!=="number"||!Number.isFinite(regular)||!Number.isFinite(sale)||regular<=0||sale<0||sale>=regular)return null;const percent=Math.round((regular-sale)/regular*100);return percent>0?percent:null;}
export function normalizePromotion(offer:DealInput){
 const pct=typeof offer.discountPercent==="number"&&Number.isFinite(offer.discountPercent)&&offer.discountPercent>0&&offer.discountPercent<=100?offer.discountPercent:null;
 const amount=typeof offer.discountAmount==="number"&&Number.isFinite(offer.discountAmount)&&offer.discountAmount>0?offer.discountAmount:null;
 const cash=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:offer.currency||"USD",currencyDisplay:"code",maximumFractionDigits:2}).format(n);
 if(pct!==null)return {discountType:"PERCENT",discountPercent:pct,discountAmount:null,displayTitle:`${pct}% OFF`};
 if(amount!==null)return {discountType:"AMOUNT",discountPercent:null,discountAmount:amount,displayTitle:`${cash(amount)} OFF`};
 // Coupon amount/terms must never inherit the separate list-price reduction.
 if(!['clip-coupon','promo-code','PERCENT_COUPON','AMOUNT_COUPON'].includes(offer.promotionType)){
 const calculated=calculateDiscountPercent(offer.regularPrice,offer.salePrice);
 if(calculated!==null)return {discountType:"SALE",discountPercent:calculated,discountAmount:null,displayTitle:`${calculated}% OFF`};
 }
 const labels:Record<string,string>={flyer:"WEEKLY FLYER",rollback:"ROLLBACK","new-user":"NEW USER OFFER"};
 return {discountType:"OTHER",discountPercent:null,discountAmount:null,displayTitle:labels[offer.promotionType]||offer.rawPromotionText?.slice(0,80)||"SPECIAL DEAL"};
}
