import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import {hashPassword} from '../lib/admin-security.ts';
const dir=await mkdtemp(join(tmpdir(),'worthpickora-schedule-'));
const origin='http://localhost:3198';const password='7139';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3198'],{windowsHide:true,stdio:'ignore',env:{...process.env,NODE_ENV:'production',SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',CATALOG_DATA_FILE:join(dir,'catalog.json'),ADMIN_PASSWORD_HASH:await hashPassword(password),ADMIN_SESSION_SECRET:randomBytes(48).toString('hex')}});
const request=(path,opts={})=>fetch(origin+path,{redirect:'manual',...opts});
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await request('/admin/login')).ok){ready=true;break;}}catch{}await pause(300);}assert.ok(ready);
 assert.equal((await request('/api/admin/promotion-schedule')).status,401);
 assert.equal((await request('/api/admin/promotion-schedule',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await request('/api/promotion-worker',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"token":"invalid"}'})).status,401);
 const login=await request('/api/admin/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password})});
 const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
 const html=await (await request('/admin/store-apps',{headers:{Cookie:cookie}})).text();assert.match(html,/Shop by Brand/);assert.match(html,/Schedule time/);assert.match(html,/Run now/);assert.match(html,/Automatic schedule/);
 const auto=await request('/promotions/Amazon',{headers:{'x-vercel-ip-country':'CA'}});assert.equal(auto.headers.get('location'),'/promotions/Amazon/CA');
 assert.match(html,/\/promotions\/Amazon\/US/);assert.match(html,/\/promotions\/Amazon\/CA/);
 const caPage=await (await request('/promotions/Amazon/CA',{headers:{'x-vercel-ip-country':'CA'}})).text();assert.match(caPage,/<h1>Amazon Canada promotions<\/h1>/);assert.doesNotMatch(caPage,/Admin preview:/);
 const usPreview=await (await request('/promotions/Amazon/US',{headers:{Cookie:cookie,'x-vercel-ip-country':'CA'}})).text();assert.match(usPreview,/<h1>Amazon United States promotions<\/h1>/);assert.match(usPreview,/Admin preview:/);
 const caPreview=await (await request('/promotions/Amazon/CA',{headers:{Cookie:cookie,'x-vercel-ip-country':'US'}})).text();assert.match(caPreview,/<h1>Amazon Canada promotions<\/h1>/);
 const invalid=await request('/api/admin/promotion-schedule',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({enabled:true,time:'25:00',hours:24,market:'US'})});assert.equal(invalid.status,400);
 const unconfigured=await request('/api/admin/promotion-schedule',{headers:{Cookie:cookie}});assert.equal(unconfigured.status,503);assert.match((await unconfigured.json()).error,/Supabase/);
 console.log('Admin auth, CSRF, worker auth, schedule rendering, validation and unavailable-DB checks passed');
}finally{child.kill();await pause(500);await rm(dir,{recursive:true,force:true});}
