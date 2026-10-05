import {PROMOTION_TYPES} from "./promotion-types.ts";
export type SavingsOffer={id?:string;offerType?:string;regularPrice?:number|null;salePrice?:number|null;discountAmount?:number|null;discountPercent?:number|null;saleInfo?:string;metadata?:Record<string,unknown>};
const nonnegative=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
const money=(n:number)=>`$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export function promotionSavings(o:SavingsOffer){
 const types=new Set<string>([o.offerType||"general"]);const details:string[]=[];
 const regular=nonnegative(o.regularPrice)?o.regularPrice:null,sale=nonnegative(o.salePrice)?o.salePrice:null;
 const drop=regular!==null&&sale!==null&&regular>sale?regular-sale:0;
 const coupon=["clip-coupon","promo-code"].includes(o.offerType||"");
 const advertisedAmount=nonnegative(o.discountAmount)&&o.discountAmount>0&&(sale===null||o.discountAmount<=sale)?o.discountAmount:null;
 const advertisedPercent=nonnegative(o.discountPercent)&&o.discountPercent>0&&o.discountPercent<=100?o.discountPercent:null;
 let extra=advertisedAmount;
 // Never infer money from prose: "coupon price $194" is not a $194 discount.
 // A percentage also needs an explicitly verified calculation basis.
 if(extra===null&&coupon&&o.metadata?.stackable===true&&sale!==null&&nonnegative(o.discountPercent)&&o.discountPercent>0&&o.discountPercent<=100)extra=sale*o.discountPercent/100;
 if(sale===null||extra!==null&&extra>sale)extra=null;
 const final=nonnegative(o.metadata?.finalPrice)?o.metadata.finalPrice:null;
 let total:number|null=null,complete=false;
 if(final!==null&&sale!==null&&final<=sale&&regular!==null&&regular>=sale){total=regular-final;complete=true;if(drop>0){types.add("price-discount");details.push(`Price reduction ${money(drop)}`);}if(sale>final)details.push(`Additional discount ${money(sale-final)}`);}
 else if(coupon){if(drop>0&&extra!==null&&sale!==null&&extra<=sale&&o.metadata?.stackable===true){total=drop+extra;complete=true;types.add("price-discount");details.push(`Price reduction ${money(drop)}`,`Additional discount ${money(extra)}`);}}
 else if(drop>0){total=drop;complete=true;types.add("price-discount");details.push(`Price reduction ${money(drop)}`);}
 if(total!==null&&Math.round(total*100)<=0)total=null;
 const badges=PROMOTION_TYPES.filter(t=>types.has(t.value)).map(t=>({type:t.value,label:t.label,icon:t.icon}));
 const breakdown=[{label:"Original price",value:regular===null?"Not confirmed":money(regular)},{label:"Current selling price",value:sale===null?"Not confirmed":money(sale)}];
 if(drop>0)breakdown.push({label:"Price discount",value:money(drop)});
 if(coupon){const applied=complete&&final!==null&&sale!==null?sale-final:advertisedAmount??extra;breakdown.push({label:o.offerType==="promo-code"?"Promo-code discount":"Coupon discount",value:applied!==null?money(applied):advertisedPercent!==null?`${advertisedPercent}%`:"Not confirmed"});}
 const finalValue=final!==null&&sale!==null&&final<=sale?final:complete&&regular!==null&&total!==null?regular-total:null;
 breakdown.push({label:"Final price after promotions",value:finalValue===null?"Not confirmed":money(finalValue)});
 breakdown.push({label:"Total savings",value:total===null?"Not confirmed":money(total)});
 return {total,complete,badges,breakdown,instruction:complete?"Confirm coupon eligibility and the final price at checkout.":"Coupon amounts are conditional on eligibility. Missing prices and unverified stacking prevent a confirmed final price or total savings.",details:details.join(" + "),label:total===null?"Check amount":`${money(total)} ${complete?"TOTAL OFF":"OFF"}`};
}
export function validRankingLimit(n:unknown):n is number{return typeof n==="number"&&Number.isInteger(n)&&n>=10&&n<=300&&n%10===0;}
export function rankSavings<T extends SavingsOffer>(offers:T[],limit:number){return offers.filter(o=>promotionSavings(o).total!==null).sort((a,b)=>promotionSavings(b).total!-promotionSavings(a).total!||String(a.id).localeCompare(String(b.id))).slice(0,validRankingLimit(limit)?limit:30);}
