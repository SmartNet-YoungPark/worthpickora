import {NextRequest} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {promotionRpc} from "@/lib/server-promotion-schedule";
const headers={"Cache-Control":"no-store, private"};
export async function GET(){if(!await isAdmin())return Response.json({error:"Sign in first"},{status:401,headers});try{return Response.json(await promotionRpc("promotion_schedule_status"),{headers});}catch(e){return Response.json({error:(e as Error).message},{status:503,headers});}}
export async function POST(request:NextRequest){
 if(request.headers.get("origin")!==request.nextUrl.origin)return Response.json({error:"Forbidden"},{status:403,headers});if(!await isAdmin())return Response.json({error:"Sign in first"},{status:401,headers});
 try{const b=await request.json();if(b.action==="run"){await promotionRpc("promotion_run_start",{p_trigger:"manual"});await promotionRpc("promotion_schedule_tick");}
 else{if(typeof b.enabled!=="boolean"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time)||![6,12,24].includes(b.hours)||!["ALL","US","CA"].includes(b.market))return Response.json({error:"Invalid schedule"},{status:400,headers});await promotionRpc("promotion_schedule_save",{p_enabled:b.enabled,p_time:b.time,p_hours:b.hours,p_market:b.market});}
 return Response.json(await promotionRpc("promotion_schedule_status"),{headers});
 }catch(e){return Response.json({error:(e as Error).message},{status:503,headers});}
}
