import test from "node:test";
import assert from "node:assert/strict";
import { groupProductSets } from "../lib/set-groups.ts";
test("sets are grouped into five populated rows in numeric order",()=>{
  for(const count of [4,5,6,10,11]){
    const sets=Array.from({length:count},(_,i)=>i+1);
    const groups=groupProductSets(sets);
    assert.deepEqual(groups.flat(),sets);
    assert.ok(groups.every(group=>group.length<=5));
    assert.equal(groups.length,Math.ceil(count/5));
  }
  assert.deepEqual(groupProductSets([20,1,6,3,9,10,1]),[[1,3,6,9,10],[20]]);
  assert.deepEqual(groupProductSets([]),[]);
});

