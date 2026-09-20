import {NextRequest,NextResponse} from "next/server";
import {SOURCE_COOKIE,visitSource} from "./lib/click-attribution";
export function proxy(request:NextRequest){
  const response=NextResponse.next();
  if(request.method!=="GET"||request.headers.has("next-router-prefetch")||/prefetch|prerender/i.test((request.headers.get("purpose")||"")+" "+(request.headers.get("sec-purpose")||"")))return response;
  const source=visitSource(request.nextUrl,request.headers.get("referer")||"",request.cookies.get(SOURCE_COOKIE)?.value);
  response.cookies.set(SOURCE_COOKIE,source,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:1800});
  response.headers.set("Cache-Control","no-store, private");
  return response;
}
export const config={matcher:["/"]};

