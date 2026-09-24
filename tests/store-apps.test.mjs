import test from 'node:test';
import assert from 'node:assert/strict';
import { STORE_APPS, storeAppDestination, validTemuOffer } from '../lib/store-apps.ts';
test('only configured official destinations can be used for app redirects', () => {
  assert.equal(new Set(STORE_APPS.map(app=>app.id)).size, STORE_APPS.length);
  for(const app of STORE_APPS) {
    assert.equal(new URL(app.url).protocol,'https:');
    assert.equal(storeAppDestination(app.id), app.url);
  }
  for(const id of ['https://evil.example','__proto__','constructor','unknown']) assert.equal(storeAppDestination(id),null);
});
test('Temu offers remain hidden until a valid official HTTPS destination exists', () => {
  for(const url of ['', 'javascript:alert(1)', 'http://temu.com/a', 'https://temu.com.evil.example/a', 'https://temu.com@evil.example/a', 'https://user:pass@temu.com/a', 'https://temu.com:8443/a']) {
    assert.equal(validTemuOffer(url), false);
    assert.equal(storeAppDestination('temu-offer',url),null);
  }
  const url='https://www.temu.com/campaign?affiliate_id=123&campaign_id=456';
  assert.equal(storeAppDestination('temu-offer',url),url);
});
