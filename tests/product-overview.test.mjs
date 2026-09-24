import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {seedProducts,validUrl} from '../lib/catalog.ts';

function load(path,mocks={}){
  const require=createRequire(import.meta.url),exports={};
  const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(code,{exports,document:{body:{}},require:name=>name in mocks?mocks[name]:require(name)});
  return exports.default;
}
const mocks={
  react:{...React,useEffect:()=>{},useRef:()=>({current:null}),useId:()=> 'overview-title'},
  'react-dom':{createPortal:node=>node},
  'next/image':{default:({unoptimized,...props})=>React.createElement('img',props)},
  './brand-mark':{default:()=>null},
  '@/lib/catalog':{validUrl},
};
test('overview shows escaped description/options and only its store CTA contains the tracked link',()=>{
  const Overview=load('../app/product-overview.tsx',mocks);
  const product={...seedProducts[0],description:'Description <script>bad</script>',options:'Black, White',url:'https://www.amazon.com/dp/B09SV5ZV8H?tag=test-20'};
  const html=renderToStaticMarkup(React.createElement(Overview,{product,onClose:()=>{}}));
  assert.match(html,/Black, White/);assert.ok(!html.includes('<script>bad</script>'));
  assert.match(html,/Check current prices, discounts, coupons/);
  assert.equal([...html.matchAll(/href="\/go\//g)].length,1);
  assert.ok(html.includes('/go/'+product.id));assert.match(html,/rel="noopener noreferrer sponsored"/);
  const missing=renderToStaticMarkup(React.createElement(Overview,{product:{...product,url:'javascript:bad',options:''},onClose:()=>{}}));
  assert.ok(!missing.includes('href="/go/'));assert.ok(!missing.includes('<h3>Product options</h3>'));
});
test('product image opens an overview without a navigation or analytics request',()=>{
  const states=[];let index=0;
  const Slider=load('../app/product-slider.tsx',{
    ...mocks,react:{...mocks.react,useState:initial=>{const i=index++;return [initial,value=>states[i]=value];}},
    './product-description':{default:()=>null},'./product-overview':{default:()=>null},'./product-slider.css':{},
  });
  const product=seedProducts[0];
  const tree=Slider({name:'Tech Set 01',products:[product],saved:[],onSave:()=>{},tone:0});
  const find=node=>{if(!node||typeof node!=='object')return;if(node.props?.className==='slide-image-link')return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child);if(found)return found;}};
  const image=find(tree);assert.equal(image.type,'button');assert.equal(image.props['aria-haspopup'],'dialog');assert.equal(image.props.href,undefined);
  image.props.onClick();assert.equal(states[1],product.id);
  assert.ok(!renderToStaticMarkup(tree).includes('href="/go/'));
});
