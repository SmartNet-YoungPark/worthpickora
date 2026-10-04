import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionAmountLabel as label} from '../lib/promotion-amount.ts';
test('amount-only badges never invent a price or show currency prefixes',()=>{
 assert.equal(label({discountAmount:35}),"$35.00 OFF");
 assert.equal(label({offerType:'clip-coupon',saleInfo:'CA$10 coupon.'}),"$10.00 OFF");
 assert.equal(label({offerType:'clip-coupon',salePrice:79.99,discountPercent:20}),"$16.00 OFF");
 assert.equal(label({offerType:'clip-coupon',regularPrice:100,discountPercent:20}),"Check amount");
 assert.equal(label({offerType:'price-discount',regularPrice:100,salePrice:75}),"$25.00 OFF");
 assert.equal(label({discountPercent:49}),"Check amount");
 assert.equal(label({discountAmount:Infinity}),"Check amount");
});
