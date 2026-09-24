import test from "node:test";
import assert from "node:assert/strict";
import { createSupabaseCatalogStorage } from "../lib/supabase-catalog-storage.ts";
test('missing options migration blocks writes instead of silently discarding options',async()=>{
  let calls=0;
  const storage=createSupabaseCatalogStorage('https://example.supabase.co','sb_secret_test',async()=>{calls++;return Response.json({products:[],categories:['Tech'],revision:'old',persisted:true});});
  await assert.rejects(storage.write([{id:'one',options:'Color: Black'}],'old',['Tech']),/20260924040000_product_options.sql/);
  assert.equal(calls,1);
});

test("image and metadata reads avoid fetching the full catalog",async()=>{
  const calls=[];
  const storage=createSupabaseCatalogStorage("https://example.supabase.co","sb_secret_test",async(url,options)=>{
    const name=new URL(url).pathname.split('/').pop();
    calls.push(name);
    if(name==='catalog_snapshot_metadata') return Response.json({products:[{id:'draft',image:'',image_embedded:true,status:'Draft'},{id:'external',image:'https://example.com/image.png',image_embedded:false}],categories:['Tech'],revision:'rev',persisted:true});
    assert.equal(name,'catalog_product_image');
    const {p_id}=JSON.parse(options.body);
    return Response.json(p_id==='missing'?null:{id:p_id,image:'data:image/png;base64,abc',status:'Draft'});
  });
  const metadata=await storage.readMetadata();
  assert.equal(metadata.products[0].image,'/api/products/draft/image?scope=admin&v=rev');
  assert.equal(metadata.products[0].status,'Draft');
  assert.equal(metadata.products[0].image_embedded,undefined);
  assert.equal(metadata.products[1].image,'https://example.com/image.png');
  assert.equal((await storage.readImage('draft')).image,'data:image/png;base64,abc');
  assert.equal(await storage.readImage('missing'),null);
  assert.deepEqual(calls,['catalog_snapshot_metadata','catalog_product_image','catalog_product_image']);
});

test("Supabase adapter sends only explicit changed rows and deleted IDs", async()=>{
  const previous={products:[{id:"keep",name:"Keep"},{id:"delete",name:"Delete"}],categories:["Tech"],revision:"old",persisted:true};
  const calls=[];
  const transport=async(url,options)=>{
    calls.push({url:String(url),...options});
    return Response.json(calls.length===1 ? previous : {...previous,revision:"new"});
  };
  const storage=createSupabaseCatalogStorage("https://example.supabase.co","sb_secret_test",transport);
  await storage.write([previous.products[0]],"old",previous.categories);
  assert.equal(calls[1].url,"https://example.supabase.co/rest/v1/rpc/catalog_apply_metadata");
  assert.deepEqual(JSON.parse(calls[1].body),{p_upserts:[],p_delete_ids:["delete"],p_categories:["Tech"],p_remove_categories:[],p_revision:"old"});
  assert.equal(calls[0].headers.apikey,"sb_secret_test");
  assert.equal(calls[0].headers.Authorization,undefined);
});
test("publishing sends no unchanged image bytes and returns refreshed image references",async()=>{
  const product={id:'one',name:'One',status:'Draft',image:'',image_embedded:true};
  const calls=[];
  const storage=createSupabaseCatalogStorage('https://example.supabase.co','sb_secret_test',async(url,options)=>{
    const name=new URL(url).pathname.split('/').pop();calls.push(name);
    if(name==='catalog_snapshot_metadata')return Response.json({products:[product],categories:['Tech'],revision:'old',persisted:true});
    assert.equal(name,'catalog_apply_metadata');
    const payload=JSON.parse(options.body);
    assert.equal(payload.p_upserts[0].status,'Published');
    assert.equal(Object.hasOwn(payload.p_upserts[0],'image'),false);
    return Response.json({products:[{...product,status:'Published'}],categories:['Tech'],revision:'new',persisted:true});
  });
  const current=await storage.read();
  const saved=await storage.write(current.products.map(p=>({...p,status:'Published'})),current.revision,current.categories);
  assert.equal(saved.products[0].image,'/api/products/one/image?scope=admin&v=new');
  assert.ok(!calls.includes('catalog_snapshot'));
  assert.equal(saved.products[0].image_embedded,undefined);
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
test("Supabase error reports operation and safe diagnostic code without provider data",async()=>{
  const storage=createSupabaseCatalogStorage("https://example.supabase.co","sb_secret_test",async()=>Response.json({code:"57014",message:"private query contents"},{status:500}));
  await assert.rejects(storage.read(),error=>/timed out/.test(error.message)&&/catalog_snapshot_metadata: HTTP 500, code 57014/.test(error.message)&&!error.message.includes("private query contents"));
});
