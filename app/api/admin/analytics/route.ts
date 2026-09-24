import {NextRequest} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {clickReport,deleteClickReport} from "@/lib/server-click-analytics";
import {validRange,shiftDate,calendarRange,PERIODS,type Period} from "@/lib/click-analytics";
import {adminCatalog} from "@/lib/server-catalog";
import {STORES} from "@/lib/catalog";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  const headers={"Cache-Control":"no-store, private"};
  if(!await isAdmin())return Response.json({error:"Sign in to view analytics."},{status:401,headers});
  const start=request.nextUrl.searchParams.get("start")||"",end=request.nextUrl.searchParams.get("end")||"";
  if(!validRange(start,end))return Response.json({error:"Choose a valid date range of up to 366 days."},{status:400,headers});
  const days=Math.round((Date.parse(end)-Date.parse(start))/86400000)+1;
  try{
    const [rows,catalog]=await Promise.all([clickReport(shiftDate(start,-days),end),adminCatalog()]);
    const stores=[...new Set([...STORES,...catalog.products.map(p=>p.store),...rows.map(row=>row.store_name)])].sort();
    const categories=[...new Set([...catalog.categories,...rows.map(row=>row.category_name)])].sort();
    return Response.json({rows,stores,categories,timezone:"America/Toronto"},{headers});
  }
  catch(error){return Response.json({error:error instanceof Error?error.message:"Could not load analytics."},{status:503,headers});}
}
export async function DELETE(request:NextRequest){
  const headers={"Cache-Control":"no-store, private"};
  if(request.headers.get("origin")!==request.nextUrl.origin)return Response.json({error:"Forbidden"},{status:403,headers});
  if(!await isAdmin())return Response.json({error:"Sign in to delete analytics."},{status:401,headers});
  let body;
  try{body=await request.json();}catch{return Response.json({error:"Invalid request."},{status:400,headers});}
  if(!body||!PERIODS.includes(body.period)||typeof body.date!=="string"||!validRange(body.date,body.date)||body.confirmed!==true)return Response.json({error:"Choose a valid date and interval and confirm deletion."},{status:400,headers});
  const range=calendarRange(body.date,body.period as Period);
  if(body.start!==range.start||body.end!==range.end)return Response.json({error:"Deletion dates changed. Review the period and confirm again."},{status:400,headers});
  try{return Response.json({...await deleteClickReport(range.start,range.end),...range},{headers});}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Deletion failed. Refresh analytics to check current data before retrying."},{status:503,headers});}
}
