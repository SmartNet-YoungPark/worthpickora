import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as analytics from '../lib/click-analytics.ts';

function harness(rows){
  let state=0;
  const values=new Map([[3,rows],[7,false]]);
  const hooks={...React,useEffect:()=>{},useMemo:fn=>fn(),useState:initial=>{
    const index=state++;
    if(!values.has(index))values.set(index,typeof initial==='function'?initial():initial);
    return [values.get(index),value=>values.set(index,typeof value==='function'?value(values.get(index)):value)];
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
  return {values,render(){state=0;const tree=exports.default();return {tree,html:renderToStaticMarkup(tree)};}};
}

test('compact controls select yearly trends and preview deletion without deleting',()=>{
  const page=harness([]);
  const find=(node,predicate)=>{
    if(!node||typeof node!=='object')return;
    if(predicate(node))return node;
    for(const child of React.Children.toArray(node.props?.children)){const match=find(child,predicate);if(match)return match;}
  };
  let tree=page.render().tree;
  const trends=find(tree,node=>node.props?.['aria-label']==='Trend interval');
  find(trends,node=>node.type==='button'&&node.props.children==='Yearly').props.onClick();
  assert.match(page.render().html,/Current interval: Yearly/);
  tree=page.render().tree;
  const deletion=find(tree,node=>node.props?.['aria-label']==='Delete product click statistics');
  find(deletion,node=>node.type==='button'&&React.Children.toArray(node.props.children).join('')==='Delete Monthly').props.onClick();
  const html=page.render().html;
  const range=analytics.calendarRange(analytics.torontoDate(),'month');
  assert.ok(html.includes(range.start+' through '+range.end));
  assert.match(html,/This cannot be undone/);
  assert.match(html,/Delete permanently/);
  assert.equal(page.values.get(19),false);
  tree=page.render().tree;
  find(tree,node=>node.type==='button'&&node.props.children==='Cancel').props.onClick();
  assert.ok(!page.render().html.includes('role="alertdialog"'));
});

test('rendered analytics headers match separate ID, product, clicks and store cells',()=>{
  const row={click_date:analytics.torontoDate(),product_id:'product-1',product_code:'T001',product_name:'Sample product',set_name:'Tech Set 01',category_name:'Tech',store_name:'Amazon',source:'YouTube',device:'Mobile',clicks:7};
  const {html}=harness([row]).render();
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

test('changing date inputs applies the range and recalculates unique clicked products',()=>{
  const today=analytics.torontoDate(),yesterday=analytics.shiftDate(today,-1);
  const base={product_code:'T001',product_name:'Sample',set_name:'Tech Set 01',category_name:'Tech',store_name:'Amazon',source:'YouTube',device:'Mobile',clicks:1};
  const page=harness([
    {...base,click_date:yesterday,product_id:'a'},
    {...base,click_date:today,product_id:'a'},
    {...base,click_date:today,product_id:'b'},
    {...base,click_date:today,product_id:'b',source:'TikTok'},
    {...base,click_date:today,product_id:'zero',clicks:0},
  ]);
  const find=(node,predicate)=>{
    if(!node||typeof node!=='object')return undefined;
    if(predicate(node))return node;
    for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found;}
  };
  const count=html=>Number(html.match(/<span>Products clicked<\/span><strong>(\d+)<\/strong>/)?.[1]);
  assert.equal(count(page.render().html),2);
  let tree=page.render().tree;
  find(tree,n=>n.type==='input'&&n.props.type==='date').props.onChange({target:{value:yesterday}});
  tree=page.render().tree;
  const through=find(tree,n=>n.type==='label'&&React.Children.toArray(n.props.children)[0]==='Through');
  find(through,n=>n.type==='input').props.onChange({target:{value:yesterday}});
  assert.deepEqual(JSON.parse(JSON.stringify(page.values.get(2))),{start:yesterday,end:yesterday});
  assert.ok(!page.render().html.includes('<span>Products clicked</span>'),'old totals hidden while loading');
  page.values.set(7,false);
  assert.equal(count(page.render().html),1);
  tree=page.render().tree;
  const label=find(tree,n=>n.type==='label'&&React.Children.toArray(n.props.children)[0]==='Through');
  find(label,n=>n.type==='input').props.onChange({target:{value:today}});
  page.values.set(7,false);
  assert.equal(count(page.render().html),2);
});
