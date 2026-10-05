import {promotionSavings,type SavingsOffer} from "./promotion-savings.ts";
export function promotionCardOffer(o:SavingsOffer){
 const savings=promotionSavings(o);
 if(savings.complete&&savings.total!==null)return {headline:`Save $${savings.total.toFixed(2)}`,caption:"total verified savings"};
 if(["clip-coupon","promo-code"].includes(o.offerType||"")){
  const caption=o.offerType==="clip-coupon"?"with coupon":"with promo code";
  if(typeof o.discountAmount==="number"&&o.discountAmount>0&&Number.isFinite(o.discountAmount)&&(o.salePrice==null||o.discountAmount<=o.salePrice))return {headline:`Save $${o.discountAmount.toFixed(2)}`,caption};
  if(typeof o.discountPercent==="number"&&o.discountPercent>0&&o.discountPercent<=100)return {headline:`Save ${o.discountPercent}%`,caption};
 }
 return {headline:"Check offer",caption:"at the store"};
}
