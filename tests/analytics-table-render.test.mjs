import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as analytics from '../lib/click-analytics.ts';

test('rendered analytics headers match separate ID, product, clicks and store cells',()=>{
  const row={click_date:analytics.torontoDate(),product_id:'product-1',product_code:'T001',product_name:'Sample product',set_name:'Tech Set 01',category_name:'Tech',store_name:'Amazon',source:'YouTube',device:'Mobile',clicks:7};
  let state=0;
  const hooks={...React,useEffect:()=>{},useMemo:fn=>fn(),useState:initial=>{
    const value=state++===3?[row]:typeof initial==='function'?initial():initial;
    return [value,()=>{}];
  }};
  const require=createRequire(import.meta.url);
  const load=name=>{
    if(name==='react')return hooks;
    if(name==='next/link')return {default:props=>React.createElement('a',props)};
    if(name==='@/lib/catalog')return {STORES:['Amazon']};
    if(name==='@/lib/click-attribution')return {CLICK_SOURCES:['YouTube'],CLICK_DEVICES:['Mobile']};
    if(name==='@/lib/click-analytics')return analytics;
    return require(name);
  };
  const source=readFileSync(new URL('../app/admin/analytics/click-analytics.tsx',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  runInNewContext(code,{exports,require:load,URLSearchParams,AbortController});
  const html=renderToStaticMarkup(React.createElement(exports.default));
  const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)].map(match=>match[1]);
  const text=value=>value.replace(/<[^>]+>/g,'');
  const cells=(table,tag)=>[...table.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,'g'))].map(match=>text(match[1]));
  const detail=tables.find(table=>cells(table,'th')[0]==='Date');
  assert.ok(detail);
  assert.deepEqual(cells(detail,'th'),['Date','Set','ID','Product','Clicks','Store','Source','Device']);
  assert.deepEqual(cells(detail,'td'),[row.click_date,'Tech Set 01','T001product-1','Sample product','7','Amazon','YouTube','Mobile']);
  const daily=tables.find(table=>cells(table,'th')[0]==='ID'&&cells(table,'td').length);
  assert.ok(daily);
  assert.deepEqual(cells(daily,'th'),['ID','Product','Clicks','Store']);
  assert.deepEqual(cells(daily,'td'),['T001product-1','Sample product','7','Amazon']);
});
