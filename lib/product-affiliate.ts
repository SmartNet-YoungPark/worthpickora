export type RegionalProduct={store:string;url:string;urlUS?:string;urlCA?:string;urlShortUS?:string;urlShortCA?:string};
export function validAmazonFullLink(value:string,market:"US"|"CA"){
 try{const u=new URL(value);return value.length<=2048&&u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&[market==="CA"?"amazon.ca":"amazon.com",market==="CA"?"www.amazon.ca":"www.amazon.com"].includes(u.hostname)&&(/\/(?:dp|gp\/product|gp\/aw\/d)\/[A-Z0-9]{10}(?:[/?]|$)/i.test(u.pathname)||(/^\/mh\/?$/.test(u.pathname)&&/^[A-Z0-9]{10}$/i.test(u.searchParams.get("s")||"")));}catch{return false;}
}
export function validAmazonShortLink(value:string){
 try{const u=new URL(value);return value.length<=2048&&u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&["amzn.to","a.co","link.amazon"].includes(u.hostname)&&u.pathname.length>1;}catch{return false;}
}
export function productDestination(p:RegionalProduct,country:string|null){
 if(p.urlUS||p.urlCA||p.urlShortUS||p.urlShortCA){
  const market=country?.toUpperCase()==="CA"?"CA":"US";
  const full=market==="CA"?p.urlCA:p.urlUS,short=market==="CA"?p.urlShortCA:p.urlShortUS;
  if(full)return validAmazonFullLink(full,market)?full:null;
  return short&&validAmazonShortLink(short)?short:null;
 }
 return p.url;
}
