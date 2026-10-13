import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {storeClickRankings} from '../lib/store-clicks.ts';
test('store rankings aggregate daily/source rows and keep identical IDs in separate stores',()=>{
 const row=(store,id,clicks,date='2026-10-13')=>({store_name:store,product_id:id,product_name:id,clicks,click_date:date});
 const rows=[row('Amazon','shared',4),row('amazon','shared',5),row('Walmart','shared',20),...Array.from({length:6},(_,i)=>row('Amazon','p'+i,i+1))];
 const [amazon,walmart,empty]=storeClickRankings(rows,['Amazon','Walmart','Temu']);
 assert.equal(amazon.total,30);assert.equal(amazon.products.length,5);assert.equal(amazon.products[0].clicks,9);assert.equal(walmart.total,20);assert.equal(empty.total,0);assert.deepEqual(empty.products,[]);
});
test('store totals return only grouped counts and require server access',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon; create role authenticated; create role service_role; create table product_click_daily(store_name text, clicks bigint); insert into product_click_daily values ('Amazon',5),('amazon',7),('Walmart',3);");
 await db.exec(await readFile('supabase/migrations/20261013010000_store_click_totals.sql','utf8'));
 const rows=(await db.query('select * from product_click_store_totals() order by store_name')).rows;
 assert.deepEqual(rows.map(x=>[x.store_name,Number(x.clicks)]),[['amazon',12],['walmart',3]]);
 await db.exec('set role anon');await assert.rejects(db.query('select * from product_click_store_totals()'));
 }finally{await db.close();}
});
