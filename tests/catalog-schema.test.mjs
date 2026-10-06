import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("catalog schema, capacity, relations and authorization", async t => {
  const db = new PGlite();
  const admin = "00000000-0000-0000-0000-000000000001";
  const user = "00000000-0000-0000-0000-000000000002";
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;
    `);
    for (const file of ["20260917000100_create_profiles.sql","20260918003102_create_catalog.sql","20260918004315_catalog_bridge.sql","20260918012856_catalog_import_performance.sql","20260918014410_catalog_image_reads.sql","20260918015358_catalog_metadata_writes.sql","20260919010000_product_click_analytics.sql","20261005010000_product_regional_links.sql"]) {
      await db.exec(await readFile(new URL("../supabase/migrations/" + file, import.meta.url),"utf8"));
    }
    await db.query("insert into auth.users values ($1,'{}'),($2,'{}')",[admin,user]);
    await db.query("update public.profiles set role='Admin' where id=$1",[admin]);
    const category = (await db.query("select id from public.categories where name='Tech'")).rows[0].id;
    const store = (await db.query("select id from public.stores where name='Amazon'")).rows[0].id;
    const sets = (await db.query("insert into public.product_sets(category_id,set_number) values ($1,1),($1,2),($1,3) returning id",[category])).rows.map(r=>r.id);
    async function product(id, set=sets[0], status="Published", code=id) {
      return db.query("insert into public.products(id,set_id,store_id,name,code,url,status) values ($1,$2,$3,'Product',$4,'https://example.com/product',$5)",[id,set,store,code,status]);
    }
    await t.test("anonymous can read lookup data but cannot mutate catalog",async()=>{
      await db.exec("set role anon");
      assert.equal((await db.query("select * from public.categories")).rows.length,11);
      assert.equal((await db.query("select * from public.stores")).rows.length,6);
      await assert.rejects(db.query("insert into public.categories(name) values ('Unauthorized')"),{code:"42501"});
      assert.equal((await db.query("select * from public.product_sets")).rows.length,0);
      await db.exec("reset role");
    });
    await t.test("Admin can create products; normal users cannot",async()=>{
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false)`);
      await assert.rejects(product("X1"),{code:"42501"});
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
      await product("P1");
      await product("D1",sets[1],"Draft");
      await db.exec("reset role");
    });
    await t.test("public sees only published products and nonempty published sets",async()=>{
      await db.exec("set role anon");
      assert.deepEqual((await db.query("select id from public.products")).rows,[{id:"P1"}]);
      assert.equal((await db.query("select id from public.product_sets")).rows.length,1);
      await db.exec("reset role");
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false)`);
      assert.equal((await db.query("update public.products set name='No' returning id")).rows.length,0);
      assert.equal((await db.query("delete from public.products returning id")).rows.length,0);
      await assert.rejects(db.query("update public.profiles set role='Admin' where id=$1",[user]),{code:"42501"});
      await db.exec("reset role");
    });
    await t.test("same-set code uniqueness is case insensitive; other sets may reuse codes",async()=>{
      await assert.rejects(product("P2",sets[0],"Published","p1"),{code:"23505"});
      await product("P2",sets[1],"Published","p1");
      await assert.rejects(db.query("insert into public.product_sets(category_id,set_number) values ($1,1)",[category]),{code:"23505"});
    });
    await t.test("eleventh product and moving to a full set fail, including drafts",async()=>{
      for(let i=3;i<=11;i++) await product("P"+i,sets[0],"Draft");
      await assert.rejects(product("P12"),{code:"23514"});
      await assert.rejects(db.query("update public.products set set_id=$1 where id='D1'",[sets[0]]),{code:"23514"});
      await db.query("update public.products set name='Edited' where id='P1'");
      assert.equal((await db.query("select count(*)::int as n from public.products where set_id=$1",[sets[0]])).rows[0].n,10);
    });
    await t.test("hard deletion frees a slot and populated sets/categories cannot be accidentally removed",async()=>{
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false)`);
      await db.query("delete from public.products where id='P11'");
      await product("P12");
      await assert.rejects(db.query("delete from public.product_sets where id=$1",[sets[0]]),e=>["23001","23503"].includes(e.code));
      await assert.rejects(db.query("delete from public.categories where id=$1",[category]),e=>["23001","23503"].includes(e.code));
      await db.query("update public.categories set name='Tech Updated' where id=$1",[category]);
      await db.query("delete from public.product_sets where id=$1",[sets[2]]);
      await db.exec("reset role");
    });
    await t.test("actual image data is retained, arbitrary image codes rejected",async()=>{
      const image="data:image/png;base64,iVBORw0KGgo=";
      await db.query("update public.products set image=$1 where id='P1'",[image]);
      assert.equal((await db.query("select image from public.products where id='P1'")).rows[0].image,image);
      assert.equal((await db.query("select image_digest=md5(image) as valid from public.products where id='P1'")).rows[0].valid,true);
      const full=(await db.query("select public.catalog_snapshot() as data")).rows[0].data;
      const metadata=(await db.query("select public.catalog_snapshot_metadata() as data")).rows[0].data;
      assert.equal(metadata.revision,full.revision);
      assert.equal(metadata.products.find(p=>p.id==='P1').image,'');
      assert.equal(metadata.products.find(p=>p.id==='P1').image_embedded,true);
      assert.ok(!JSON.stringify(metadata).includes('base64'));
      assert.deepEqual((await db.query("select public.catalog_product_image('P1') as data")).rows[0].data,{id:'P1',image,status:'Published'});
      assert.equal((await db.query("select public.catalog_product_image('missing') as data")).rows[0].data,null);
      await assert.rejects(db.query("update public.products set image='T001' where id='P1'"),{code:"23514"});
    });
    await t.test("publishing preserves image bytes without including them in save input or output",async()=>{
      const snapshot=async()=>(await db.query("select public.catalog_snapshot_metadata() as data")).rows[0].data;
      const initial=await snapshot();
      const product=initial.products.find(p=>p.id==='P1');
      const original=(await db.query("select image from public.products where id='P1'")).rows[0].image;
      const fields={...product}; delete fields.image; delete fields.image_embedded;
      const write=async(p,revision)=>(await db.query("select public.catalog_apply_metadata($1,'[]',$2,'[]',$3) as data",[JSON.stringify([p]),JSON.stringify(initial.categories),revision])).rows[0].data;
      const saved=await write({...fields,status:'Draft'},initial.revision);
      assert.equal(saved.products.find(p=>p.id==='P1').status,'Draft');
      assert.ok(!JSON.stringify(saved).includes('base64'));
      assert.equal((await db.query("select image from public.products where id='P1'")).rows[0].image,original);
      await assert.rejects(write({...fields,status:'Published'},initial.revision),{code:'40001'});
      const published=await write({...fields,status:'Published'},saved.revision);
      assert.equal((await db.query("select image from public.products where id='P1'")).rows[0].image,original);
      const cleared=await write({...fields,image:''},published.revision);
      assert.equal((await db.query("select image from public.products where id='P1'")).rows[0].image,'');
      await write({...fields,image:original},cleared.revision);
    });
    await t.test("regional URLs survive metadata edits and legacy updates",async()=>{
      const snapshot=async()=>(await db.query('select public.catalog_snapshot_metadata() data')).rows[0].data;
      const initial=await snapshot(),p=initial.products.find(p=>p.id==='P1');
      const write=async(product,revision)=>(await db.query("select public.catalog_apply_metadata($1,'[]',$2,'[]',$3) data",[JSON.stringify([product]),JSON.stringify(initial.categories),revision])).rows[0].data;
      const urls={urlUS:'https://www.amazon.com/dp/B012345678',urlCA:'https://www.amazon.ca/dp/B087654321'};
      const saved=await write({...p,...urls},initial.revision);
      assert.equal(saved.products.find(p=>p.id==='P1').urlCA,urls.urlCA);
      const legacy={...p};delete legacy.urlUS;delete legacy.urlCA;
      const preserved=await write(legacy,saved.revision);assert.equal(preserved.products.find(p=>p.id==='P1').urlUS,urls.urlUS);
    });
    await t.test("daily clicks accumulate, test clicks and drafts are excluded, and browser roles cannot forge analytics",async()=>{
      const click=async(id,count)=>(await db.query('select public.product_click_outbound($1,$2) as url',[id,count])).rows[0].url;
      assert.equal(await click('P1',true),'https://example.com/product');
      await click('P1',true);await click('P1',false);
      assert.equal(await click('D1',true),null);
      const rows=(await db.query('select * from public.product_click_daily')).rows;
      assert.equal(rows.length,1);assert.equal(Number(rows[0].clicks),2);
      assert.equal(rows[0].set_name,'Tech Updated Set 1');
      assert.equal(rows[0].store_name,'Amazon');
      for(const role of ['anon','authenticated']){
        await db.exec('set role '+role);
        await assert.rejects(click('P1',true),{code:'42501'});
        await assert.rejects(db.query('select * from public.product_click_daily'),{code:'42501'});
        await assert.rejects(db.query("select public.product_click_report(current_date,current_date)"),{code:'42501'});
        await db.exec('reset role');
      }
      await db.exec('set role service_role');
      const report=(await db.query("select public.product_click_report(current_date-1,current_date+1) as data")).rows[0].data;
      assert.equal(report.length,1);assert.equal(report[0].clicks,2);
      await db.exec('reset role');
    });
    await t.test("source migration preserves totals and splits new clicks by source and device",async()=>{
      await db.exec(await readFile(new URL('../supabase/migrations/20260920010000_click_source_device.sql',import.meta.url),'utf8'));
      const old=(await db.query('select * from public.product_click_daily')).rows[0];
      assert.equal(Number(old.clicks),2);assert.equal(old.source,'Unknown');assert.equal(old.device,'Unknown');
      const click=(source,device,count=true)=>db.query('select public.product_click_outbound_attributed($1,$2,$3,$4)',['P1',count,source,device]);
      await click('YouTube','Mobile');await click('YouTube','Mobile');await click('TikTok','PC');await click('TikTok','PC',false);
      const rows=(await db.query('select source,device,clicks from public.product_click_daily')).rows;
      assert.equal(rows.length,3);assert.equal(Number(rows.find(r=>r.source==='YouTube').clicks),2);
      assert.equal(rows.reduce((sum,r)=>sum+Number(r.clicks),0),5);
      await db.exec('set role anon');await assert.rejects(click('YouTube','PC'),{code:'42501'});await db.exec('reset role');
    });
    await t.test("only the save function receives the longer timeout",async()=>{
      const {rows}=await db.query("select proconfig from pg_proc where oid='public.catalog_apply(jsonb,jsonb,jsonb,jsonb,text)'::regprocedure");
      assert.ok(rows[0].proconfig.includes("statement_timeout=45s"));
    });
    await t.test("trusted backend can operate catalog without a Supabase user session",async()=>{
      await db.exec("set role service_role");
      await db.query("update public.products set status='Archived' where id='P1'");
      assert.equal((await db.query("select status from public.products where id='P1'")).rows[0].status,"Archived");
      await db.exec("reset role");
    });
    await t.test("catalog RPCs deny browsers, preserve edits atomically, detect conflicts and keep deletions",async()=>{
      for (const role of ["anon","authenticated"]) {
        await db.exec(`set role ${role}`);
        await assert.rejects(db.query("select public.catalog_snapshot()"),{code:"42501"});
        await assert.rejects(db.query("select public.catalog_snapshot_metadata()"),{code:"42501"});
        await assert.rejects(db.query("select public.catalog_product_image('P1')"),{code:"42501"});
        await assert.rejects(db.query("select public.catalog_apply('[]','[]','[]','[]','x')"),{code:"42501"});
        await assert.rejects(db.query("select public.catalog_apply_metadata('[]','[]','[]','[]','x')"),{code:"42501"});
        await db.exec("reset role");
      }
      await db.exec("set role service_role");
      const snapshot = async()=> (await db.query("select public.catalog_snapshot() as data")).rows[0].data;
      const initial = await snapshot();
      const changed = initial.products.map(p=>({...p,name:p.id === "P1" ? "RPC updated" : p.name}));
      const write = async(products,categories,revision,deletedIds=[])=>db.query("select public.catalog_apply($1,$2,$3,'[]',$4) as data",[JSON.stringify(products),JSON.stringify(deletedIds),JSON.stringify(categories),revision]);
      const saved = (await write(changed,initial.categories,initial.revision)).rows[0].data;
      assert.notEqual(saved.revision,initial.revision);
      assert.equal(saved.products.find(p=>p.id === "P1").name,"RPC updated");
      await assert.rejects(write([],initial.categories,initial.revision),{code:"40001"});
      const invalid = [...saved.products,{...saved.products[0],id:"Invalid",url:"javascript:bad"}];
      await assert.rejects(write(invalid,saved.categories,saved.revision));
      assert.deepEqual(await snapshot(),saved,"failed replacement rolls back all deleted products");
      const after = (await write([],saved.categories,saved.revision,["P1"])).rows[0].data;
      assert.ok(!after.products.some(p=>p.id === "P1"));
      const kept = (await write([],after.categories,after.revision)).rows[0].data;
      assert.equal(kept.products.length,after.products.length,"omitting rows must never delete them");
      const empty = (await write([],kept.categories,kept.revision,kept.products.map(p=>p.id))).rows[0].data;
      assert.equal(empty.products.length,0);
      assert.equal((await snapshot()).persisted,true,"empty DB must never restore starter products");
      await db.exec("reset role");
    });
  } finally { await db.close(); }
});
