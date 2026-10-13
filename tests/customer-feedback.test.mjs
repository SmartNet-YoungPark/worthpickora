import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {validFeedback} from '../lib/customer-feedback.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('feedback validation rejects malformed and oversized entries',()=>{
 const valid={id:id(1),name:'Guest',sentiment:'problem',message:'Broken store link'};
 assert.ok(validFeedback(valid));
 for(const patch of [{message:'   '},{name:''},{sentiment:'constructor'},{id:'oops'},{message:'x'.repeat(1501)}])assert.equal(validFeedback({...valid,...patch}),false);
});
test('feedback persists, deduplicates, moderates, paginates and protects customer data',async()=>{
 const db=new PGlite();
 try{
 await db.exec('create role anon; create role authenticated; create role service_role;');
 await db.exec(await readFile('supabase/migrations/20261012010000_customer_feedback.sql','utf8'));
 const submit=async n=>(await db.query('select customer_feedback_submit($1,$2,$3,$4,$5) ok',[id(n),'Guest','problem','Broken link', 'a'.repeat(64)])).rows[0].ok;
 assert.equal(await submit(1),true);assert.equal(await submit(1),true);
 assert.equal((await db.query('select count(*) n from customer_feedback')).rows[0].n,1);
 const date=(await db.query("select (now() at time zone 'America/Toronto')::date::text d")).rows[0].d;
 const list=async admin=>(await db.query('select customer_feedback_list($1,$2,0) data',[date,admin])).rows[0].data;
 assert.equal((await list(false)).length,0);assert.equal((await list(true)).length,1);
 await db.query('select customer_feedback_update($1,$2,$3)',[id(1),'Thank you; the link is fixed.','visible']);
 const row=(await list(false))[0];assert.equal(row.reply,'Thank you; the link is fixed.');assert.ok(row.replied_at);assert.equal(row.sender_hash,undefined);
 assert.equal((await db.query('select customer_feedback_list($1,false,1) data',[date])).rows[0].data.length,0);
 await submit(2);await submit(3);assert.equal(await submit(4),false);
 const stats=(await db.query('select customer_feedback_summary($1,$1) data',[date])).rows[0].data;assert.deepEqual(stats,{total:3,pending:2,problems:3});
 await db.query('select customer_feedback_update($1,$2,$3)',[id(1),'','hidden']);assert.equal((await list(false)).length,0);
 await db.exec(await readFile('supabase/migrations/20261012020000_customer_feedback_delete.sql','utf8'));
 assert.equal((await db.query('select customer_feedback_delete($1) ok',[id(1)])).rows[0].ok,true);
 assert.equal((await db.query('select customer_feedback_delete($1) ok',[id(1)])).rows[0].ok,false);
 assert.equal((await list(true)).length,2);
 await db.exec('set role anon');
 await assert.rejects(db.query('select * from customer_feedback'));
 await assert.rejects(db.query('select customer_feedback_delete($1)',[id(2)]));
 await assert.rejects(db.query('select customer_feedback_list($1,true,0)',[date]));
 await assert.rejects(db.query('select customer_feedback_update($1,$2,$3)',[id(1),'fake reply','visible']));
 }finally{await db.close();}
});
