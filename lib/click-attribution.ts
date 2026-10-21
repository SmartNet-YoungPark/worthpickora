export const CLICK_SOURCES=["YouTube","TikTok","Instagram","Facebook","Google","Bing","X","Other","Direct / Unknown","Unknown"] as const;
export const CLICK_DEVICES=["PC","Mobile","Tablet","Unknown"] as const;
export const SOURCE_COOKIE="worthpickora-visit-source";
export function normalizeSource(value:string|null|undefined):string {
  const key=(value||"").trim().toLowerCase();
  const known:Record<string,string>={youtube:"YouTube","youtube.com":"YouTube","youtu.be":"YouTube",yt:"YouTube",tiktok:"TikTok","tiktok.com":"TikTok",instagram:"Instagram",ig:"Instagram",facebook:"Facebook",fb:"Facebook",google:"Google",bing:"Bing",twitter:"X",x:"X","direct / unknown":"Direct / Unknown",unknown:"Unknown",other:"Other"};
  return known[key]||(key?"Other":"Direct / Unknown");
}
export function referralSource(referrer:string,origin:string):string|null{
  try{
    const url=new URL(referrer);if(url.origin===origin)return null;
    const host=url.hostname.toLowerCase();
    const domains:Record<string,string>={"youtube.com":"YouTube","youtu.be":"YouTube","tiktok.com":"TikTok","instagram.com":"Instagram","facebook.com":"Facebook","fb.com":"Facebook","google.com":"Google","google.ca":"Google","google.co.uk":"Google","bing.com":"Bing","t.co":"X","twitter.com":"X","x.com":"X"};
    for(const [domain,source]of Object.entries(domains))if(host===domain||host.endsWith("."+domain))return source;
    return "Other";
  }catch{return null;}
}
export function visitSource(url:URL,referrer:string,previous?:string):string{
  const campaign=url.searchParams.get("utm_source");
  if(campaign?.trim())return normalizeSource(campaign);
  return referralSource(referrer,url.origin)||(previous&&CLICK_SOURCES.includes(previous as typeof CLICK_SOURCES[number])?previous:"Direct / Unknown");
}
export function deviceType(userAgent:string,mobileHint:string|null=null):string {
  if(/ipad|tablet|kindle|silk|playbook/i.test(userAgent)||/android/i.test(userAgent)&&!/mobile/i.test(userAgent))return "Tablet";
  if(mobileHint==="?1"||/iphone|ipod|android.*mobile|windows phone|mobile/i.test(userAgent))return "Mobile";
  if(/windows nt|macintosh|x11|cros/i.test(userAgent))return "PC";
  return "Unknown";
}


// Visitor market from the hosting provider's country header; never inferred from currency or a link.
export function clickMarket(country:string|null|undefined):"US"|"CA"|"Other"|"Unknown"{
 const value=country?.trim().toUpperCase();
 if(value==="US"||value==="CA")return value;
 return value&&/^[A-Z]{2}$/.test(value)&&value!=="XX"?"Other":"Unknown";
}
