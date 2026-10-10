import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
const flyer=JSON.parse(await readFile(new URL('../lib/walmart-flyer.json',import.meta.url),'utf8'));
test('all individually priced flyer offers are accounted for, including repeated appearances',()=>{
 const expected=[17,11,21,8,9,15,15,15,22,8,22,14,18,19,20,20,22,12,15,21,6,6,10,8];
 assert.deepEqual(expected.map((_,n)=>flyer.items.filter(i=>i.sourcePages.includes(n+1)).length),expected);
 assert.equal(new Set(flyer.items.map(i=>i.id)).size,flyer.items.length);
 assert.equal(new Set(flyer.items.map(i=>i.imageFile)).size,flyer.items.length);
 assert.deepEqual(flyer.review.excludedPages.map(p=>p.page),[25,26]);
});
test('savings require an explicit reference price; contradictory offers require review',()=>{
 for(const i of flyer.items){
  assert.ok(Number.isFinite(i.salePrice)&&i.salePrice>0,i.id);
  if(i.regularPrice===null||i.priceConflict)assert.equal(i.savings,null,i.id);
  else assert.equal(i.savings,Math.round((i.regularPrice-i.salePrice)*100)/100,i.id);
  if(i.promotionType==='Online deal')assert.match(i.conditions,/Online only/);
 }
 const conflicting=flyer.items.filter(i=>i.storeCode==='50638073');
 assert.deepEqual(conflicting.map(i=>i.salePrice),[5.24,6.24]);
 assert.ok(conflicting.every(i=>i.priceConflict&&i.promotionType==='Check price'));
 const ham=flyer.items.find(i=>i.storeCode==='51017184');
 assert.equal(ham.salePrice,1.97);assert.equal(ham.unit,'lb');assert.equal(ham.regularPrice,null);
 const luggage=flyer.items.find(i=>i.storeCode==='5XC9CKY015Z4');
 assert.equal(luggage.salePrice,129.99);assert.equal(luggage.savings,270);
});
