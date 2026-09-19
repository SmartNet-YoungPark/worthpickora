import {NextRequest} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {clickReport} from "@/lib/server-click-analytics";
import {validRange,shiftDate} from "@/lib/click-analytics";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  const headers={"Cache-Control":"no-store, private"};
  if(!await isAdmin())return Response.json({error:"Sign in to view analytics."},{status:401,headers});
  const start=request.nextUrl.searchParams.get("start")||"",end=request.nextUrl.searchParams.get("end")||"";
  if(!validRange(start,end))return Response.json({error:"Choose a valid date range of up to 366 days."},{status:400,headers});
  const days=Math.round((Date.parse(end)-Date.parse(start))/86400000)+1;
  try{return Response.json({rows:await clickReport(shiftDate(start,-days),end),timezone:"America/Toronto"},{headers});}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Could not load analytics."},{status:503,headers});}
}

