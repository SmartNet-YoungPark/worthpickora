"use client";
import Link from "next/link";
import BrandMark from "./brand-mark";
import {type ReactNode} from "react";
import {STORE_APPS,type StoreLink} from "@/lib/store-apps";
export default function StoreAppGuide({links=[],brand="",onBrandChange,children}:{links?:StoreLink[];brand?:string;onBrandChange?:(store:string)=>void;children?:ReactNode}){
  const stores=[...new Set([...STORE_APPS.map(app=>app.store),...links.map(link=>link.store)])];
  return <section className="brand-section store-links-guide store-promotion-guide combined-brand-section" aria-label="Shop by brand and promotions">{children||<h2>Shop by Brand</h2>}
    <div className="brand-list combined-store-list" aria-label="Stores and available promotions">{stores.map(store=>{const count=links.filter(link=>link.store===store).length;return <div className="combined-store-item" key={store}><button type="button" className={`brand-button ${brand===store?"active":""}`} aria-pressed={brand===store} onClick={()=>onBrandChange?.(brand===store?"":store)}><BrandMark brand={store}/><span>{store}</span>{brand===store&&<span className="brand-selected-dot"/>}</button>{count>0&&<Link href={`/promotions/${encodeURIComponent(store)}`} prefetch={false} aria-label={`${store}: ${count} promotion${count===1?"":"s"}`} className="store-promotion-trigger"><span>Store apps &amp; offers</span><span className="store-promotion-count" aria-hidden="true">{count}</span></Link>}</div>;})}</div>
  </section>;
}
