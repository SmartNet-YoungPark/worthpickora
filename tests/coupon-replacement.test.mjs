import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('coupon reset is atomic, category scoped, rejects empty results and preserves other promotions',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const file of ['20260924010000_store_apps.sql','20260925020000_store_links.sql','20260927010000_amazon_promotions.sql','20260928010000_promotion_types.sql','20260929010000_promotion_categories.sql','20260929020000_replace_coupon_results.sql']){
   await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  }
  const item=(n,category='Home')=>({id:`link-${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`,title:'Verified coupon',description:'20% coupon',url:`https://www.amazon.com/dp/B${String(n).padStart(9,'0')}`,image:'https://m.media-amazon.com/images/I/test.jpg',category,offerType:'clip-coupon',saleInfo:'Select coupon',discountPercent:20});
  const replace=(rows,category=null)=>db.query('select public.replace_coupon_results($1::jsonb,$2)',[JSON.stringify(rows),category]);
  await replace([item(1),item(2,'Tech')]);
  const other={...item(3),store:'Amazon',offerType:'general'};
  await db.query('select promotion_links_save($1::jsonb)',[JSON.stringify([{...item(1),store:'Amazon'},{...item(2,'Tech'),store:'Amazon'},other])]);
  await replace([item(4)],'Home');
  const snapshot=async()=> (await db.query('select * from amazon_products order by id')).rows;
  assert.deepEqual((await snapshot()).map(r=>r.id),[item(2).id,item(3).id,item(4).id]);
  const before=await snapshot();
  await assert.rejects(replace([]));
  await assert.rejects(replace([{...item(5),discountPercent:null}]));
  await assert.rejects(replace([item(5,'Tech')],'Home'));
  await assert.rejects(replace([{...item(5),title:'x'.repeat(81)}]));
  assert.deepEqual(await snapshot(),before);
  await replace([item(6)]);
  assert.deepEqual((await snapshot()).map(r=>r.id),[item(3).id,item(6).id]);
  await db.exec('set role anon');
  await assert.rejects(replace([item(7)]),{code:'42501'});
 }finally{await db.close();}
});
