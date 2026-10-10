import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
import {resolve} from 'node:path';
import {hashPassword,createSession,SESSION_COOKIE} from '../lib/admin-security.ts';
const secret='local-only-walmart-preview-test-secret-2026';const hash=await hashPassword('1234');
const flyer=JSON.parse(await readFile('lib/walmart-flyer.json','utf8'));
const base='http://localhost:3198';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3198'],{windowsHide:true,stdio:'ignore',env:{...process.env,SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',CATALOG_DATA_FILE:resolve('.data/walmart-preview-test-unused.json'),ADMIN_SESSION_SECRET:secret,ADMIN_PASSWORD_HASH:hash}});
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/admin/login')).ok){ready=true;break;}}catch{}await pause(300);}assert.ok(ready);
 const unauth=await fetch(base+'/admin/walmart-flyer',{redirect:'manual'});assert.equal(unauth.status,307);
 assert.equal((await fetch(base+'/api/admin/walmart-flyer/card-01.jpg')).status,401);
 const headers={cookie:`${SESSION_COOKIE}=${createSession(secret,hash)}`};
 const html=await(await fetch(base+'/admin/walmart-flyer',{headers})).text();assert.ok(html.includes('Walmart product cards'));assert.ok(!html.includes('Rollback Set'));assert.ok(!html.includes('slider-set-heading'));assert.equal((html.match(/class="slide-promotion-type">Rollback/g)||[]).length,flyer.items.filter(i=>i.promotionType==='Rollback').length);assert.ok(html.includes('title="51053321">51053321</strong>'));assert.ok(html.includes('Save $1.09/lb'));assert.ok(html.includes('Sale information for Maple Leaf Prime chicken breasts'));assert.ok(html.includes('$6.34/lb'));assert.ok(!html.includes('Original PDF pages'));assert.ok(!html.includes('View source'));assert.equal((html.match(/class="slide-card product-card has-sale-footer"/g)||[]).length,flyer.items.length);assert.ok(html.includes('Previous product set'));assert.ok(html.includes('Next products in Product group 1'));
 assert.ok(html.includes('Online deal'));assert.ok(html.includes('Flyer price'));assert.ok(html.includes('From $4.97'));assert.ok(html.includes('Confirm price'));assert.ok(!html.includes('Save $0.00'));assert.ok(html.includes('value="24"'));
 assert.equal((html.match(/class="product-slider-track"/g)||[]).length,Math.ceil(flyer.items.length/10));
 // Every image is requested, including three-digit IDs and the final flyer page.
 for(const item of flyer.items){const r=await fetch(base+'/api/admin/walmart-flyer/'+item.imageFile,{headers});assert.equal(r.status,200,item.imageFile);assert.equal(r.headers.get('content-type'),'image/jpeg');assert.ok(r.headers.get('cache-control').includes('private'));assert.ok((await r.arrayBuffer()).byteLength>1000,item.imageFile);}
 assert.equal((await fetch(base+'/api/admin/walmart-flyer/not-allowed.jpg',{headers})).status,404);
 const trace=JSON.parse(await readFile('.next/server/app/api/admin/walmart-flyer/[file]/route.js.nft.json','utf8'));const assets=new Set(trace.files.filter(file=>file.includes('assets/admin/walmart-flyer/product-')&&file.endsWith('.jpg')).map(file=>file.split('/').at(-1)));for(const item of flyer.items)assert.ok(assets.has(item.imageFile),item.imageFile);
 console.log(`Admin authentication, ${flyer.items.length} cards and images, 10 per set, nullable prices, conflicts and deployment tracing passed.`);
}finally{child.kill();}
