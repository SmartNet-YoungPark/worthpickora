export type RegionalProduct={store:string;url:string;urlUS?:string;urlCA?:string};
export function validAmazonFullLink(value:string,market:"US"|"CA"){
 try{const u=new URL(value);return value.length<=2048&&u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&[market==="CA"?"amazon.ca":"amazon.com",market==="CA"?"www.amazon.ca":"www.amazon.com"].includes(u.hostname)&&(/\/(?:dp|gp\/product|gp\/aw\/d)\/[A-Z0-9]{10}(?:[/?]|$)/i.test(u.pathname)||(/^\/mh\/?$/.test(u.pathname)&&/^[A-Z0-9]{10}$/i.test(u.searchParams.get("s")||"")));}catch{return false;}
}
export function productDestination(p:RegionalProduct,country:string|null){
 if(p.urlUS||p.urlCA){const market=country?.toUpperCase()==="CA"?"CA":"US";const value=market==="CA"?p.urlCA:p.urlUS;if(!value||!validAmazonFullLink(value,market))return null;return value;}
 return p.url;
}
