import test from 'node:test';
import assert from 'node:assert/strict';
import {geniuslinkProduct} from '../lib/geniuslink-product.ts';
const us='https://www.amazon.com/dp/B0DJ1YNC1H?tag=smartnetweb0a-20&linkId=abc&ref_=as_li_ss_tl';
const p={store:'Amazon',url:us,urlUS:us,urlCA:'https://www.amazon.ca/dp/B0DJ1YNC1H?tag=smartnetwe06a-20'};
test('ready-to-click Geniuslink uses US source with exact affiliate parameters',()=>{
 const link=new URL(geniuslinkProduct(p));
 assert.equal(link.origin,'https://buy.geni.us');assert.equal(link.pathname,'/Proxy.ashx');
 assert.equal(link.searchParams.get('TSID'),'447940');assert.equal(link.searchParams.get('dtb'),'1');
 assert.equal(link.searchParams.get('GR_URL'),us);
 assert.equal(link.searchParams.has('targetiso2'),false);
 assert.equal(geniuslinkProduct({...p,urlCA:''}),link.href);
});
test('untagged source is wrapped without modifying the stored URL',()=>{
 const raw='https://www.amazon.com/dp/B0DJ1YNC1H';
 assert.equal(new URL(geniuslinkProduct({...p,urlUS:raw})).searchParams.get('GR_URL'),raw);
});
test('nested query values are encoded once and roundtrip intact',()=>{
 const raw=us+'&source=https%3A%2F%2Fexample.com%2F%3Fa%3D1%26b%3D2';
 assert.equal(new URL(geniuslinkProduct({...p,urlUS:raw})).searchParams.get('GR_URL'),raw);
});
test('other stores, short URLs, invalid hosts, and Canada-only sources are not wrapped',()=>{
 for(const q of [{...p,store:'Walmart'},{...p,urlUS:'https://amzn.to/test'},{...p,urlUS:'https://www.amazon.com.evil.test/dp/B0DJ1YNC1H'},{store:'Amazon',url:p.urlCA}])assert.equal(geniuslinkProduct(q),null);
 assert.ok(geniuslinkProduct({store:'Amazon',url:us}));
});
