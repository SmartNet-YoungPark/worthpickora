import {validAmazonFullLink,type RegionalProduct} from "./product-affiliate.ts";

// Build in the initial HTML: affiliation must not depend on script load timing.
// US is the source marketplace; Geniuslink owns destination localization.
export function geniuslinkProduct(product:RegionalProduct):string|null {
  if(product.store.toLowerCase()!=="amazon")return null;
  const source=product.urlUS||product.url;
  if(!validAmazonFullLink(source,"US"))return null;
  const link=new URL("https://buy.geni.us/Proxy.ashx");
  link.searchParams.set("TSID","447940");
  link.searchParams.set("GR_URL",source);
  link.searchParams.set("dtb","1");
  return link.href;
}
