import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {rankDepartments,validDepartmentLimits} from '../lib/department-ranking.ts';
test('defaults, all cap, category aliases and money/percentage ranking stay separate',()=>{
 const rows=['Home','Tech'].flatMap(category=>Array.from({length:110},(_,i)=>({id:category+i,category,offerType:'clip-coupon',discountAmount:i+1,discountPercent:(i%90)+1})));
 assert.equal(rankDepartments(rows,{}).length,30);
 assert.equal(rankDepartments(rows,{},'Home').length,10);
 assert.equal(rankDepartments(rows,{All:100}).length,100);
 assert.equal(rankDepartments(rows,{Home:20},'Home').length,20);
 assert.equal(rankDepartments(rows,{},'Home')[0].discountAmount,110);
 assert.equal(rankDepartments(rows,{},'Home','percent')[0].discountPercent,90);
 assert.equal(rankDepartments([{category:'Home',discountPercent:20}],{}).length,0);
 assert.equal(rankDepartments([{category:'Home',discountPercent:20}],{},'','percent').length,1);
 assert.equal(rankDepartments([{id:'old',category:'Electronics & Tech',offerType:'clip-coupon',discountAmount:10}],{Electronics:10},'Electronics').length,1);
 assert.equal(validDepartmentLimits({All:30,Home:10,Tech:100}),true);for(const n of [0,15,110,'10'])assert.equal(validDepartmentLimits({Home:n}),false);
});
test('US and CA persist separately; invalid settings roll back and public access is denied',async()=>{
 const db=new PGlite();try{await db.exec('create role anon;create role authenticated;create role service_role;');await db.exec(await readFile(new URL('../supabase/migrations/20261004020000_amazon_department_ranking.sql',import.meta.url),'utf8'));
 await db.query('select amazon_department_ranking_save($1,$2)', ['US',JSON.stringify({Home:10})]);await db.query('select amazon_department_ranking_save($1,$2)', ['CA',JSON.stringify({Home:100})]);
 assert.deepEqual((await db.query('select amazon_department_ranking_get() x')).rows[0].x,{US:{Home:10},CA:{Home:100}});
 await assert.rejects(db.query('select amazon_department_ranking_save($1,$2)',['US',JSON.stringify({Home:15})]));assert.equal((await db.query('select amazon_department_ranking_get() x')).rows[0].x.US.Home,10);
 await db.exec('set role anon');await assert.rejects(db.query('select amazon_department_ranking_get()'),{code:'42501'});
 }finally{await db.close();}
});
