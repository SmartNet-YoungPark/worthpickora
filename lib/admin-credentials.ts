import "server-only";
import {readFile,writeFile,mkdir,rename} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {randomUUID} from "node:crypto";
import {validPasswordHash} from "./admin-security";
const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const file=process.env.CATALOG_DATA_FILE?process.env.CATALOG_DATA_FILE+".credentials.json":resolve(".data/admin-credentials.json");
const state=globalThis as typeof globalThis & {credentialQueue?:Promise<unknown>};
async function database(path:string,method="GET",body?:object){
  const headers:Record<string,string>={apikey:key!,"Content-Type":"application/json"};
  if(!key!.startsWith("sb_secret_"))headers.Authorization="Bearer "+key;
  return fetch(new URL("/rest/v1/"+path,url),{method,headers,body:body?JSON.stringify(body):undefined,cache:"no-store",signal:AbortSignal.timeout(5000)});
}
export async function storedAdminHash():Promise<string|null>{
  if(url&&key){
    const response=await database("admin_credentials?id=eq.1&select=password_hash");
    if(!response.ok){
      const error=await response.json().catch(()=>null);
      // Before initial setup only, the existing environment PIN remains usable.
      if(error?.code==="PGRST205")return null;
      throw new Error("Administrator credentials are unavailable.");
    }
    const rows=await response.json();
    if(!rows.length)return null;
    if(!validPasswordHash(rows[0].password_hash))throw new Error("Invalid administrator credentials.");
    return rows[0].password_hash;
  }
  if(process.env.VERCEL)return null;
  try{const value=JSON.parse(await readFile(file,"utf8"));if(!validPasswordHash(value.passwordHash))throw new Error("Invalid administrator credentials.");return value.passwordHash;}
  catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
}
export async function replaceAdminHash(expected:string,replacement:string){
  if(!validPasswordHash(expected)||!validPasswordHash(replacement))throw new Error("Invalid PIN hash.");
  if(url&&key){
    const response=await database("rpc/admin_change_password","POST",{p_expected:expected,p_new:replacement});
    if(!response.ok)throw new Error("Could not change the PIN. Apply 20260925010000_admin_credentials.sql in Supabase and check the connection.");
    if(await response.json()!==true)throw new Error("The PIN changed in another session. Sign in again.");
    return;
  }
  if(process.env.VERCEL)throw new Error("Configure Supabase to save a changed PIN.");
  const operation=(state.credentialQueue||Promise.resolve()).then(async()=>{
    const current=await storedAdminHash()||process.env.ADMIN_PASSWORD_HASH||"";
    if(current!==expected)throw new Error("The PIN changed in another session. Sign in again.");
    await mkdir(dirname(file),{recursive:true});const temporary=file+"."+randomUUID()+".tmp";
    await writeFile(temporary,JSON.stringify({passwordHash:replacement}),{mode:0o600});await rename(temporary,file);
  });state.credentialQueue=operation.catch(()=>{});await operation;
}
