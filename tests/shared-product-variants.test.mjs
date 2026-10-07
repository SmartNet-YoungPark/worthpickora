import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('shared variants separate pack sizes, verify identity, and calculate comparable units',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table deal_products(id text primary key,name text,brand_unused text);
 create table marketplace_offers(id text primary key,product_id text references deal_products(id),store text,market text,currency text,asin text,product_url text,affiliate_url text);
 create table promotions(id text primary key,regular_price numeric,sale_price numeric,promotion_type text,raw_promotion_text text,promo_code text,discount_amount numeric,discount_percent numeric,start_at timestamptz,end_at timestamptz,end_on date,status text,last_verified_at timestamptz);
 insert into deal_products(id,name) values('coke','Coca-Cola'),('butter','Butter');
 insert into marketplace_offers(id,product_id,store,market,currency) values('legacy','coke','Walmart','CA','CAD');`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261007020000_shared_product_variants.sql',import.meta.url),'utf8'));
 const legacy=(await db.query("select * from marketplace_offers where id='legacy'")).rows[0];
 assert.equal(legacy.variant_id,null);assert.equal(legacy.price_basis,'unknown');
 const variant=async(label,pack,ml)=> (await db.query(`insert into deal_product_variants(product_id,label,pack_count,unit_net_volume_ml,comparison_basis,verification_status,verification_source_url,verified_at) values('coke',$1,$2,$3,'volume','verified','https://manufacturer.example/spec',now()) returning id,variant_code,total_net_volume_ml`,[label,pack,ml])).rows[0];
 const a=await variant('355mL x12',12,355),b=await variant('500mL x6',6,500);
 assert.notEqual(a.variant_code,b.variant_code);assert.equal(Number(a.total_net_volume_ml),4260);assert.equal(Number(b.total_net_volume_ml),3000);
 for(const [id,store,price] of [['w','Walmart',6.94],['m','Metro',7.49]]){
 await db.query(`insert into marketplace_offers(id,product_id,store,market,currency,variant_id,variant_match_status,variant_match_source_url,variant_matched_at,price_basis) values($1,'coke',$2,'CA','CAD',$3,'verified','https://store.example/product',now(),'package')`,[id,store,a.id]);
 await db.query("insert into promotions(id,sale_price,status) values($1,$2,'confirmed')",[id,price]);
 }
 let rows=(await db.query("select * from promotion_product_comparison where offer_id in ('w','m') order by offer_id")).rows;
 assert.equal(rows[0].variant_code,rows[1].variant_code);
 assert.ok(Math.abs(Number(rows[1].selling_price_per_unit)-6.94/42.6)<0.000001);
 assert.equal(rows[1].comparison_unit,'100mL');
 await assert.rejects(db.query(`insert into marketplace_offers(id,product_id,variant_id) values('wrong','butter',$1)`,[a.id]));
 assert.equal((await db.query("select valid_gtin14('00066188043901') as valid")).rows[0].valid,true);
 await db.query("insert into deal_variant_gtins(gtin14,variant_id,source_url,verified_at) values('00066188043901',$1,'https://example.test',now())",[a.id]);
 await assert.rejects(db.query("insert into deal_variant_gtins(gtin14,variant_id,source_url,verified_at) values('00066188043901',$1,'https://example.test',now())",[b.id]));
 await assert.rejects(db.query("insert into deal_variant_gtins(gtin14,variant_id,source_url,verified_at) values('00066188043902',$1,'https://example.test',now())",[a.id]));
 await db.query("update marketplace_offers set product_url='https://changed.test' where id='w'");
 assert.equal((await db.query("select selling_price_per_unit from promotion_product_comparison where offer_id='w'")).rows[0].selling_price_per_unit,null);
 await db.query("update deal_product_variants set unit_net_volume_ml=400 where id=$1",[a.id]);
 assert.equal((await db.query("select selling_price_per_unit from promotion_product_comparison where offer_id='m'")).rows[0].selling_price_per_unit,null);
 await assert.rejects(db.query("insert into deal_product_variants(product_id,label,pack_count) values('coke','invalid',0)"));
 const mass=(await db.query(`insert into deal_product_variants(product_id,label,pack_count,unit_net_weight_g,comparison_basis,verification_status,verification_source_url,verified_at) values('butter','454g',1,454,'mass','verified','https://example.test',now()) returning id`)).rows[0];
 await db.query(`insert into marketplace_offers(id,product_id,variant_id,price_basis,variant_match_status,variant_match_source_url,variant_matched_at) values('mass','butter',$1,'package','verified','https://example.test',now())`,[mass.id]);
 await db.query("insert into promotions(id,sale_price,status) values('mass',4.97,'confirmed')");
 let unit=Number((await db.query("select selling_price_per_unit from promotion_product_comparison where offer_id='mass'")).rows[0].selling_price_per_unit);
 assert.ok(Math.abs(unit-4.97/4.54)<0.000001);
 await db.query("update marketplace_offers set price_basis='lb' where id='mass'");
 unit=Number((await db.query("select selling_price_per_unit from promotion_product_comparison where offer_id='mass'")).rows[0].selling_price_per_unit);
 assert.ok(Math.abs(unit-4.97*100/453.59237)<0.000001);
 await db.query("update marketplace_offers set price_basis='unknown' where id='mass'");
 assert.equal((await db.query("select selling_price_per_unit from promotion_product_comparison where offer_id='mass'")).rows[0].selling_price_per_unit,null);
 await db.exec('set role anon');
 await assert.rejects(db.query('select * from promotion_product_comparison'));
 await assert.rejects(db.query('select * from deal_product_variants'));
 }finally{await db.close();}
});
