import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionSetAssignments,PROMOTION_TYPES} from '../lib/promotion-types.ts';
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
