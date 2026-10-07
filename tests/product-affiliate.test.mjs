import test from 'node:test';
import assert from 'node:assert/strict';
import {productDestination,validAmazonFullLink,validAmazonShortLink} from '../lib/product-affiliate.ts';
import {seedProducts,validateProduct,exportCsv,importCsv} from '../lib/catalog.ts';
const pair={...seedProducts[0],urlUS:'https://www.amazon.com/dp/B012345678?th=1&tag=wrong',urlCA:'https://www.amazon.ca/dp/B087654321?th=2&tag=wrong'};
test('country routing preserves the explicitly configured product and parameters without editing supplied tags',()=>{
 for(const [country,host,asin,tag] of [['CA','www.amazon.ca','B087654321','smartnetwe06a-20'],['US','www.amazon.com','B012345678','smartnetweb0a-20'],[null,'www.amazon.com','B012345678','smartnetweb0a-20']]){
 const u=new URL(productDestination(pair,country));assert.equal(u.hostname,host);assert.ok(u.pathname.endsWith(asin));assert.equal(u.searchParams.get('tag'),'wrong');assert.equal(productDestination(pair,country),country==='CA'?pair.urlCA:pair.urlUS);assert.ok(u.searchParams.has('th'));
 }
 assert.equal(productDestination({...pair,urlCA:''},'CA'),null);
 assert.equal(validateProduct(pair,[]),'');
});
test('short, wrong-market, credential and external redirects are rejected',()=>{
 for(const u of ['https://amzn.to/test','https://www.amazon.com.evil.test/dp/B012345678','https://u:p@www.amazon.com/dp/B012345678','https://www.amazon.ca/dp/B012345678'])assert.equal(validAmazonFullLink(u,'US'),false);
 assert.ok(validateProduct({...pair,urlCA:''},[]));
 const legacy={store:'Amazon',url:'https://amzn.to/existing'};assert.equal(productDestination(legacy,'CA'),legacy.url);
 assert.equal(productDestination({store:'Etsy',url:'https://etsy.com/listing/123'},'CA'),'https://etsy.com/listing/123');
});
test('CSV round trip preserves both country-specific links',()=>{
 const [p]=importCsv(exportCsv([pair]),[]);assert.equal(p.urlUS,pair.urlUS);assert.equal(p.urlCA,pair.urlCA);
});

test('Amazon mh and mobile product URLs accept original redirect attribution parameters',()=>{
 const us='https://www.amazon.com/mh?_encoding=UTF8&s=B09SV5ZV8H&tag=custom-us-20&linkCode=ll2';
 const ca='https://www.amazon.ca/dp/B09SV5ZV8H?ar_su=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB09SV5ZV8H%3Ftag%3Dnested-us-20&tag=custom-ca-20&gaOptInStatus=true&gaOptInStatus=true';
 assert.equal(validAmazonFullLink(us,'US'),true);assert.equal(validAmazonFullLink(ca,'CA'),true);
 assert.equal(validAmazonFullLink('https://www.amazon.com/gp/aw/d/B09SV5ZV8H?tag=x','US'),true);
 assert.equal(validAmazonFullLink('https://www.amazon.com/mh?s=invalid','US'),false);
 assert.equal(productDestination({...pair,urlUS:us,urlCA:ca},'US'),us);
 assert.equal(productDestination({...pair,urlUS:us,urlCA:ca},'CA'),ca);
});

test('short links are separate per country and full links always take priority',()=>{
 const p={...pair,urlShortUS:'https://amzn.to/us-backup',urlShortCA:'https://a.co/ca-backup'};
 assert.equal(productDestination(p,'US'),p.urlUS);assert.equal(productDestination(p,'CA'),p.urlCA);
 assert.equal(productDestination({...p,urlUS:''},'US'),p.urlShortUS);
 assert.equal(productDestination({...p,urlCA:''},'CA'),p.urlShortCA);
 assert.equal(productDestination({...p,urlCA:'',urlShortCA:''},'CA'),null);
 assert.equal(productDestination({...p,urlUS:'',urlCA:''},null),p.urlShortUS);
 assert.equal(validateProduct({...p,urlUS:'',urlCA:''},[]),'');
 assert.ok(validateProduct({...p,urlShortCA:'javascript:alert(1)'},[]));
 const [saved]=importCsv(exportCsv([p]),[]);assert.equal(saved.urlShortUS,p.urlShortUS);assert.equal(saved.urlShortCA,p.urlShortCA);
});

test('link.amazon short links preserve the exact country-specific URL',()=>{
 const ca='https://link.amazon/ExampleCode?tag=original-ca-20';
 assert.equal(validAmazonShortLink(ca),true);
 assert.equal(productDestination({...pair,urlCA:'',urlShortCA:ca},'CA'),ca);
 assert.equal(validateProduct({...pair,urlCA:'',urlShortCA:ca},[]),'');
 for(const value of ['https://link.amazon','https://link.amazon.evil.test/code','http://link.amazon/code','https://user@link.amazon/code'])assert.equal(validAmazonShortLink(value),false);
});
