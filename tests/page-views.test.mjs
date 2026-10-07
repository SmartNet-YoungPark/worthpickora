import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('landing loads deduplicate event retries, count refreshes and restrict public access',async()=>{
 const db=new PGlite();
 try{
 await db.exec('create role anon; create role authenticated; create role service_role;');
 await db.exec(await readFile(new URL('../supabase/migrations/20261007010000_landing_page_views.sql',import.meta.url),'utf8'));
 const id='00000000-0000-4000-8000-000000000001';
 await db.query("select landing_page_view_record($1,'Google','Mobile')",[id]);
 await db.query("select landing_page_view_record($1,'Google','Mobile')",[id]);
 await db.query("select landing_page_view_record($1,'Google','Mobile')",['00000000-0000-4000-8000-000000000002']);
 const report=await db.query("select * from landing_page_view_report(current_date-1,current_date+1)");
 assert.equal(Number(report.rows[0].views),2);assert.equal(report.rows[0].source,'Google');
 assert.equal((await db.query("select * from landing_page_view_report('2000-01-01','2000-01-02')")).rows.length,0);
 await db.exec('set role anon');
 await assert.rejects(db.query('select * from landing_page_views'));
 await assert.rejects(db.query("select landing_page_view_record($1,'Google','Mobile')",[id]));
 }finally{await db.close();}
});
