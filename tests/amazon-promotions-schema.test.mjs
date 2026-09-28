import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('Amazon products and promotions migrate separately and saves are atomic and service-only',async()=>{
 const db=new PGlite();try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const run=async file=>db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  await run('20260924010000_store_apps.sql');await run('20260925020000_store_links.sql');
  const links=[{id:'link-11111111-1111-4111-8111-111111111111',store:'Amazon',title:'A',description:'Text',url:'https://amazon.com/dp/B0F3GYMWG5',offerType:'clip-coupon',saleInfo:'Screenshot coupon $40'},
   {id:'link-22222222-2222-4222-8222-222222222222',store:'Walmart',title:'W',description:'',url:'https://walmart.com/'}];
  await db.query('update public.store_app_settings set links=$1::jsonb where id=1',[JSON.stringify(links)]);
  await run('20260927010000_amazon_promotions.sql');
  await run('20260927010000_amazon_promotions.sql');
  assert.equal((await db.query('select * from amazon_products')).rows.length,1);
  assert.equal((await db.query('select * from amazon_promotions')).rows[0].sale_info,links[0].saleInfo);
  assert.equal((await db.query('select links from store_app_settings')).rows[0].links.length,1);
  await db.exec('set role service_role');
  const snapshot=async()=> (await db.query('select public.promotion_links_snapshot() as links')).rows[0].links;
  assert.equal((await snapshot()).length,2);
  await db.query('select public.promotion_links_save($1::jsonb)',[JSON.stringify(links)]);
  const before=await snapshot();
  await assert.rejects(db.query('select public.promotion_links_save($1::jsonb)',[JSON.stringify([{...links[0],title:'changed',offerType:'promo-code',promoCode:''}]) ]));
  assert.deepEqual(await snapshot(),before);
  await db.query('select public.promotion_links_save($1::jsonb)',[JSON.stringify([links[1]])]);
  assert.equal((await db.query('select * from amazon_promotions')).rows.length,0);
  assert.equal((await snapshot()).length,1);
  const seed=await readFile(new URL('../supabase/seeds/tineco-amazon-promotion.sql',import.meta.url),'utf8');
  await db.exec(seed);await db.exec(seed);
  assert.equal((await db.query('select * from amazon_products')).rows.length,1);
  assert.ok((await db.query('select * from amazon_promotions')).rows[0].sale_info.includes('$40 coupon'));
  await assert.rejects(db.query('select public.promotion_links_save(null)'));
  for(const role of ['anon','authenticated']){
   await db.exec('reset role;set role '+role);
   await assert.rejects(db.query('select * from public.amazon_products'),{code:'42501'});
   await assert.rejects(db.query('select public.promotion_links_save($1::jsonb)',['[]']),{code:'42501'});
  }
 }finally{await db.close();}
});
