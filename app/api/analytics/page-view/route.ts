import {NextRequest} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {recordPageView} from "@/lib/server-page-views";
import {SOURCE_COOKIE,visitSource,deviceType} from "@/lib/click-attribution";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 const headers={"Cache-Control":"no-store, private"};
 if(request.headers.get("origin")!==request.nextUrl.origin)return new Response(null,{status:403,headers});
 if(/bot|crawler|spider|preview|facebookexternalhit|headless/i.test(request.headers.get("user-agent")||"")||/prefetch|prerender/i.test((request.headers.get("purpose")||"")+" "+(request.headers.get("sec-purpose")||""))||request.headers.has("next-router-prefetch")||await isAdmin())return new Response(null,{status:204,headers});
 try{
  const body=await request.json();
  if(typeof body.id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)||typeof body.url!=="string"||body.url.length>8192)return new Response(null,{status:400,headers});
  const page=new URL(body.url);if(page.origin!==request.nextUrl.origin||page.pathname!=="/")return new Response(null,{status:400,headers});
  const source=visitSource(page,typeof body.referrer==="string"?body.referrer:"",request.cookies.get(SOURCE_COOKIE)?.value);
  await recordPageView(body.id,source,deviceType(request.headers.get("user-agent")||"",request.headers.get("sec-ch-ua-mobile")));
  return new Response(null,{status:204,headers});
 }catch{return new Response(null,{status:503,headers});}
}
