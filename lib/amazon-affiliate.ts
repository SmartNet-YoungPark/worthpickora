export const AMAZON_TRACKING_ID = "smartnetweb0a-20";

export const AMAZON_CA_TRACKING_ID = "smartnetwe06a-20";

export function amazonAffiliateUrl(value:string):string {
  try {
    const url=new URL(value);
    if(url.protocol!=="https:"||!["amazon.com","www.amazon.com","amazon.ca","www.amazon.ca"].includes(url.hostname)||url.username||url.password||url.port)return value;
    url.searchParams.set("tag",url.hostname.endsWith("amazon.ca")?AMAZON_CA_TRACKING_ID:AMAZON_TRACKING_ID);
    return url.toString();
  } catch {return value;}
}
