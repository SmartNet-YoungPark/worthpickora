import {NextRequest} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {catalogStorage} from "@/lib/server-catalog";
import {outboundClick} from "@/lib/server-click-analytics";
import {geniuslinkProduct} from "@/lib/geniuslink-product";
import {SOURCE_COOKIE,visitSource,deviceType,clickMarket} from "@/lib/click-attribution";
export const runtime="nodejs";
export async function POST(request:NextRequest){
  const headers={"Cache-Control":"no-store, private"};
  if(request.headers.get("origin")!==request.nextUrl.origin)return new Response(null,{status:403,headers});
  const ua=request.headers.get("user-agent")||"";
  if(/bot|crawler|spider|preview|facebookexternalhit|headless/i.test(ua)||/prefetch|prerender/i.test((request.headers.get("purpose")||"")+" "+(request.headers.get("sec-purpose")||""))||request.headers.has("next-router-prefetch")||await isAdmin())return new Response(null,{status:204,headers});
  let body;
  try{
    const raw=await request.text();if(raw.length>10000)return new Response(null,{status:413,headers});
    body=JSON.parse(raw);
    if(typeof body.id!=="string"||body.id.length>200||typeof body.url!=="string"||body.url.length>8192)throw new Error("Invalid click");
    const page=new URL(body.url);if(page.origin!==request.nextUrl.origin)throw new Error("Invalid page");
  }catch{return new Response(null,{status:400,headers});}
  try{
    const country=request.headers.get("x-vercel-ip-country");
    const product=(await catalogStorage.read()).products.find(p=>p.id===body.id&&p.status==="Published");
    if(!product||!geniuslinkProduct(product))return new Response(null,{status:404,headers});
    await outboundClick(product.id,true,visitSource(new URL(body.url),typeof body.referrer==="string"?body.referrer:"",request.cookies.get(SOURCE_COOKIE)?.value),deviceType(ua,request.headers.get("sec-ch-ua-mobile")),clickMarket(country));
    return new Response(null,{status:204,headers});
  }catch{
    console.error("Direct Amazon click recording failed; check analytics database availability.");
    return new Response(null,{status:503,headers});
  }
}
