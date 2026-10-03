// Public-page verification never changes marketplace or follows an affiliate redirect.
export type Verification={state:"confirmed"|"unknown"|"expired";url:string;note:string;offerType?:string;discountPercent?:number|null;saleInfo?:string;discountAmount?:number|null;expiresOn?:string|null;sourceUrl?:string};
export function amazonIdentity(value:string){try{const u=new URL(value);const asin=u.pathname.match(/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/)?.[1];if(u.protocol!=="https:"||u.port||u.username||u.password||!["amazon.com","www.amazon.com","amazon.ca","www.amazon.ca"].includes(u.hostname)||!asin)return null;return {asin,market:u.hostname.endsWith(".ca")?"CA":"US",origin:u.hostname.endsWith(".ca")?"https://www.amazon.ca":"https://www.amazon.com"};}catch{return null;}}
function decode(s:string){return s.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ");}
function plain(s:string){return decode(s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,"").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();}
export function parseAmazonOffer(source:string,url:string):Verification & {termsPath?:string}{
 const identity=amazonIdentity(url);const unknown=(note:string):Verification=>({state:"unknown",url,note});
 if(!identity)return unknown("Unsupported Amazon product URL");
 if(!/id=["']productTitle["']/.test(source)||/captcha|robot check|enter the characters you see/i.test(source.slice(0,20000)))return unknown("Product page unavailable or requires verification");
 // Reject a different selected ASIN. Do not borrow recommendation or parent-variant promotions.
 const asin=source.match(/<input[^>]*id=["']ASIN["'][^>]*value=["']([^"']+)/)?.[1];
 if(asin&&asin!==identity.asin)return unknown("Amazon selected a different product variant");
 const main=source.slice(source.indexOf('id="productTitle"')).split(/id="(?:feature-bullets|detailBullets|similarities|customerReviews)/)[0];
 const blocks=[...main.matchAll(/<span[^>]*id="couponText[^>]*>([\s\S]*?)(?=<style|$)/g)];
 if(blocks.length>1)return unknown("Multiple coupon conditions require manual review");
 if(blocks.length===1){
  const text=plain(blocks[0][1]);const pct=text.match(/(?:Apply|Clip|Save)\s+(\d+(?:\.\d+)?)%\s+(?:off\s+)?coupon/i);
  const amount=text.match(/(?:Apply|Clip|Save)\s+((?:CA\$|C\$|\$)\s*\d+(?:\.\d{1,2})?)\s+(?:off\s+)?coupon/i);
  if(!pct&&!amount&&!/\b(?:Apply|Clip)\s+(?:(?:the|a|available)\s+)?coupon\b/i.test(text))return unknown("Coupon amount or instructions not verified");
  const rate=pct?Number(pct[1]):null;if(rate!==null&&(!(rate>0)||rate>100))return unknown("Invalid coupon percentage");
  let label=pct?`${rate}% coupon`:amount?`${identity.market==="CA"&&amount[1].startsWith("$")?"CA":""}${amount[1]} coupon`:text.slice(0,80);
  const termsPath=decode(blocks[0][1]).match(/\/promotion\/details\/popup\/[^"<>\s]+/)?.[0];
  label=label.replace(/\s+/g," ");return {state:"confirmed",url,offerType:"clip-coupon",discountPercent:rate,discountAmount:amount?Number(amount[1].replace(/[^0-9.]/g,"")):null,saleInfo:label+". Select the coupon on Amazon; eligibility and selected options may vary.",note:`Coupon verified on Amazon ${identity.market}`,termsPath};
 }
 const text=plain(main);const rate=text.match(/-\s*(\d+(?:\.\d+)?)%/);const timed=/dealClock|deal_expiry_timer|Ends in|Limited.time deal|Lightning Deal/i.test(main);
 // A timed deal and an explicit price reduction are required. Ordinary list-price differences are not coupons.
 if(timed&&rate&&Number(rate[1])>0&&Number(rate[1])<=100)return {state:"confirmed",url,offerType:"limited-time",discountPercent:Number(rate[1]),saleInfo:`${rate[1]}% limited-time deal. Check current price and options on Amazon.`,note:`Timed price reduction verified on Amazon ${identity.market}`};
 return unknown("No current coupon or supported timed discount was confirmed");
}
async function readPage(url:string){const r=await fetch(url,{redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(9000),headers:{"User-Agent":"WorthPickora offer verification"}});if(!r.ok)throw new Error(`Amazon returned HTTP ${r.status}`);const s=await r.text();if(s.length>6000000)throw new Error("Amazon response too large");return s;}
export async function verifyAmazonOffer(url:string,savedTermsUrl?:string|null):Promise<Verification>{
 const id=amazonIdentity(url);if(!id)return {state:"unknown",url,note:"Unsupported product URL"};
 try{const source=await readPage(`${id.origin}/dp/${id.asin}`);const result=parseAmazonOffer(source,url);
 const termPath=result.termsPath||savedTermsUrl;
 if(result.state==="confirmed"&&termPath){try{const termsUrl=new URL(termPath,id.origin);if(termsUrl.origin!==id.origin||!termsUrl.pathname.startsWith("/promotion/details/"))throw new Error("Invalid terms origin");const terms=await readPage(termsUrl.toString());const dates=[...new Set([...terms.matchAll(/"EXPIRATION"\s*:\s*"[^"\n]*?([A-Za-z]+ \d{1,2}, \d{4})/g)].map(m=>m[1]))];if(dates.length===1){const value=new Date(dates[0]+" 00:00:00 GMT");if(Number.isFinite(value.getTime())){result.expiresOn=value.toISOString().slice(0,10);result.sourceUrl=termsUrl.toString();}}}catch{result.note+="; expiry terms unavailable";}}
 return result;
 }catch(error){return {state:"unknown",url,note:error instanceof Error?error.message:"Verification failed"};}
}
