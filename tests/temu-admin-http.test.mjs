import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
import {resolve} from 'node:path';
import {hashPassword,createSession,SESSION_COOKIE} from '../lib/admin-security.ts';
const secret='local-temu-admin-test-session-secret-2026';
const hash=await hashPassword('1234');
const base='http://localhost:3197';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3197'],{windowsHide:true,stdio:'ignore',env:{...process.env,SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',CATALOG_DATA_FILE:resolve('.data/temu-test-unused.json'),STORE_APPS_DATA_FILE:resolve('.data/temu-test-unused-links.json'),ADMIN_SESSION_SECRET:secret,ADMIN_PASSWORD_HASH:hash}});
try{
 let ready=false;for(let n=0;n<60;n++){try{if((await fetch(base+'/admin/login')).ok){ready=true;break;}}catch{}await pause(300);}assert.ok(ready);
 assert.equal((await fetch(base+'/admin/temu-promotions',{redirect:'manual'})).status,307);
 const response=await fetch(base+'/admin/temu-promotions',{headers:{cookie:`${SESSION_COOKIE}=${createSession(secret,hash)}`}});
 assert.equal(response.status,200);
 const html=await response.text();
 assert.equal((html.match(/class="temu-research-card color-/g)||[]).length,6);
 for(const text of ['No current product price','2023-09-03','Needs market verification','United States','Canada','Official affiliate FAQ','Coupon bundles','Credit back / Win Credit'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('aff07203'),'Do not import somebody else\'s affiliate code');
 assert.ok(html.includes('noindex'));
 console.log('Temu admin authentication, six sourced research cards, market controls and expired-reference separation passed.');
}finally{child.kill();}
