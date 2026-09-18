import test from "node:test";
import assert from "node:assert/strict";
import { createSupabaseCatalogStorage } from "../lib/supabase-catalog-storage.ts";

test("Supabase adapter sends only explicit changed rows and deleted IDs", async()=>{
  const previous={products:[{id:"keep",name:"Keep"},{id:"delete",name:"Delete"}],categories:["Tech"],revision:"old",persisted:true};
  const calls=[];
  const transport=async(url,options)=>{
    calls.push({url:String(url),...options});
    return Response.json(calls.length===1 ? previous : {...previous,revision:"new"});
  };
  const storage=createSupabaseCatalogStorage("https://example.supabase.co","sb_secret_test",transport);
  await storage.write([previous.products[0]],"old",previous.categories);
  assert.equal(calls[1].url,"https://example.supabase.co/rest/v1/rpc/catalog_apply");
  assert.deepEqual(JSON.parse(calls[1].body),{p_upserts:[],p_delete_ids:["delete"],p_categories:["Tech"],p_remove_categories:[],p_revision:"old"});
  assert.equal(calls[0].headers.apikey,"sb_secret_test");
  assert.equal(calls[0].headers.Authorization,undefined);
});
test("Supabase adapter rejects stale snapshots before mutation",async()=>{
  let calls=0;
  const storage=createSupabaseCatalogStorage("https://example.supabase.co","legacy.jwt.key",async()=>{
    calls++;
    return Response.json({products:[],categories:["Tech"],revision:"new",persisted:true});
  });
  await assert.rejects(storage.write([],"old",["Tech"]),{code:"CATALOG_CONFLICT"});
  assert.equal(calls,1);
});
test("Supabase adapter does not leak raw provider error details",async()=>{
  const storage=createSupabaseCatalogStorage("https://example.supabase.co","sb_secret_test",async()=>Response.json({message:"sensitive provider details"},{status:403}));
  await assert.rejects(storage.read(),error=>error.code==="CATALOG_STORAGE"&&!error.message.includes("sensitive provider details"));
});

