import test from 'node:test';
import assert from 'node:assert/strict';
import {directAmazonLink} from '../lib/direct-amazon-link.ts';
const product={store:'Amazon',url:'https://amzn.to/legacy',urlUS:'https://www.amazon.com/dp/B09SV5ZV8H?tag=smartnetweb0a-20&th=1',urlCA:'https://www.amazon.ca/dp/B09SV5ZV8H?tag=smartnetwe06a-20&th=1'};
test('exposes exact full regional URLs for conversion without modifying tags',()=>{
 assert.equal(directAmazonLink(product,'US'),product.urlUS);
 assert.equal(directAmazonLink(product,'CA'),product.urlCA);
 assert.equal(directAmazonLink(product,null),product.urlUS);
});
test('short links, other stores, and missing country links keep server routing',()=>{
 assert.equal(directAmazonLink({...product,urlUS:'',urlShortUS:'https://amzn.to/abc'},'US'),null);
 assert.equal(directAmazonLink({...product,urlCA:''},'CA'),null);
 assert.equal(directAmazonLink({...product,store:'Walmart'},'US'),null);
 assert.equal(directAmazonLink({store:'Amazon',url:'https://amazon.com.evil.test/dp/B09SV5ZV8H'},'US'),null);
});
