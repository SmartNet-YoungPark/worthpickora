import test from "node:test";
import assert from "node:assert/strict";
import { sendCatalogPayload, DIRECT_SAVE_LIMIT } from "../lib/catalog-upload-client.ts";

test("large Unicode/image payloads use small requests and reassemble exactly",async()=>{
  const payload=JSON.stringify({name:"테스트 😀",image:"A".repeat(6*1024*1024)});
  const parts=[]; let finalized=false; const progress=[];
  const transport=async(url,options)=>{
    assert.ok(Buffer.byteLength(options.body)<2*1024*1024,"every request is below Vercel's body limit");
    const data=JSON.parse(options.body);
    if(data.action==="start") return Response.json({id:"upload"});
    if(data.action==="part") { parts[data.index]=Buffer.from(data.data,"base64"); return Response.json({ok:true}); }
    if(data.action==="complete") { assert.equal(Buffer.concat(parts).toString("utf8"),payload); finalized=true; return Response.json({ok:true}); }
    throw new Error("unexpected request");
  };
  assert.equal((await sendCatalogPayload(payload,transport,p=>progress.push(p))).status,200);
  assert.equal(finalized,true); assert.equal(progress.at(-1),100);
});
test("a failed part aborts without committing any products",async()=>{
  const actions=[];
  await assert.rejects(sendCatalogPayload("x".repeat(DIRECT_SAVE_LIMIT+1),async(url,options)=>{
    const {action}=JSON.parse(options.body); actions.push(action);
    return action==="start" ? Response.json({id:"upload"}) : action==="part" ? Response.json({error:"Offline"},{status:503}) : Response.json({ok:true});
  }),/Offline/);
  assert.deepEqual(actions,["start","part","abort"]);
});
test("small saves still use a single PUT",async()=>{
  await sendCatalogPayload("{}",async(url,options)=>{
    assert.equal(url,"/api/catalog");assert.equal(options.method,"PUT");return Response.json({ok:true});
  });
});

