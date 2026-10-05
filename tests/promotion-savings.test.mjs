import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {promotionSavings as savings,rankSavings,validRankingLimit} from '../lib/promotion-savings.ts';
test('final price and stacked coupon produce 65 without double counting',()=>{
 const o={offerType:'clip-coupon',regularPrice:259,salePrice:229,discountAmount:35};
 const final=savings({...o,metadata:{finalPrice:194,stackable:true}});assert.equal(final.total,65);assert.deepEqual(final.breakdown.map(r=>r.value),['$259.00','$229.00','$30.00','$35.00','$194.00','$65.00']);assert.equal(final.label,'$65.00 TOTAL OFF');assert.deepEqual(final.badges.map(b=>b.type),['clip-coupon','price-discount']);
 assert.equal(savings({...o,metadata:{stackable:true}}).total,65);
 assert.equal(savings(o).total,35);assert.equal(savings(o).complete,false);
 assert.equal(savings({offerType:'clip-coupon',discountPercent:20}).total,null);
 assert.equal(savings({...o,discountAmount:300,metadata:{stackable:true}}).total,null);
});
test('ranking boundaries and ordering use amounts, not percentages',()=>{
 for(let n=10;n<=300;n+=10)assert.ok(validRankingLimit(n));for(const n of [0,15,301,'30',null])assert.equal(validRankingLimit(n),false);
 const rows=Array.from({length:320},(_,i)=>({id:String(i),discountAmount:i+1}));const ranked=rankSavings(rows,300);assert.equal(ranked.length,300);assert.equal(ranked[0].discountAmount,320);assert.equal(rankSavings([{id:'unknown',discountPercent:99}],10).length,0);
});
test('ranking persists and database rejects invalid values and public access',async()=>{
 const db=new PGlite();try{await db.exec('create role anon;create role authenticated;create role service_role;');await db.exec(await readFile(new URL('../supabase/migrations/20261004010000_promotion_display_settings.sql',import.meta.url),'utf8'));await db.query('select promotion_display_save(300)');assert.equal((await db.query('select promotion_display_get() x')).rows[0].x.rankingLimit,300);await assert.rejects(db.query('select promotion_display_save(15)'));await db.exec('set role anon');await assert.rejects(db.query('select promotion_display_save(10)'),{code:'42501'});}finally{await db.close();}
});
