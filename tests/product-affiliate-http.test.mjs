import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFile,unlink,mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import {seedProducts} from '../lib/catalog.ts';
const path=resolve('.data/regional-routing-test.json'),analytics=path+'.clicks.json',origin='http://localhost:3197';
await mkdir(resolve('.data'),{recursive:true});
const p={...seedProducts[0],id:'regional-test',status:'Published',urlUS:'https://www.amazon.com/dp/B012345678?th=1&tag=provided-us-77',urlCA:'https://www.amazon.ca/dp/B087654321?th=2&tag=provided-ca-88'};
await writeFile(path,JSON.stringify({products:[p],categories:[p.category],revision:'test'}));
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3197'],{windowsHide:true,stdio:'ignore',env:{...process.env,SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',CATALOG_DATA_FILE:path,ANALYTICS_DATA_FILE:analytics}});
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin+'/admin/login')).ok){ready=true;break;}}catch{}await pause(300);}assert.ok(ready);
 for(const [country,asin,tag] of [['CA','B087654321','provided-ca-88'],['US','B012345678','provided-us-77']]){
 const r=await fetch(origin+'/go/regional-test',{redirect:'manual',headers:{'x-vercel-ip-country':country,'user-agent':'Mozilla/5.0'}});assert.equal(r.status,302);const u=new URL(r.headers.get('location'));assert.ok(u.pathname.endsWith(asin));assert.equal(u.searchParams.get('tag'),tag);
 }
 assert.equal(JSON.parse(await readFile(analytics,'utf8')).reduce((n,r)=>n+r.clicks,0),2);
 await writeFile(analytics,'invalid json');
 const fallback=await fetch(origin+'/go/regional-test',{redirect:'manual',headers:{'x-vercel-ip-country':'CA','user-agent':'Mozilla/5.0'}});assert.equal(fallback.status,302);assert.equal(new URL(fallback.headers.get('location')).searchParams.get('tag'),'provided-ca-88');assert.equal(fallback.headers.get('x-click-recorded'),'false');
 const draft={...p,status:'Draft'};await writeFile(path,JSON.stringify({products:[draft],categories:[p.category],revision:'test2'}));assert.equal((await fetch(origin+'/go/regional-test',{redirect:'manual'})).status,404);
 console.log('US/CA redirects, analytics totals, failure fallback and draft exclusion passed');
}finally{child.kill();await pause(300);await unlink(path).catch(()=>{});await unlink(analytics).catch(()=>{});}
