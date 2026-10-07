"use client";
import BrandMark from "./brand-mark";
import {useState,type ReactNode} from "react";
import {STORE_APPS,type StoreLink} from "@/lib/store-apps";
export default function StoreAppGuide({links=[],brand="",onBrandChange,children}:{links?:StoreLink[];brand?:string;onBrandChange?:(store:string)=>void;children?:ReactNode}){
  const [pendingStore,setPendingStore]=useState("");
  const stores=[...new Set([...STORE_APPS.map(app=>app.store),...links.map(link=>link.store)])];
  return <section className="brand-section store-links-guide store-promotion-guide combined-brand-section" aria-label="Shop by brand">{children||<h2>Shop by Brand</h2>}
    <div className="brand-list combined-store-list" aria-label="Stores">{stores.map(store=>{return <div className="combined-store-item" key={store}><button type="button" className={`brand-button ${brand===store?"active":""}`} aria-pressed={brand===store} onClick={()=>{if(store.toLowerCase()!=="amazon"){setPendingStore(store);return;}setPendingStore("");onBrandChange?.(brand===store?"":store);}}><BrandMark brand={store}/><span>{store}</span>{brand===store&&<span className="brand-selected-dot"/>}</button></div>;})}</div>
    {pendingStore&&<div className="store-work-notice" role="status"><div><strong>{pendingStore} ? ???</strong><p>Work in progress. This store will be available soon.</p></div><button type="button" onClick={()=>setPendingStore("")} aria-label="Dismiss store notice">?</button></div>}
  </section>;
}
