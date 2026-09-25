"use client";
import BrandMark from "./brand-mark";
import {useState,useId,type CSSProperties} from "react";
import {STORE_APPS,type StoreLink} from "@/lib/store-apps";
export default function StoreAppGuide({links=[]}:{links?:StoreLink[]}){
  const [selected,setSelected]=useState<string|null>(null);
  const panelId=useId();
  const accents=[{ink:"#9a3412",background:"#fff1e5",border:"#f3bd91"},{ink:"#6b21a8",background:"#f5edff",border:"#d8b9ee"},{ink:"#075985",background:"#eaf6ff",border:"#a5d3eb"},{ink:"#9d174d",background:"#fff0f5",border:"#efb3ca"},{ink:"#166534",background:"#ecf8ee",border:"#afd9b8"},{ink:"#854d0e",background:"#fff8df",border:"#e7d28b"}];
  function offerStyle(id:string):CSSProperties{const accent=accents[Math.max(0,links.findIndex(link=>link.id===id))%accents.length];return {"--offer-ink":accent.ink,"--offer-background":accent.background,"--offer-border":accent.border} as CSSProperties;}
  const entries=[...STORE_APPS.map(app=>({id:app.id,store:app.store,title:app.label,url:app.url,description:app.store==="Amazon"?`Amazon Shopping for ${app.label}.`:`Find ${app.store}'s official app information.`,sponsored:false})),...links.map(link=>({...link,sponsored:true}))];
  const stores=[...new Set(entries.map(link=>link.store))];
  return <section className="store-app-guide store-links-guide store-promotion-guide" aria-label="Store apps and offers"><h2>Store apps &amp; offers</h2><p className="store-promotion-hint">Choose a store to explore its promotions.</p>
    <div className="store-promotion-buttons" aria-label="Choose a promotion store">{stores.map((store,index)=><button type="button" key={store} id={`${panelId}-button-${index}`} aria-expanded={selected===store} aria-controls={`${panelId}-${index}`} className={selected===store?"active":""} onClick={()=>setSelected(selected===store?null:store)}><BrandMark brand={store}/><span>{store}</span></button>)}</div>
    {stores.map((store,index)=><section key={store} id={`${panelId}-${index}`} className="store-links-group store-promotion-panel" hidden={selected!==store} aria-labelledby={`${panelId}-button-${index}`}><h3>{store} promotions</h3>
      {links.some(link=>link.store===store)?<ul>{links.filter(link=>link.store===store).map(link=><li key={link.id} className="store-offer-highlight" style={offerStyle(link.id)}><a href={`/store-app/${link.id}`} target="_blank" rel="noopener noreferrer sponsored"><span>{link.title}</span><span aria-hidden="true">↗</span></a><span className="store-link-host">{new URL(link.url).hostname}</span>{link.description&&<p className="store-link-description" title={link.description}>{link.description}</p>}</li>)}</ul>:<p className="store-promotion-empty">No promotion links have been added for this store yet.</p>}
      {STORE_APPS.some(app=>app.store===store)&&<details className="store-promotion-apps"><summary>Official app links</summary><ul>{STORE_APPS.filter(app=>app.store===store).map(app=><li key={app.id}><a href={`/store-app/${app.id}`} target="_blank" rel="noopener noreferrer"><span>{app.label}</span><span aria-hidden="true">↗</span></a></li>)}</ul></details>}
      <p className="store-links-note">Check offer eligibility and terms at the store. We may earn a commission from qualifying purchases.</p></section>)}
  </section>;
}
