import {NextRequest,NextResponse} from "next/server";
import {isAdmin,adminConfig} from "@/lib/admin-auth";
import {replaceAdminHash} from "@/lib/admin-credentials";
import {validAdminPin,verifyPassword,hashPassword,SESSION_COOKIE,createLoginLimiter} from "@/lib/admin-security";
const state=globalThis as typeof globalThis & {passwordChangeLimiter?:ReturnType<typeof createLoginLimiter>};
const allow=state.passwordChangeLimiter??=createLoginLimiter(5,60_000);
export async function POST(request:NextRequest){
  const headers={"Cache-Control":"no-store, private"};
  if(request.headers.get("origin")!==request.nextUrl.origin)return Response.json({error:"Forbidden"},{status:403,headers});
  if(!await isAdmin())return Response.json({error:"Sign in to change the PIN."},{status:401,headers});
  if(!allow())return Response.json({error:"Too many attempts. Wait one minute."},{status:429,headers});
  let body;try{body=await request.json();}catch{return Response.json({error:"Invalid request."},{status:400,headers});}
  if(!body||typeof body.current!=="string"||typeof body.next!=="string"||!validAdminPin(body.current)||!validAdminPin(body.next)||body.next!==body.confirm||body.next===body.current)return Response.json({error:"Enter the current four-digit PIN and a different matching new four-digit PIN."},{status:400,headers});
  const config=await adminConfig();
  if(!config.configured||!await verifyPassword(body.current,config.passwordHash))return Response.json({error:"Current PIN is incorrect."},{status:400,headers});
  try{await replaceAdminHash(config.passwordHash,await hashPassword(body.next));}
  catch(problem){return Response.json({error:problem instanceof Error?problem.message:"Could not change the PIN."},{status:503,headers});}
  const response=NextResponse.json({ok:true},{headers});
  response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0});
  return response;
}
