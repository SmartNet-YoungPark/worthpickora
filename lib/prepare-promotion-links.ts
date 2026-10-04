import type {StoreLink} from "./store-apps";
import {amazonAffiliateUrl,AMAZON_TRACKING_ID,AMAZON_CA_TRACKING_ID} from "./amazon-affiliate";
import {amazonIdentity} from "./promotion-verifier";
import {normalizePromotion} from "./promotion-normalizer";
export function preparePromotionLinks(links:StoreLink[]):StoreLink[]{return links.map(link=>{
 const source=link.productUrl||link.url;const identity=link.store==="Amazon"?amazonIdentity(source):null;
 if(link.store==="Amazon"&&!identity)throw new Error("Amazon offers need a full amazon.com or amazon.ca /dp/ASIN product URL.");
 const market=link.market||identity?.market||"US";
 if(identity&&identity.market!==market)throw new Error("The product URL must match the selected marketplace.");
 const n=normalizePromotion({promotionType:link.offerType||"general",regularPrice:link.regularPrice,salePrice:link.salePrice,discountAmount:link.discountAmount,discountPercent:link.discountBasis==="calculated"?null:link.discountPercent,rawPromotionText:link.saleInfo,currency:market==="CA"?"CAD":"USD"});
 return {...link,discountBasis:n.discountType==="SALE"?"calculated":"explicit",market:market as "US"|"CA",currency:market==="CA"?"CAD":"USD",productId:link.productId||link.id,productUrl:source,asin:identity?.asin||link.asin,url:link.store==="Amazon"?amazonAffiliateUrl(link.url):link.url,trackingId:identity?(market==="CA"?AMAZON_CA_TRACKING_ID:AMAZON_TRACKING_ID):link.trackingId,discountPercent:n.discountPercent,discountAmount:n.discountAmount};
});}
