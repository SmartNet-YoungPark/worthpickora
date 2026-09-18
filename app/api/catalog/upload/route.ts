import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { catalogUploads } from "@/lib/catalog-uploads";
import { saveCatalogPayload } from "@/lib/catalog-save";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store, private" };
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({error:"Forbidden"},{status:403,headers});
  if (!await isAdmin()) return Response.json({error:"Your administrator session expired. Sign in again before importing."},{status:401,headers});
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({error:"Expected JSON."},{status:415,headers});
  let data;
  try {
    const reader=request.body?.getReader();
    if(!reader) throw new Error("Missing body");
    const chunks: Uint8Array[]=[]; let size=0;
    while(true) {
      const {done,value}=await reader.read(); if(done) break;
      size+=value.byteLength;
      if(size>2*1024*1024) { await reader.cancel(); return Response.json({error:"Upload part is too large."},{status:413,headers}); }
      chunks.push(value);
    }
    data=JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return Response.json({error:"Invalid upload request."},{status:400,headers}); }
  try {
    if(data?.action==="start") {
      if(!Number.isInteger(data.bytes)||data.bytes<1||data.bytes>64*1024*1024||data.parts!==Math.ceil(data.bytes/(1024*1024))) return Response.json({error:"Catalog must be at most 64 MB."},{status:400,headers});
      return Response.json({id:await catalogUploads.start(data.parts,data.bytes)},{headers});
    }
    if(!data || typeof data.id!=="string" || !/^[0-9a-f-]{36}$/i.test(data.id)) return Response.json({error:"Invalid upload ID."},{status:400,headers});
    if(data.action==="part") {
      if(!Number.isInteger(data.index)||data.index<0||data.index>=64||typeof data.data!=="string"||data.data.length>1398104||!data.data.length||!/^[A-Za-z0-9+/]*={0,2}$/.test(data.data)) return Response.json({error:"Invalid upload part."},{status:400,headers});
      await catalogUploads.part(data.id,data.index,data.data);
      return Response.json({ok:true},{headers});
    }
    if(data.action==="complete") {
      const payload=await catalogUploads.read(data.id);
      const result=await saveCatalogPayload(payload);
      await catalogUploads.remove(data.id).catch(()=>{}); // Cleanup must never hide a committed save.
      return result;
    }
    if(data.action==="abort") {
      await catalogUploads.remove(data.id);
      return Response.json({ok:true},{headers});
    }
    return Response.json({error:"Unknown upload action."},{status:400,headers});
  } catch(error) {
    const known=error instanceof Error && "code" in error && error.code==="CATALOG_UPLOAD";
    return Response.json({error:known ? error.message : "Import could not finish. Refresh the catalog before retrying to check whether it was saved."},{status:500,headers});
  }
}

