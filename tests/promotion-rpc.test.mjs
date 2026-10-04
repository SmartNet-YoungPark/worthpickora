import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=(await readFile(new URL('../lib/server-promotion-schedule.ts',import.meta.url),'utf8')).replace('import "server-only";','');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {promotionRpc}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('RPC accepts empty successful writes, decodes reads and rejects HTTP failures',async()=>{
 const originalFetch=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_URL='https://example.test';process.env.SUPABASE_SECRET_KEY='test';
 try{
  globalThis.fetch=async()=>new Response(null,{status:204});assert.equal(await promotionRpc('promotion_result_save'),null);
  globalThis.fetch=async()=>new Response('');assert.equal(await promotionRpc('promotion_schedule_tick'),null);
  globalThis.fetch=async()=>Response.json({runs:[]});assert.deepEqual(await promotionRpc('promotion_schedule_status'),{runs:[]});
  globalThis.fetch=async()=>new Response('failed',{status:500});await assert.rejects(promotionRpc('promotion_result_save'),/unavailable/);
 }finally{globalThis.fetch=originalFetch;for(const [key,value] of [['SUPABASE_URL',oldUrl],['SUPABASE_SECRET_KEY',oldKey]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
