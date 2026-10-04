import {PROMOTION_TYPES} from "./promotion-types.ts";
export type SavingsOffer={id?:string;offerType?:string;regularPrice?:number|null;salePrice?:number|null;discountAmount?:number|null;discountPercent?:number|null;saleInfo?:string;metadata?:Record<string,unknown>};
const nonnegative=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
const money=(n:number)=>`$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export function promotionSavings(o:SavingsOffer){
 const types=new Set<string>([o.offerType||"general"]);const details:string[]=[];
 const regular=nonnegative(o.regularPrice)?o.regularPrice:null,sale=nonnegative(o.salePrice)?o.salePrice:null;
 const drop=regular!==null&&sale!==null&&regular>sale?regular-sale:0;
 const coupon=["clip-coupon","promo-code"].includes(o.offerType||"");
 let extra=nonnegative(o.discountAmount)&&o.discountAmount>0?o.discountAmount:null;
 if(extra===null&&coupon){const match=o.saleInfo?.match(/(?:CA\$|US\$|C\$|\$)\s*(\d+(?:\.\d{1,2})?)\s+(?:off\s+)?coupon\b/i);if(match)extra=Number(match[1]);}
 if(extra===null&&coupon&&sale!==null&&nonnegative(o.discountPercent)&&o.discountPercent>0&&o.discountPercent<=100)extra=sale*o.discountPercent/100;
 const final=nonnegative(o.metadata?.finalPrice)?o.metadata.finalPrice:null;
 let total:number|null=null,complete=false;
 if(final!==null&&sale!==null&&final<=sale&&regular!==null&&regular>=sale){total=regular-final;complete=true;if(drop>0){types.add("price-discount");details.push(`Price reduction ${money(drop)}`);}if(sale>final)details.push(`Additional discount ${money(sale-final)}`);}
 else if(coupon){if(drop>0&&extra!==null&&sale!==null&&extra<=sale&&o.metadata?.stackable===true){total=drop+extra;complete=true;types.add("price-discount");details.push(`Price reduction ${money(drop)}`,`Additional discount ${money(extra)}`);}else if(extra!==null&&(sale===null||extra<=sale)){total=extra;details.push(`Confirmed additional discount ${money(extra)}; total savings not verified`);}}
 else if(drop>0){total=drop;complete=true;types.add("price-discount");details.push(`Price reduction ${money(drop)}`);}else if(extra!==null){total=extra;details.push(`Confirmed discount ${money(extra)}`);}
 if(total!==null&&Math.round(total*100)<=0)total=null;
 const badges=PROMOTION_TYPES.filter(t=>types.has(t.value)).map(t=>({type:t.value,label:t.label,icon:t.icon}));
 return {total,complete,badges,details:details.join(" + "),label:total===null?"Check amount":`${money(total)} ${complete?"TOTAL OFF":"OFF"}`};
}
export function validRankingLimit(n:unknown):n is number{return typeof n==="number"&&Number.isInteger(n)&&n>=10&&n<=300&&n%10===0;}
export function rankSavings<T extends SavingsOffer>(offers:T[],limit:number){return offers.filter(o=>promotionSavings(o).total!==null).sort((a,b)=>promotionSavings(b).total!-promotionSavings(a).total!||String(a.id).localeCompare(String(b.id))).slice(0,validRankingLimit(limit)?limit:30);}
