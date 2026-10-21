import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {clickMarket} from '../lib/click-attribution.ts';
test('visitor market preserves unknown and other countries',()=>{
 for(const [input,want] of [['US','US'],['ca','CA'],['GB','Other'],[null,'Unknown'],['XX','Unknown'],['','Unknown']])assert.equal(clickMarket(input),want);
});
test('market migration preserves historical counts and legacy clients; separates new US and CA clicks',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon; create role authenticated; create role service_role; create table categories(id int,name text);create table stores(id int,name text);create table product_sets(id int,category_id int,set_number int);create table products(id text,code text,name text,url text,set_id int,store_id int,status text);insert into categories values(1,'Home');insert into stores values(1,'Amazon');insert into product_sets values(1,1,1);insert into products values('p1','P001','Product','https://amazon.com/dp/B000000001',1,1,'Published');");
 for(const file of ['20260919010000_product_click_analytics.sql','20260920010000_click_source_device.sql'])await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 await db.query("select product_click_outbound_attributed('p1',true,'Google','Mobile')");
 const sql=await readFile('supabase/migrations/20261021010000_click_market.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.query("select product_click_outbound_market('p1',true,'Google','Mobile','US')");
 await db.query("select product_click_outbound_market('p1',true,'Google','Mobile','CA')");
 await db.query("select product_click_outbound_market('p1',true,'Google','Mobile','CA')");
 await db.query("select product_click_outbound_market('p1',false,'Google','Mobile','US')");
 await db.query("select product_click_outbound_attributed('p1',true,'Google','Mobile')");
 const rows=(await db.query('select market,clicks from product_click_daily order by market')).rows;
 assert.deepEqual(rows.map(r=>[r.market,Number(r.clicks)]),[['CA',2],['US',1],['Unknown',2]]);
 const report=(await db.query("select product_click_report(current_date-1,current_date+1) data")).rows[0].data;assert.equal(report.length,3);
 await db.exec('set role anon');await assert.rejects(db.query("select product_click_outbound_market('p1',true,'Google','Mobile','US')"));
 }finally{await db.close();}
});
