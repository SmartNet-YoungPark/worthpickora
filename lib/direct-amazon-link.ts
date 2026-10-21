import {productDestination, validAmazonFullLink, type RegionalProduct} from "./product-affiliate.ts";

// Preserve the complete stored URL, including the owner's affiliate parameters.
export function directAmazonLink(product:RegionalProduct, country:string|null):string|null {
  if(product.store.toLowerCase()!=="amazon")return null;
  const url=productDestination(product,country);
  return url&&(validAmazonFullLink(url,"US")||validAmazonFullLink(url,"CA"))?url:null;
}
