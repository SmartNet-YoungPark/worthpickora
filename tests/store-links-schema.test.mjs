import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('multi-store settings and separate custom click counts preserve legacy data and permissions',async()=>{
 const db=new PGlite();try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const file of ['20260924010000_store_apps.sql','20260925020000_store_links.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  await db.exec("set role service_role; select public.store_app_click('amazon-ios');");
  const id='link-11111111-1111-4111-8111-111111111111';
  for(let i=0;i<2;i++)await db.query('select public.store_link_click($1,$2,$3)',[id,'Amazon','Collection']);
  const rows=(await db.query('select * from public.store_app_clicks order by link_id')).rows;
  assert.equal(Number(rows[0].clicks),1);assert.equal(Number(rows[1].clicks),2);assert.equal(rows[1].link_title,'Collection');
  for(const role of ['anon','authenticated']){await db.exec('reset role;set role '+role);await assert.rejects(db.query('select * from public.store_app_settings'),{code:'42501'});await assert.rejects(db.query('select public.store_link_click($1,$2,$3)',[id,'A','B']),{code:'42501'});}
 }finally{await db.close();}
});
