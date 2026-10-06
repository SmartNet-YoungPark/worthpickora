import {productDestination} from "@/lib/product-affiliate";
import {NextRequest} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {outboundClick} from "@/lib/server-click-analytics";
import {validUrl} from "@/lib/catalog";
import {catalogStorage} from "@/lib/server-catalog";
import {SOURCE_COOKIE,visitSource,deviceType} from "@/lib/click-attribution";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
  const preview=/prefetch|prerender/i.test((request.headers.get("purpose")||"")+" "+(request.headers.get("sec-purpose")||"")) || request.headers.has("next-router-prefetch");
  const bot=/bot|crawler|spider|preview|facebookexternalhit|headless/i.test(request.headers.get("user-agent")||"");
  const country=request.headers.get("x-vercel-ip-country");
  try{
    const product=(await catalogStorage.read()).products.find(p=>p.id===id&&p.status==="Published");
    if(!product)return new Response("Product unavailable",{status:404,headers});
    const routed=productDestination(product,country);
    if(!routed||!validUrl(routed))return new Response("Product link unavailable for your country",{status:404,headers});
    const source=visitSource(request.nextUrl,request.headers.get("referer")||"",request.cookies.get(SOURCE_COOKIE)?.value);
    const device=deviceType(request.headers.get("user-agent")||"",request.headers.get("sec-ch-ua-mobile"));
    await outboundClick(id,!preview&&!bot&&!await isAdmin(),source,device);
    return new Response(null,{status:302,headers:{...headers,Location:routed}});
  }catch{
    console.error("Product click recording failed; check analytics migration and database availability.");
    // An analytics outage must not prevent a customer from reaching the store.
    try {
      const product=(await catalogStorage.read()).products.find(p=>p.id===id&&p.status==="Published");
      const routed=product?productDestination(product,country):null;
      if(routed&&validUrl(routed))return new Response(null,{status:302,headers:{...headers,Location:routed,"X-Click-Recorded":"false"}});
    }catch { /* Both services unavailable: display a retry message. */ }
    return new Response("The store link is temporarily unavailable. Please return to the product and try again.",{status:503,headers});
  }
}
// Link inspection must not create a customer click.
export async function HEAD(){return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});}
