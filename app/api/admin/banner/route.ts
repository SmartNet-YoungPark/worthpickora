import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { saveSiteBanner } from "@/lib/server-store-apps";
export async function POST(request:NextRequest){
  const headers={"Cache-Control":"no-store, private"};
  if(request.headers.get("origin")!==request.nextUrl.origin)return Response.json({error:"Forbidden"},{status:403,headers});
  if(!await isAdmin())return Response.json({error:"Sign in to edit the banner."},{status:401,headers});
  let body;
  try{body=await request.json();}catch{return Response.json({error:"Invalid request."},{status:400,headers});}
  if(!body||typeof body.message!=="string"||body.message.length>500)return Response.json({error:"Enter up to 500 characters."},{status:400,headers});
  try{await saveSiteBanner(body.message.trim());return Response.json({ok:true},{headers});}
  catch{return Response.json({error:"Could not save the banner. Apply 20260924030000_site_banner.sql in Supabase and check the connection."},{status:503,headers});}
}
