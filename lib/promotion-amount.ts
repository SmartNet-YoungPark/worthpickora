type Offer={offerType?:string;discountAmount?:number|null;discountPercent?:number|null;regularPrice?:number|null;salePrice?:number|null;saleInfo?:string};
export function promotionAmountLabel(offer:Offer):string{
 const valid=(n:unknown):n is number=>typeof n==="number"&&Number.isFinite(n)&&n>0;
 let amount=valid(offer.discountAmount)?offer.discountAmount:null;
 const coupon=["clip-coupon","promo-code"].includes(offer.offerType||"");
 if(amount===null&&coupon){
  const match=offer.saleInfo?.match(/(?:CA\$|US\$|C\$|\$)\s*(\d+(?:\.\d{1,2})?)\s+(?:off\s+)?coupon\b/i);
  if(match&&valid(Number(match[1])))amount=Number(match[1]);
  else if(valid(offer.salePrice)&&valid(offer.discountPercent)&&offer.discountPercent<=100)amount=offer.salePrice*offer.discountPercent/100;
 }
 if(amount===null&&!coupon&&valid(offer.regularPrice)&&typeof offer.salePrice==="number"&&Number.isFinite(offer.salePrice)&&offer.salePrice>=0&&offer.salePrice<offer.regularPrice)amount=offer.regularPrice-offer.salePrice;
 if(amount===null||Math.round(amount*100)===0)return "Check amount";
 return `$${amount.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} OFF`;
}
