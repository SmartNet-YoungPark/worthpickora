import "server-only";
export async function promotionRpc(name:string,body:object={}){
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error("Supabase is required for scheduled verification.");
 const headers:Record<string,string>={apikey:key,"Content-Type":"application/json"};if(!key.startsWith("sb_secret_"))headers.Authorization="Bearer "+key;
 const r=await fetch(new URL('/rest/v1/rpc/'+name,url),{method:"POST",headers,body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error("Promotion scheduler unavailable. Check its Supabase migration and connection.");return r.json();
}
