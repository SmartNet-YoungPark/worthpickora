import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
import {hashPassword,createSession,SESSION_COOKIE} from '../lib/admin-security.ts';
const base='http://localhost:3198',secret='local-feedback-test-session-secret-2026';const hash=await hashPassword('1234');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3198'],{windowsHide:true,stdio:'ignore',env:{...process.env,SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',ADMIN_SESSION_SECRET:secret,ADMIN_PASSWORD_HASH:hash}});
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/admin/login')).ok){ready=true;break;}}catch{}await pause(300);}assert.ok(ready);
 assert.equal((await fetch(base+'/admin/feedback',{redirect:'manual'})).status,307);
 assert.equal((await fetch(base+'/api/admin/feedback?date=2026-10-12')).status,401);
 const cookie=`${SESSION_COOKIE}=${createSession(secret,hash)}`;
 const page=await fetch(base+'/admin/feedback',{headers:{cookie}});assert.equal(page.status,200);assert.match(await page.text(),/Customer feedback &amp; replies/);
 const mutate=(path,method,body,extra={})=>fetch(base+path,{method,headers:{'content-type':'application/json',origin:base,...extra},body:JSON.stringify(body)});
 assert.equal((await mutate('/api/admin/feedback','PATCH',{}, {origin:'https://evil.test',cookie})).status,403);
 assert.equal((await mutate('/api/admin/feedback','PATCH',{})).status,401);
 assert.equal((await mutate('/api/admin/feedback','PATCH',{},{cookie})).status,400);
 assert.equal((await mutate('/api/admin/feedback','DELETE',{}, {origin:'https://evil.test',cookie})).status,403);
 assert.equal((await mutate('/api/admin/feedback','DELETE',{})).status,401);
 assert.equal((await mutate('/api/admin/feedback','DELETE',{id:'00000000-0000-4000-8000-000000000001'},{cookie})).status,400);
 assert.equal((await mutate('/api/feedback','POST',{})).status,400);
 assert.equal((await mutate('/api/feedback','POST',{}, {origin:'https://evil.test'})).status,403);
 assert.equal((await fetch(base+'/api/feedback?date=oops')).status,400);
 assert.equal((await fetch(base+'/api/feedback?date=2026-10-12')).status,503);
 const result=await mutate('/api/feedback','POST',{id:'00000000-0000-4000-8000-000000000001',name:'Guest',sentiment:'problem',message:'The store link is broken.'});assert.equal(result.status,503);assert.match((await result.json()).error,/could not be saved/);
 console.log('Feedback auth, CSRF, validation and honest storage-outage handling passed.');
}finally{child.kill();}

