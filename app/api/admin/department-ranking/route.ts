import {NextRequest} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {promotionRpc} from "@/lib/server-promotion-schedule";
import {validDepartmentLimits} from "@/lib/department-ranking";
const headers={"Cache-Control":"no-store, private"};
export async function GET(){if(!await isAdmin())return Response.json({error:"Sign in first"},{status:401,headers});try{return Response.json(await promotionRpc("amazon_department_ranking_get"),{headers});}catch{return Response.json({error:"Department settings unavailable. Apply 20261004020000_amazon_department_ranking.sql in Supabase."},{status:503,headers});}}
export async function POST(r:NextRequest){if(r.headers.get("origin")!==r.nextUrl.origin)return Response.json({error:"Forbidden"},{status:403,headers});if(!await isAdmin())return Response.json({error:"Sign in first"},{status:401,headers});try{const {market,limits}=await r.json();if(!["US","CA"].includes(market)||!validDepartmentLimits(limits))return Response.json({error:"Choose 10-100 per department in steps of 10"},{status:400,headers});await promotionRpc("amazon_department_ranking_save",{p_market:market,p_limits:limits});return Response.json({ok:true},{headers});}catch{return Response.json({error:"Could not save department settings. Check Supabase migration and connection."},{status:503,headers});}}
