import "server-only";
import {readFile,writeFile,mkdir,rename} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {randomUUID} from "node:crypto";
import {rpc} from "./server-click-analytics";
import {torontoDate} from "./click-analytics";
export type PageViewRow={view_date:string;source:string;device:string;views:number};
type Event={event_id:string;view_date:string;source:string;device:string};
const remote=!!((process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL)&&(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY));
const file=(process.env.ANALYTICS_DATA_FILE||process.env.CATALOG_DATA_FILE||resolve(".data","analytics"))+".pageviews.json";
const state=globalThis as typeof globalThis & {pageViewQueue?:Promise<unknown>};
async function read():Promise<Event[]>{try{return JSON.parse(await readFile(file,"utf8"));}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return [];throw error;}}
export async function recordPageView(id:string,source:string,device:string){
 if(remote)return rpc("landing_page_view_record",{p_event_id:id,p_source:source,p_device:device});
 if(process.env.VERCEL)throw new Error("Page view storage is unavailable.");
 const task=(state.pageViewQueue||Promise.resolve()).then(async()=>{
  const events=await read();if(events.some(e=>e.event_id===id))return;
  events.push({event_id:id,view_date:torontoDate(),source,device});
  await mkdir(dirname(file),{recursive:true});const temp=file+"."+randomUUID()+".tmp";
  await writeFile(temp,JSON.stringify(events),{mode:0o600});await rename(temp,file);
 });state.pageViewQueue=task.catch(()=>{});await task;
}
export async function pageViewReport(start:string,end:string):Promise<PageViewRow[]>{
 if(remote)return rpc("landing_page_view_report",{p_start:start,p_end:end});
 if(process.env.VERCEL)throw new Error("Page view storage is unavailable.");
 await state.pageViewQueue;
 const rows=new Map<string,PageViewRow>();
 for(const e of await read()){if(e.view_date<start||e.view_date>end)continue;const k=JSON.stringify([e.view_date,e.source,e.device]);const r=rows.get(k);if(r)r.views++;else rows.set(k,{view_date:e.view_date,source:e.source,device:e.device,views:1});}
 return [...rows.values()];
}
