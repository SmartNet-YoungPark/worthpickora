import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('restore deleted totals once without inventing product history; new clicks continue accumulating',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create role service_role;create table public.product_click_daily(store_name text,clicks bigint);insert into public.product_click_daily values('Amazon',35);");
 const sql=await readFile('supabase/migrations/20261013020000_restore_deleted_click_totals.sql','utf8');
 await db.exec(sql);await db.exec(sql);
 const total=async()=>Number((await db.query('select sum(clicks) as n from product_click_store_totals()')).rows[0].n);
 assert.equal(await total(),911);
 assert.equal(Number((await db.query('select sum(clicks) as n from product_click_daily')).rows[0].n),35);
 await db.exec("update product_click_daily set clicks=36");assert.equal(await total(),912);
 await db.exec('set role anon');await assert.rejects(db.query('select * from product_click_history_adjustments'));await assert.rejects(db.query('select * from product_click_store_totals()'));
 }finally{await db.close();}
});
