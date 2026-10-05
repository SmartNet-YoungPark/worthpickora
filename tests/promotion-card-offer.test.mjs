import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionCardOffer as card} from '../lib/promotion-card-offer.ts';
test('image examples distinguish conditional coupon from selling price and combined savings',()=>{
 assert.deepEqual(card({offerType:'clip-coupon',regularPrice:449.99,salePrice:399.99,discountAmount:95}),{headline:'Save $95.00',caption:''});
 assert.deepEqual(card({offerType:'clip-coupon',salePrice:29.99,discountPercent:10}),{headline:'Save 10%',caption:''});
 assert.deepEqual(card({offerType:'clip-coupon',regularPrice:259,salePrice:229,discountAmount:35,metadata:{finalPrice:194}}),{headline:'Save $65.00',caption:'total verified savings'});
 assert.equal(card({offerType:'clip-coupon',salePrice:229,saleInfo:'Coupon price $194'}).headline,'Check offer');
 assert.equal(card({offerType:'clip-coupon',salePrice:229,discountAmount:630}).headline,'Check offer');
});
