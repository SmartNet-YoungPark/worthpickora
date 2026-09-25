import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('credential SQL restricts access, accepts only hashes and prevents stale replacement',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(await readFile(new URL('../supabase/migrations/20260925010000_admin_credentials.sql',import.meta.url),'utf8'));
  const old='scrypt:'+ 'a'.repeat(32)+':'+ 'b'.repeat(128),next='scrypt:'+'c'.repeat(32)+':'+'d'.repeat(128);
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   await assert.rejects(db.query('select * from public.admin_credentials'),{code:'42501'});
   await assert.rejects(db.query('select public.admin_change_password($1,$2)',[old,next]),{code:'42501'});
   await db.exec('reset role');
  }
  await db.exec('set role service_role');
  await assert.rejects(db.query('select public.admin_change_password($1,$2)',[old,'1234']));
  assert.equal((await db.query('select public.admin_change_password($1,$2) as ok',[old,next])).rows[0].ok,true);
  assert.equal((await db.query('select public.admin_change_password($1,$2) as ok',[old,old])).rows[0].ok,false);
  assert.equal((await db.query('select password_hash from public.admin_credentials')).rows[0].password_hash,next);
  assert.equal((await db.query('select public.admin_change_password($1,$2) as ok',[next,old])).rows[0].ok,true);
 }finally{await db.close();}
});
