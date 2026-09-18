import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("private upload staging validates parts, expiry, retries and permissions",async()=>{
  const db=new PGlite();
  try{
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema private;");
    await db.exec(await readFile(new URL("../supabase/migrations/20260918010903_catalog_uploads.sql",import.meta.url),"utf8"));
    for(const role of ["anon","authenticated"]){
      await db.exec("set role "+role);
      await assert.rejects(db.query("select public.catalog_upload_start(1,2)"),{code:"42501"});
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    const bytes=Buffer.from(JSON.stringify({name:"한글 😀",image:"a".repeat(1200000)}));
    const id=(await db.query("select public.catalog_upload_start($1,$2) as id",[Math.ceil(bytes.length/1048576),bytes.length])).rows[0].id;
    await assert.rejects(db.query("select public.catalog_upload_read($1)",[id]),/UPLOAD_INCOMPLETE/);
    const part=bytes.subarray(0,1048576).toString("base64");
    await db.query("select public.catalog_upload_part($1,0,$2)",[id,part]);
    await db.query("select public.catalog_upload_part($1,0,$2)",[id,part]);
    await assert.rejects(db.query("select public.catalog_upload_part($1,0,$2)",[id,Buffer.alloc(1048576).toString("base64")]),/UPLOAD_PART_CHANGED/);
    await assert.rejects(db.query("select public.catalog_upload_part($1,1,'YQ==')",[id]),/UPLOAD_INVALID_SIZE/);
    await db.query("select public.catalog_upload_part($1,1,$2)",[id,bytes.subarray(1048576).toString("base64")]);
    assert.deepEqual((await db.query("select public.catalog_upload_read($1) as data",[id])).rows[0].data,JSON.parse(bytes));
    await db.query("select public.catalog_upload_remove($1)",[id]);
    await assert.rejects(db.query("select public.catalog_upload_read($1)",[id]),/UPLOAD_EXPIRED/);
    const expired=(await db.query("select public.catalog_upload_start(1,2) as id")).rows[0].id;
    await db.exec("reset role");
    await db.query("update private.catalog_uploads set expires_at=now()-interval '1 second' where id=$1",[expired]);
    await db.exec("set role service_role");
    await assert.rejects(db.query("select public.catalog_upload_read($1)",[expired]),/UPLOAD_EXPIRED/);
    await assert.rejects(db.query("select public.catalog_upload_start(65,68157440)"));
  }finally{await db.close();}
});
