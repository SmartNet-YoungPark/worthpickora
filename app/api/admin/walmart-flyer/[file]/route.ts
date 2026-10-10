import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {isAdmin} from "@/lib/admin-auth";
import flyer from "@/lib/walmart-flyer.json";
export const runtime="nodejs";
const allowed=new Set(flyer.items.map(item=>item.imageFile));
export async function GET(_request:Request,{params}:{params:Promise<{file:string}>}){
 const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
 if(!await isAdmin())return new Response("Sign in required",{status:401,headers});
 const {file}=await params;if(!allowed.has(file))return new Response("Not found",{status:404,headers});
 try{const bytes=await readFile(join(process.cwd(),"assets","admin","walmart-flyer",file));return new Response(bytes,{headers:{...headers,"Content-Type":"image/jpeg","X-Content-Type-Options":"nosniff"}});}
 catch{return new Response("Flyer image unavailable",{status:404,headers});}
}
