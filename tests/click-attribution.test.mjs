import test from 'node:test';
import assert from 'node:assert/strict';
import {visitSource,referralSource,deviceType} from '../lib/click-attribution.ts';
import {rankClicks} from '../lib/click-analytics.ts';
test('campaigns override referrals, visits retain source, unknown links stay unknown',()=>{
 const url=new URL('https://worthpickora.com/');
 assert.equal(visitSource(new URL('?utm_source=tiktok',url),'https://youtube.com/watch'),'TikTok');
 assert.equal(visitSource(url,'https://www.youtube.com/shorts/test'),'YouTube');
 assert.equal(visitSource(url,'https://worthpickora.com/','YouTube'),'YouTube');
 assert.equal(visitSource(url,''),'Direct / Unknown');
 assert.equal(referralSource('https://youtube.com.fake.example/','https://worthpickora.com'),'Other');
 assert.equal(visitSource(new URL('?utm_source=private-long-campaign',url),''),'Other');
});
test('device classification and source totals do not double count product totals',()=>{
 assert.equal(deviceType('Mozilla iPhone Mobile'),'Mobile');
 assert.equal(deviceType('Mozilla iPad'),'Tablet');
 assert.equal(deviceType('Mozilla Android 14'),'Tablet');
 assert.equal(deviceType('Mozilla Windows NT 10.0'),'PC');
 assert.equal(deviceType(''),'Unknown');
 const rows=[{product_id:'1',product_name:'A',product_code:'A1',source:'YouTube',device:'Mobile',clicks:2},{product_id:'1',product_name:'A',product_code:'A1',source:'TikTok',device:'PC',clicks:1}];
 assert.equal(rankClicks(rows,'product')[0].clicks,3);
 assert.equal(rankClicks(rows,'source')[0].key,'YouTube');
 assert.equal(rankClicks(rows,'device')[0].key,'Mobile');
});

