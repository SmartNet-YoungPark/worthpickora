const PART_BYTES = 1024 * 1024;
export const DIRECT_SAVE_LIMIT = 2 * 1024 * 1024;
export const MAX_CATALOG_BYTES = 64 * 1024 * 1024;
function base64(bytes: Uint8Array) {
  let binary = "";
  for(let offset=0;offset<bytes.length;offset+=8192) binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  return btoa(binary);
}
export async function sendCatalogPayload(payload: string, transport: typeof fetch = fetch, progress?: (percent: number) => void): Promise<Response> {
  const bytes=new TextEncoder().encode(payload);
  if(bytes.length>MAX_CATALOG_BYTES) throw new Error("The catalog exceeds 64 MB, including images.");
  if(bytes.length<=DIRECT_SAVE_LIMIT) return transport("/api/catalog",{
    method:"PUT",headers:{"Content-Type":"application/json"},body:payload,cache:"no-store",
  });
  const post=(data: object)=>transport("/api/catalog/upload",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),cache:"no-store",
  });
  async function result(response: Response) {
    const data=await response.json().catch(()=>null);
    if(!response.ok) throw new Error(data?.error || `Image upload failed (HTTP ${response.status}). No catalog changes were confirmed.`);
    return data;
  }
  const parts=Math.ceil(bytes.length/PART_BYTES);
  const {id}=await result(await post({action:"start",parts,bytes:bytes.length}));
  let completed=false;
  try {
    progress?.(0);
    for(let index=0;index<parts;index++) {
      await result(await post({action:"part",id,index,data:base64(bytes.subarray(index*PART_BYTES,(index+1)*PART_BYTES))}));
      progress?.(Math.round((index+1)/parts*100));
    }
    const response=await post({action:"complete",id});
    completed=true;
    return response;
  } finally {
    if(!completed) await post({action:"abort",id}).catch(()=>{});
  }
}

