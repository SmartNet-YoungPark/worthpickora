import "server-only";

type Upload = { parts: number; bytes: number; expires: number; chunks: Map<number, Buffer> };
const state = globalThis as typeof globalThis & { catalogUploads?: Map<string, Upload> };
const local = state.catalogUploads ??= new Map<string, Upload>();
const PART = 1024 * 1024;
function failure(message: string) { return Object.assign(new Error(message), { code: "CATALOG_UPLOAD" }); }

async function rpc(name: string, body: object) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (process.env.VERCEL) throw failure("Configure Supabase catalog storage before importing products.");
    return undefined;
  }
  const headers: Record<string,string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(new URL("/rest/v1/rpc/" + name, url), {
    method: "POST", headers, body: JSON.stringify(body), cache: "no-store",
  });
  const data = await response.json().catch(()=>null);
  if (!response.ok) {
    if (data?.code === "PGRST202") throw failure("The large-import database migration is missing.");
    if (response.status === 401 || response.status === 403) throw failure("Supabase access was denied. Check the server secret key.");
    if (data?.message === "UPLOAD_INCOMPLETE") throw failure("Some upload parts are missing. Please select the file and import again.");
    if (data?.message === "UPLOAD_EXPIRED") throw failure("This upload expired. Please select the file and import again.");
    throw failure("The image upload could not be completed. No catalog changes were made. Please try again.");
  }
  return data;
}
function get(id: string) {
  const upload = local.get(id);
  if (!upload || upload.expires < Date.now()) { local.delete(id); throw failure("This upload expired. Please import again."); }
  return upload;
}
export const catalogUploads = {
  async start(parts: number, bytes: number): Promise<string> {
    const remote = await rpc("catalog_upload_start",{p_parts:parts,p_bytes:bytes});
    if (remote !== undefined) return remote as string;
    for (const [id,upload] of local) if(upload.expires < Date.now()) local.delete(id);
    if(local.size>=16) throw failure("Too many uploads. Please try again later.");
    const id=crypto.randomUUID();
    local.set(id,{parts,bytes,expires:Date.now()+3600000,chunks:new Map()});
    return id;
  },
  async part(id: string,index: number,data: string) {
    if (await rpc("catalog_upload_part",{p_id:id,p_index:index,p_data:data}) !== undefined) return;
    const upload=get(id);
    const bytes=Buffer.from(data,"base64");
    const expected=index===upload.parts-1 ? upload.bytes-index*PART : PART;
    if(index>=upload.parts || bytes.length!==expected) throw failure("Invalid upload part.");
    const previous=upload.chunks.get(index);
    if(previous && !previous.equals(bytes)) throw failure("Upload part changed. Please import again.");
    upload.chunks.set(index,bytes);
  },
  async read(id: string): Promise<unknown> {
    const remote=await rpc("catalog_upload_read",{p_id:id});
    if(remote!==undefined) return remote;
    const upload=get(id);
    if(upload.chunks.size!==upload.parts) throw failure("Some upload parts are missing. Please import again.");
    const bytes=Buffer.concat(Array.from({length:upload.parts},(_,index)=>upload.chunks.get(index)!));
    if(bytes.length!==upload.bytes) throw failure("Invalid upload size.");
    return JSON.parse(bytes.toString("utf8"));
  },
  async remove(id: string) {
    await rpc("catalog_upload_remove",{p_id:id});
    local.delete(id);
  },
};

