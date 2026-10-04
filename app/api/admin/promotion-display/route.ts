import {NextRequest} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {promotionRpc} from "@/lib/server-promotion-schedule";
import {validRankingLimit} from "@/lib/promotion-savings";
const headers={"Cache-Control":"no-store, private"};
export async function GET(){if(!await isAdmin())return Response.json({error:"Sign in first"},{status:401,headers});try{return Response.json(await promotionRpc("promotion_display_get"),{headers});}catch{return Response.json({error:"Display settings unavailable"},{status:503,headers});}}
export async function POST(r:NextRequest){if(r.headers.get("origin")!==r.nextUrl.origin)return Response.json({error:"Forbidden"},{status:403,headers});if(!await isAdmin())return Response.json({error:"Sign in first"},{status:401,headers});try{const {rankingLimit}=await r.json();if(!validRankingLimit(rankingLimit))return Response.json({error:"Choose 10 to 300 in steps of 10"},{status:400,headers});await promotionRpc("promotion_display_save",{p_limit:rankingLimit});return Response.json({rankingLimit},{headers});}catch{return Response.json({error:"Could not save display settings"},{status:503,headers});}}
