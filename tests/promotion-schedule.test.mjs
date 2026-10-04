import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {normalizePromotion} from '../lib/promotion-normalizer.ts';
import {parseAmazonOffer} from '../lib/promotion-verifier.ts';
import {amazonAffiliateUrl} from '../lib/amazon-affiliate.ts';
import {verifiedPromotionStatus} from '../lib/promotion-types.ts';
test('market tracking is enforced, other networks and existing query parameters are preserved',()=>{
 assert.equal(new URL(amazonAffiliateUrl('https://www.amazon.ca/dp/B012345678?tag=wrong&th=1#details')).searchParams.get('tag'),'smartnetwe06a-20');
 assert.equal(new URL(amazonAffiliateUrl('https://www.amazon.com/dp/B012345678?tag=wrong')).searchParams.get('tag'),'smartnetweb0a-20');
 assert.equal(new URL(amazonAffiliateUrl('https://www.amazon.ca/dp/B012345678?th=1#details')).hash,'#details');
 assert.equal(amazonAffiliateUrl('https://affiliate.example/go?campaign=abc'),'https://affiliate.example/go?campaign=abc');
});
test('normalizer never substitutes list-price savings for a coupon and rejects invalid prices',()=>{
 assert.equal(normalizePromotion({promotionType:'clip-coupon',regularPrice:100,salePrice:80}).discountPercent,null);
 assert.equal(normalizePromotion({promotionType:'limited-time',regularPrice:100,salePrice:80}).discountPercent,20);
 assert.equal(normalizePromotion({promotionType:'general',regularPrice:100,salePrice:99.99}).discountPercent,null);
 assert.equal(normalizePromotion({promotionType:'AMOUNT_COUPON',regularPrice:100,salePrice:80}).discountPercent,null);
 assert.equal(normalizePromotion({promotionType:'general',regularPrice:0,salePrice:80}).discountPercent,null);
 assert.equal(normalizePromotion({promotionType:'clip-coupon',discountAmount:10,currency:'CAD'}).discountAmount,10);
});
test('parser distinguishes coupon, timed discount, missing coupon, variant mismatch and captcha',()=>{
 const url='https://www.amazon.ca/dp/B012345678';const head='<span id="productTitle">Product</span><input id="ASIN" value="B012345678">';
 const coupon=head+'<span id="couponText1">Apply $10 coupon <span data-a-modal="{&quot;url&quot;:&quot;/promotion/details/popup/TEST&quot;}">Terms</span><style></style><div id="feature-bullets">';
 const result=parseAmazonOffer(coupon,url);assert.equal(result.state,'confirmed');assert.equal(result.discountPercent,null);assert.equal(result.discountAmount,10);assert.equal(result.offerType,'clip-coupon');
 assert.equal(parseAmazonOffer(head+'<div>Ends in 2:00 -10%</div><div id="feature-bullets">',url).offerType,'limited-time');
 assert.equal(parseAmazonOffer(head+'List price -10%',url).state,'unknown');
 assert.equal(parseAmazonOffer(coupon.replace('value="B012345678"','value="B012345679"'),url).state,'unknown');
 assert.equal(parseAmazonOffer('Robot check',url).state,'unknown');
});
test('active requires recent verification of this exact marketplace source',()=>{
 const now=Date.parse('2026-10-03T12:00:00Z');const offer={url:'https://www.amazon.ca/dp/B012345678?tag=x',productUrl:'https://www.amazon.ca/dp/B012345678',expiresOn:'2026-12-01',verificationState:'confirmed',verifiedAt:'2026-10-03T10:00:00Z',verifiedUrl:'https://www.amazon.ca/dp/B012345678'};
 assert.equal(verifiedPromotionStatus(offer,now),'active');assert.equal(verifiedPromotionStatus({...offer,verifiedAt:'2026-09-28T00:00:00Z'},now),'check');assert.equal(verifiedPromotionStatus({...offer,verifiedUrl:'https://www.amazon.com/dp/B012345678'},now),'check');
});
test('unified offers, isolated marketplace updates, token leases and scheduler permissions',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 const migrations=['20260924010000_store_apps.sql','20260925020000_store_links.sql','20260927010000_amazon_promotions.sql','20260928010000_promotion_types.sql','20260929010000_promotion_categories.sql','20260929030000_promotion_expiry.sql','20260929040000_market_coupon_results.sql','20260929050000_coupon_expiry_evidence.sql','20261003010000_unified_promotions.sql','20261003020000_promotion_schedule.sql','20261003030000_promotion_details.sql'];
 for(const f of migrations)await db.exec(await readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));
 const base={id:'link-11111111-1111-4111-8111-111111111111',store:'Amazon',title:'One product',description:'',promotionTitle:'Coupon offer',startsAt:'2026-01-01T00:00:00Z',channel:'both',sourceLinks:['https://www.amazon.com/promotion/details/test'],newCustomerOnly:true,image:'https://m.media-amazon.com/a.jpg',offerType:'clip-coupon',saleInfo:'10% coupon',discountPercent:10,market:'US',url:'https://www.amazon.com/dp/B012345678?th=1&tag=old#d',productUrl:'https://www.amazon.com/dp/B012345678'};
 const ca={...base,id:'link-22222222-2222-4222-8222-222222222222',productId:base.id,market:'CA',url:'https://www.amazon.ca/dp/B012345679?tag=old',productUrl:'https://www.amazon.ca/dp/B012345679'};
 await db.query('select promotion_links_save($1::jsonb)',[JSON.stringify([base,ca])]);
 assert.equal((await db.query('select * from deal_products')).rows.length,1);
 const snapshot=(await db.query('select promotion_links_snapshot() value')).rows[0].value;
 assert.equal(snapshot[0].promotionTitle,'Coupon offer');assert.equal(snapshot[0].channel,'both');assert.equal(snapshot[0].newCustomerOnly,true);assert.equal(snapshot[0].sourceLinks.length,1);assert.ok(snapshot[0].startsAt);

 const offers=(await db.query('select * from marketplace_offers order by market')).rows;assert.equal(offers.length,2);assert.match(offers[0].affiliate_url,/tag=smartnetwe06a-20/);assert.match(offers[1].affiliate_url,/th=1&tag=smartnetweb0a-20#d/);
 await assert.rejects(db.query("select promotion_schedule_save(true,'06:00',0,'US')"));
 await db.query("select promotion_schedule_save(true,'06:00',24,'CA')");
 const run=(await db.query("select promotion_run_start('manual') id")).rows[0].id;
 assert.equal((await db.query("select promotion_run_start('manual') id")).rows[0].id,run);
 assert.equal((await db.query('select * from promotion_run_items')).rows.length,1);
 const token=(await db.query('insert into promotion_worker_tokens default values returning token')).rows[0].token;
 const items=(await db.query('select promotion_batch_claim($1) items',[token])).rows[0].items;assert.equal(items.length,1);assert.equal(items[0].market,'CA');
 await assert.rejects(db.query('select promotion_batch_claim($1)',[token]));
 await db.query('select promotion_result_save($1,$2,$3,$4::jsonb)',[run,ca.id,token,JSON.stringify({state:'confirmed',url:ca.productUrl,offerType:'clip-coupon',discountPercent:20,saleInfo:'20% coupon',note:'Verified'})]);
 const promos=(await db.query('select * from promotions order by id')).rows;assert.equal(Number(promos[0].discount_percent),10);assert.equal(Number(promos[1].discount_percent),20);assert.equal(promos[1].status,'confirmed');
 assert.ok((await db.query('select finished_at from promotion_runs')).rows[0].finished_at);
 // A concurrent admin edit must not be overwritten by a queued result.
 const run2=(await db.query("select promotion_run_start('manual') id")).rows[0].id;
 const token2=(await db.query('insert into promotion_worker_tokens default values returning token')).rows[0].token;
 await db.query('select promotion_batch_claim($1)',[token2]);await db.query('select promotion_links_save($1::jsonb)',[JSON.stringify([base,{...ca,title:'Edited'}])]);
 await db.query('select promotion_result_save($1,$2,$3,$4::jsonb)',[run2,ca.id,token2,JSON.stringify({state:'unknown',url:ca.productUrl,note:'Late result'})]);
 assert.equal((await db.query('select state from promotion_run_items where run_id=$1',[run2])).rows[0].state,'skipped');
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select promotion_schedule_status()'),{code:'42501'});await assert.rejects(db.query('select * from promotions'),{code:'42501'});await db.exec('reset role');}
 }finally{await db.close();}
});
