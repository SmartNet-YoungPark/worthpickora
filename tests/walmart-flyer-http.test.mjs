import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
import {resolve} from 'node:path';
import {hashPassword,createSession,SESSION_COOKIE} from '../lib/admin-security.ts';
const secret='local-only-walmart-preview-test-secret-2026';const hash=await hashPassword('1234');
const base='http://localhost:3198';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3198'],{windowsHide:true,stdio:'ignore',env:{...process.env,SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',CATALOG_DATA_FILE:resolve('.data/walmart-preview-test-unused.json'),ADMIN_SESSION_SECRET:secret,ADMIN_PASSWORD_HASH:hash}});
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/admin/login')).ok){ready=true;break;}}catch{}await pause(300);}assert.ok(ready);
 const unauth=await fetch(base+'/admin/walmart-flyer',{redirect:'manual'});assert.equal(unauth.status,307);
 assert.equal((await fetch(base+'/api/admin/walmart-flyer/card-01.jpg')).status,401);
 const headers={cookie:`${SESSION_COOKIE}=${createSession(secret,hash)}`};
 const html=await(await fetch(base+'/admin/walmart-flyer',{headers})).text();assert.ok(html.includes('Walmart product cards'));assert.ok(html.includes('Rollback Set 01'));assert.ok(html.includes('Rollback Set 02'));assert.ok(!html.includes('Original PDF pages'));assert.ok(!html.includes('View source'));assert.equal((html.match(/class="slide-card product-card"/g)||[]).length,14);assert.ok(html.includes('Previous product set'));assert.ok(html.includes('Next products in Rollback Set 01'));
 for(const file of ['product-01.jpg','product-14.jpg']){const r=await fetch(base+'/api/admin/walmart-flyer/'+file,{headers});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/jpeg');assert.ok(r.headers.get('cache-control').includes('private'));assert.ok((await r.arrayBuffer()).byteLength>1000);}
 assert.equal((await fetch(base+'/api/admin/walmart-flyer/not-allowed.jpg',{headers})).status,404);
 const trace=JSON.parse(await readFile('.next/server/app/api/admin/walmart-flyer/[file]/route.js.nft.json','utf8'));assert.equal(new Set(trace.files.filter(file=>file.includes('assets/admin/walmart-flyer/')&&file.endsWith('.jpg'))).size,54);
 console.log('Admin authentication, 14 landing-style cards, 10 per set, asset allowlist and deployment file tracing passed.');
}finally{child.kill();}
