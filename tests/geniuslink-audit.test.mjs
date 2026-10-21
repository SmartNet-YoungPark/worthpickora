import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {geniuslinkAuditScript} from '../lib/geniuslink-audit.ts';
function environment(search,links=[]){
 const events={},calls={clear:0,logs:[],warnings:[],tables:[]},timers=new Map();let id=0;const observation={};
 const context={URLSearchParams,window:{location:{search},addEventListener:(name,fn)=>events[name]=fn},document:{readyState:'complete',body:{},querySelectorAll:()=>links},console:{clear:()=>calls.clear++,log:(...v)=>calls.logs.push(v),warn:v=>calls.warnings.push(v),table:v=>calls.tables.push(v)},MutationObserver:class{constructor(fn){observation.callback=fn;}observe(node,options){observation.options=options;}disconnect(){observation.disconnected=true;}},setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:key=>timers.delete(key)};
 vm.runInNewContext(geniuslinkAuditScript,context);return {context,calls,timers,events,observation};
}
test('normal visitors get no audit, console clearing, observers or highlights',()=>{
 const e=environment('');assert.equal(e.calls.clear,0);assert.equal(e.timers.size,0);assert.equal(e.context.window.geniuslinkAudit,undefined);assert.equal(e.observation.options,undefined);
});
test('debug audit reports image/text URLs and highlights without modifying destinations',()=>{
 const links=[{querySelector:()=>({alt:'Vacuum'}),style:{},href:'https://buy.geni.us/a',innerText:''},{querySelector:()=>null,style:{},href:'https://buy.geni.us/b',innerText:' Buy now '}];
 const e=environment('?geniusDebug=1',links);assert.equal(e.timers.size,1);[...e.timers.values()][0]();
 assert.equal(e.calls.tables[0].length,2);assert.equal(e.calls.tables[0][0]['Label / Alt Text'],'[IMAGE] Vacuum');assert.equal(e.calls.tables[0][1]['Label / Alt Text'],'Buy now');assert.equal(links[0].style.outline,'3px solid #28a745');assert.equal(links[0].href,'https://buy.geni.us/a');
 assert.deepEqual(Array.from(e.observation.options.attributeFilter),['href']);e.events.pagehide();assert.equal(e.observation.disconnected,true);
});
test('debug audit warns when conversion is absent',()=>{const e=environment('?geniusDebug=1');e.context.window.geniuslinkAudit();assert.equal(e.calls.warnings.length,1);assert.equal(e.calls.tables.length,0);});
