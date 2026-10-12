import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const source=await readFile('app/landing-view-tracker.tsx','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
test('page load retries HTTP failures with one document ID and stops after success',async()=>{
 const timers=new Map(),listeners=new Map(),requests=[];let index=0;
 const context={exports:{},require:()=>({useEffect:fn=>fn()}),document:{visibilityState:'visible',referrer:'',addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:()=>{}},window:{addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:()=>{}},location:{href:'https://example.com/'},crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},AbortController,Blob,navigator:{sendBeacon:()=>true},setTimeout:(fn,delay)=>{timers.set(++index,{fn,delay});return index;},clearTimeout:id=>timers.delete(id),fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:requests.length>1,status:requests.length>1?204:503};}};
 vm.runInNewContext(js,context);context.exports.default({admin:false});await new Promise(setImmediate);
 assert.equal(requests.length,1);const retry=[...timers.values()].find(t=>t.delay===2000);assert.ok(retry);await retry.fn();await new Promise(setImmediate);
 assert.equal(requests.length,2);assert.equal(requests[0].id,requests[1].id);
 listeners.get('online')();await new Promise(setImmediate);assert.equal(requests.length,2);
 context.exports.default({admin:false});context.exports.default({admin:true});assert.equal(requests.length,2);
});
