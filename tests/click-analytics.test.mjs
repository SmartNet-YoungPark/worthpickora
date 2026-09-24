import test from 'node:test';
import assert from 'node:assert/strict';
import {rankClicks,seriesClicks,bucketDate,torontoDate,validRange,calendarRange} from '../lib/click-analytics.ts';
test('calendar deletion periods include leap days and Monday weeks across years',()=>{
 assert.deepEqual(calendarRange('2024-02-29','day'),{start:'2024-02-29',end:'2024-02-29'});
 assert.deepEqual(calendarRange('2024-02-29','month'),{start:'2024-02-01',end:'2024-02-29'});
 assert.deepEqual(calendarRange('2026-01-01','week'),{start:'2025-12-29',end:'2026-01-04'});
 assert.deepEqual(calendarRange('2024-06-15','year'),{start:'2024-01-01',end:'2024-12-31'});
 assert.throws(()=>calendarRange('2026-02-30','month'));
 assert.throws(()=>calendarRange('2026-01-01','invalid'));
 assert.equal(bucketDate('2024-02-29','year'),'2024');
 assert.deepEqual(seriesClicks([{click_date:'2024-12-31',clicks:2},{click_date:'2025-01-01',clicks:3}], '2024-12-31','2025-01-02','year'),[{date:'2024',clicks:2},{date:'2025',clicks:3}]);
});
test('Toronto calendar and Monday/week/month boundaries',()=>{
 assert.equal(torontoDate(new Date('2026-09-20T02:00:00Z')),'2026-09-19');
 assert.equal(bucketDate('2026-01-01','week'),'2025-12-29');
 assert.equal(bucketDate('2026-09-20','month'),'2026-09');
 assert.equal(validRange('2026-02-30','2026-03-01'),false);
 assert.equal(validRange('2026-01-01','2026-01-31'),true);
});
test('top ten aggregates repeated daily records and trend includes zero days',()=>{
 const rows=Array.from({length:12},(_,i)=>({product_id:String(i),product_name:'Product '+i,product_code:'T'+i,store_name:i%2?'A':'B',category_name:'Tech',click_date:'2026-09-01',clicks:i+1}));
 rows.push({...rows[11],click_date:'2026-09-02',clicks:5});
 const top=rankClicks(rows,'product');assert.equal(top.length,10);assert.equal(top[0].clicks,17);
 assert.equal(rankClicks(rows,'store').reduce((s,r)=>s+r.clicks,0),83);
 assert.deepEqual(seriesClicks(rows.filter(r=>r.product_id==='11'),'2026-09-01','2026-09-03','day').map(p=>p.clicks),[12,5,0]);
});
