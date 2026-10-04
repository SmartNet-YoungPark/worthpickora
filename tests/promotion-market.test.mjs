import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedMarket} from '../lib/promotion-market.ts';
import {amazonPromotionDestination} from '../lib/amazon-affiliate.ts';
test('country controls visitors, only admin can override; language is a fallback',()=>{
 assert.equal(selectedMarket('CA','en-US',false,'US'),'CA');
 assert.equal(selectedMarket('US','en-CA',false,'CA'),'US');
 assert.equal(selectedMarket(null,'fr-CA,fr;q=0.9',false,null),'CA');
 assert.equal(selectedMarket('CA','en-CA',true,'US'),'US');
 assert.equal(selectedMarket('US','en-US',true,'CA'),'CA');
});
test('admin uses clean same-market product URLs; customers retain regional affiliate IDs',()=>{
 const source='https://www.amazon.com/name/dp/B012345678?tag=old&ar_su=redirect';
 assert.equal(amazonPromotionDestination(source,'US',true),'https://www.amazon.com/dp/B012345678');
 assert.equal(amazonPromotionDestination(source,'CA',true),null);
 assert.match(amazonPromotionDestination(source,'US'),/tag=smartnetweb0a-20/);
 assert.match(amazonPromotionDestination('https://www.amazon.ca/dp/B012345678','CA'),/tag=smartnetwe06a-20/);
 assert.equal(amazonPromotionDestination('https://amzn.to/test','CA'),null);
});
