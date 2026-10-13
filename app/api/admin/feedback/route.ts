import {NextRequest} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {validRange} from "@/lib/click-analytics";
import {feedbackId} from "@/lib/customer-feedback";
import {feedbackRpc} from "@/lib/server-feedback";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private"};
export async function DELETE(request:NextRequest){
 if(request.headers.get("origin")!==request.nextUrl.origin)return Response.json({error:"Forbidden"},{status:403,headers});
 if(!await isAdmin())return Response.json({error:"Sign in to manage feedback."},{status:401,headers});
 let body;try{body=await request.json();}catch{return Response.json({error:"Invalid request."},{status:400,headers});}
 if(!body||!feedbackId(body.id)||body.confirmed!==true)return Response.json({error:"Confirm the comment you want to delete."},{status:400,headers});
 try{
  await feedbackRpc("customer_feedback_delete",{p_id:body.id});
  return Response.json({message:"Comment and reply deleted."},{headers});
 }catch{return Response.json({error:"Could not delete the comment. Please retry."},{status:503,headers});}
}
export async function GET(request:NextRequest){
 if(!await isAdmin())return Response.json({error:"Sign in to manage feedback."},{status:401,headers});
 const date=request.nextUrl.searchParams.get("date")||"",offset=Number(request.nextUrl.searchParams.get("offset")||0);
 if(!validRange(date,date)||!Number.isSafeInteger(offset)||offset<0)return Response.json({error:"Choose a valid date."},{status:400,headers});
 try{return Response.json({rows:await feedbackRpc("customer_feedback_list",{p_date:date,p_admin:true,p_offset:offset})},{headers});}
 catch{return Response.json({error:"Feedback unavailable. Check the customer feedback migration and Supabase connection."},{status:503,headers});}
}
export async function PATCH(request:NextRequest){
 if(request.headers.get("origin")!==request.nextUrl.origin)return Response.json({error:"Forbidden"},{status:403,headers});
 if(!await isAdmin())return Response.json({error:"Sign in to manage feedback."},{status:401,headers});
 const text=await request.text();if(text.length>10000)return Response.json({error:"Reply is too long."},{status:413,headers});
 let body;try{body=JSON.parse(text);}catch{return Response.json({error:"Invalid request."},{status:400,headers});}
 if(!body||!feedbackId(body.id)||typeof body.reply!=="string"||body.reply.length>1500||!["pending","visible","hidden"].includes(body.status))return Response.json({error:"Invalid reply or visibility."},{status:400,headers});
 try{
  const updated=await feedbackRpc("customer_feedback_update",{p_id:body.id,p_reply:body.reply,p_status:body.status});
  return Response.json(updated?{message:"Reply and visibility saved."}:{error:"Comment not found."},{status:updated?200:404,headers});
 }catch{return Response.json({error:"Could not save your reply. Please retry."},{status:503,headers});}
}
