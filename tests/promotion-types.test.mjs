import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionSetAssignments,PROMOTION_TYPES,topCouponOffers,promotionExpired,promotionCardSummary,promotionStatus} from '../lib/promotion-types.ts';
import {validateStoreLinks} from '../lib/store-apps.ts';
test('each promotion type gets independent sets of ten and retains set IDs when filtered',()=>{
 const offers=Array.from({length:21},(_,i)=>({id:String(i),offerType:'clip-coupon'}));
 offers.splice(4,0,{id:'deal',offerType:'lightning-deal'});
 const result=promotionSetAssignments(offers);
 const coupons=result.filter(x=>x.type.value==='clip-coupon');
 assert.deepEqual([1,2,3].map(set=>coupons.filter(x=>x.set===set).length),[10,10,1]);
 assert.equal(result.find(x=>x.offer.id==='deal').set,1);
 assert.equal(result.find(x=>x.offer.id==='20').set,3);
});
test('all promotion types support explicit percentages without inferring a coupon percentage from text',()=>{
 const base={id:'link-11111111-1111-4111-8111-111111111111',store:'Amazon',title:'Test',description:'',url:'https://amazon.com/dp/test',promoCode:'TEST'};
 for(const type of PROMOTION_TYPES)assert.equal(validateStoreLinks([{...base,offerType:type.value,discountPercent:20}]),true);
 for(const value of [-1,0,101,'20',NaN])assert.equal(validateStoreLinks([{...base,discountPercent:value}]),false);
 assert.equal(validateStoreLinks([{...base,offerType:'clip-coupon',saleInfo:'20% price reduction plus $40 coupon'}]),true);
 const offers=Array.from({length:101},(_,i)=>({...base,id:`link-${i.toString(16).padStart(8,'0')}-1111-4111-8111-111111111111`}));
 assert.equal(validateStoreLinks(offers),true);
});

test('coupon ranking selects the highest 30 in a category and excludes unknown or unrelated discounts',()=>{
 const rows=Array.from({length:40},(_,i)=>({id:String(i),offerType:"clip-coupon",category:"Home",discountPercent:i+1}));
 rows.push({id:"other",offerType:"clip-coupon",category:"Tech",discountPercent:90},{id:"sale",offerType:"price-discount",category:"Home",discountPercent:95},{id:"unknown",offerType:"clip-coupon",category:"Home",discountPercent:null});
 const ranked=topCouponOffers(rows,"Home");assert.equal(ranked.length,30);assert.equal(ranked[0].discountPercent,40);assert.equal(ranked[29].discountPercent,11);assert.equal(rows[0].discountPercent,1);
});

test('expiry respects timezone offsets and excludes ended coupons from rankings',()=>{
 const now=Date.parse('2026-10-01T00:00:00Z');
 assert.equal(promotionExpired('2026-09-30T20:00:00-04:00',now),true);
 assert.equal(promotionExpired('2026-10-01T01:00:00Z',now),false);
 assert.equal(promotionExpired(null,now),false);
 assert.deepEqual(topCouponOffers([{id:'ended',offerType:'clip-coupon',discountPercent:90,expiresAt:'2026-09-01T00:00:00Z'}],'',now),[]);
});

test('coupon cards support percentages, Canadian amounts and short text without inventing a rate',()=>{
 const base={offerType:'clip-coupon',url:'https://www.amazon.ca/dp/TEST'};
 assert.equal(promotionCardSummary({...base,saleInfo:'Apply $10 coupon'}).headline,'CA$10 coupon');
 assert.equal(promotionCardSummary({...base,saleInfo:'Clip coupon for eligible options'}).headline,'Clip coupon for eligible options');
 assert.equal(promotionCardSummary({...base,discountPercent:20,saleInfo:'$10 coupon'}).headline,'20% coupon');
});

test("unknown expiry never displays active",()=>{assert.equal(promotionStatus(null),"check");assert.equal(promotionStatus("invalid"),"check");assert.equal(promotionStatus("2026-10-01T00:00:00Z",Date.parse("2026-09-30T00:00:00Z")),"active");assert.equal(promotionStatus("2026-10-01T00:00:00Z",Date.parse("2026-10-01T00:00:00Z")),"expired");});

test("date-only expiry uses site calendar and Check only on expiry day or missing date",()=>{
 const now=Date.parse('2026-09-29T15:00:00Z');
 assert.equal(promotionStatus(null,now,'2026-09-30'),'active');
 assert.equal(promotionStatus(null,now,'2026-09-28'),'expired');
 assert.equal(promotionStatus(null,now,'2026-09-29'),'check');
 assert.equal(promotionStatus(null,now,'2026-02-30'),'check');
 assert.equal(promotionStatus('2026-09-29T16:00:00Z',now,'2026-09-28'),'active');
 assert.equal(promotionStatus(null,Date.parse('2026-09-30T02:00:00Z'),'2026-09-30'),'active');
 assert.deepEqual(topCouponOffers([{id:'past',offerType:'clip-coupon',discountPercent:20,expiresOn:'2026-09-28'}],'',now),[]);
});
