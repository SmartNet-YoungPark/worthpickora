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

// Use the verified source marketplace, never a saved geo-routing/short URL.
export function amazonPromotionDestination(source:string,market:"US"|"CA",admin=false):string|null{
 try{const u=new URL(source);const asin=u.pathname.match(/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/)?.[1];
 const hosts=market==="CA"?["amazon.ca","www.amazon.ca"]:["amazon.com","www.amazon.com"];
 if(!asin||u.protocol!=="https:"||!hosts.includes(u.hostname)||u.username||u.password||u.port)return null;
 const direct=`https://www.amazon.${market==="CA"?"ca":"com"}/dp/${asin}`;
 return admin?direct:amazonAffiliateUrl(direct);
 }catch{return null;}
}
