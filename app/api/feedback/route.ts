import {NextRequest} from "next/server";
import {createHmac} from "node:crypto";
import {validFeedback} from "@/lib/customer-feedback";
import {validRange} from "@/lib/click-analytics";
import {feedbackRpc} from "@/lib/server-feedback";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private"};
export async function GET(request:NextRequest){
 const date=request.nextUrl.searchParams.get("date")||"";
 const offset=Number(request.nextUrl.searchParams.get("offset")||0);
 if(!validRange(date,date)||!Number.isSafeInteger(offset)||offset<0)return Response.json({error:"Choose a valid date."},{status:400,headers});
 try{return Response.json({rows:await feedbackRpc("customer_feedback_list",{p_date:date,p_admin:false,p_offset:offset})},{headers});}
 catch{return Response.json({error:"Customer comments are temporarily unavailable. Please try again."},{status:503,headers});}
}
export async function POST(request:NextRequest){
 if(request.headers.get("origin")!==request.nextUrl.origin)return Response.json({error:"Forbidden"},{status:403,headers});
 const text=await request.text();
 if(text.length>10000)return Response.json({error:"Message is too long."},{status:413,headers});
 let body;try{body=JSON.parse(text);}catch{return Response.json({error:"Invalid request."},{status:400,headers});}
 if(!validFeedback(body))return Response.json({error:"Choose a feedback type, a name (up to 60 characters) and a message (5–1500 characters)."},{status:400,headers});
 try{
  const secret=process.env.ADMIN_SESSION_SECRET||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret)throw new Error("Storage not configured");
  const ip=process.env.VERCEL?request.headers.get("x-vercel-forwarded-for")||request.headers.get("x-forwarded-for")||"unknown":"local";
  const sender=createHmac("sha256",secret).update(ip.split(",")[0].trim()).digest("hex");
  const accepted=await feedbackRpc("customer_feedback_submit",{p_id:body.id,p_name:body.name.trim(),p_sentiment:body.sentiment,p_message:body.message.trim(),p_sender:sender});
  if(!accepted)return Response.json({error:"Please wait before posting again (3 messages per hour)."},{status:429,headers});
  return Response.json({message:"Thank you! Your comment was saved for review. Approved comments and administrator replies appear here."},{status:201,headers});
 }catch{return Response.json({error:"Your comment could not be saved. Your text is still here; please try again."},{status:503,headers});}
}
