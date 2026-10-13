import "server-only";
import {readFile,writeFile,mkdir,rename} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {randomUUID} from "node:crypto";
import {catalogStorage} from "./server-catalog";
import {torontoDate,validRange,type ClickRow} from "./click-analytics";
const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
export async function rpc(name:string,body:object){
  const headers:Record<string,string>={apikey:key!,"Content-Type":"application/json"};
  if(!key!.startsWith("sb_secret_"))headers.Authorization="Bearer "+key;
  const response=await fetch(new URL("/rest/v1/rpc/"+name,url),{method:"POST",headers,body:JSON.stringify(body),cache:"no-store"});
  if(!response.ok){
    const problem=await response.json().catch(()=>null);
    throw Object.assign(new Error("Click analytics is unavailable. Apply the analytics migrations and check the server connection."),{missingFunction:problem?.code==="PGRST202"});
  }
  return response.json();
}
const file=process.env.ANALYTICS_DATA_FILE||(process.env.CATALOG_DATA_FILE?process.env.CATALOG_DATA_FILE+".clicks.json":resolve(".data","clicks.json"));
const globalState=globalThis as typeof globalThis & {clickWriteQueue?:Promise<unknown>};
async function readLocal():Promise<ClickRow[]>{
  try{return JSON.parse(await readFile(file,"utf8"));}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return [];throw error;}
}
export async function outboundClick(id:string,count:boolean,source="Unknown",device="Unknown"):Promise<string|null>{
  if(url&&key){
    try{return await rpc("product_click_outbound_attributed",{p_id:id,p_count:count,p_source:source,p_device:device});}
    catch(error){
      if(error&&typeof error==="object"&&"missingFunction" in error&&error.missingFunction)return rpc("product_click_outbound",{p_id:id,p_count:count});
      throw error;
    }
  }
  if(process.env.VERCEL)throw new Error("Configure Supabase to record product clicks.");
  const product=(await catalogStorage.read()).products.find(p=>p.id===id&&p.status==="Published");
  if(!product)return null;
  if(count){
    const operation=(globalState.clickWriteQueue||Promise.resolve()).then(async()=>{
      const rows=await readLocal();const date=torontoDate();
      const row=rows.find(r=>r.product_id===id&&r.click_date===date&&(r.source||"Unknown")===source&&(r.device||"Unknown")===device);
      if(row)row.clicks++;else rows.push({click_date:date,product_id:id,product_code:product.code,product_name:product.name,category_name:product.category,set_name:product.category+" Set "+product.set,store_name:product.store,clicks:1,source,device});
      await mkdir(dirname(file),{recursive:true});const temp=file+"."+randomUUID()+".tmp";await writeFile(temp,JSON.stringify(rows),{mode:0o600});await rename(temp,file);
    });globalState.clickWriteQueue=operation.catch(()=>{});await operation;
  }
  return product.url;
}
export async function clickReport(start:string,end:string):Promise<ClickRow[]>{
  if(url&&key)return rpc("product_click_report",{p_start:start,p_end:end});
  if(process.env.VERCEL)throw new Error("Configure Supabase to read click analytics.");
  await globalState.clickWriteQueue;return (await readLocal()).filter(row=>row.click_date>=start&&row.click_date<=end);
}
export async function deleteClickReport(start:string,end:string):Promise<{records:number;clicks:number}>{
  if(!validRange(start,end))throw new Error("Invalid deletion range.");
  if(url&&key){
    try{return await rpc("product_click_delete_range",{p_start:start,p_end:end});}
    catch(error){if(error&&typeof error==="object"&&"missingFunction" in error&&error.missingFunction)throw new Error("Apply 20260924020000_analytics_delete.sql in Supabase to enable deletion.");throw error;}
  }
  if(process.env.VERCEL)throw new Error("Configure Supabase to delete click analytics.");
  const operation=(globalState.clickWriteQueue||Promise.resolve()).then(async()=>{
    const rows=await readLocal(),removed=rows.filter(row=>row.click_date>=start&&row.click_date<=end);
    const kept=rows.filter(row=>row.click_date<start||row.click_date>end);
    await mkdir(dirname(file),{recursive:true});const temp=file+"."+randomUUID()+".tmp";
    await writeFile(temp,JSON.stringify(kept),{mode:0o600});await rename(temp,file);
    return {records:removed.length,clicks:removed.reduce((sum,row)=>sum+Number(row.clicks),0)};
  });
  globalState.clickWriteQueue=operation.catch(()=>{});return operation;
}

// Public pages receive store totals only, never product-level or visitor records.
export async function storeClickTotals():Promise<Record<string,number>>{
 let rows:{store_name:string;clicks:number}[];
 if(url&&key)rows=await rpc("product_click_store_totals",{});
 else{
  if(process.env.VERCEL)throw new Error("Click totals are unavailable.");
  await globalState.clickWriteQueue;rows=await readLocal();
 }
 const totals:Record<string,number>=Object.create(null);
 for(const row of rows){const key=row.store_name.trim().toLowerCase();totals[key]=(totals[key]||0)+Number(row.clicks);}
 return Object.fromEntries(Object.entries(totals));
}
