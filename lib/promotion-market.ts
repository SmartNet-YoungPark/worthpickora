export type Market="US"|"CA";
export function visitorMarket(country:string|null,language:string|null):Market{
 if(country)return country.toUpperCase()==="CA"?"CA":"US";
 const first=(language||"").split(",")[0].split(";")[0].trim();
 return /-CA$/i.test(first)?"CA":"US";
}
export function selectedMarket(country:string|null,language:string|null,admin:boolean,requested:unknown):Market{
 return admin&&(requested==="US"||requested==="CA")?requested:visitorMarket(country,language);
}
export function offerMarket(offer:{market?:Market;productUrl?:string;url:string}):Market{
 if(offer.market)return offer.market;
 try{return new URL(offer.productUrl||offer.url).hostname.endsWith(".ca")?"CA":"US";}catch{return "US";}
}
