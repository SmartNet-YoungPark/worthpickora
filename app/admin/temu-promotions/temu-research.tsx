"use client";
import {useState} from "react";
import Link from "next/link";
import type {StoreLink} from "@/lib/store-apps";
import {TEMU_PROMOTION_RESEARCH,TEMU_RESEARCH_DATE,TEMU_EXPIRED_REFERENCE} from "@/lib/temu-promotion-research";
export default function TemuResearch({links,error}:{links:StoreLink[];error:string}){
 const [market,setMarket]=useState<"US"|"CA">("CA");
 const saved=links.filter(link=>link.market===market);
 const unassigned=links.filter(link=>!link.market);
 return <>
 <header><span className="temu-eyebrow">ADMIN RESEARCH · OFFICIAL SOURCES</span><h1>Temu promotions</h1><p>Review campaign rules before creating a customer-facing offer.</p><div className="temu-markets" role="group" aria-label="Temu marketplace">{(["CA","US"] as const).map(value=><button key={value} aria-pressed={market===value} onClick={()=>setMarket(value)}>{value==="CA"?"Canada · CAD":"United States · USD"}</button>)}</div></header>
 <div className="temu-notice"><strong>{market==="CA"?"Canada":"United States"}: product offers need verification</strong><p>No current product price, coupon amount or expiry was verified during this research. These cards describe documented promotion types, not active offers. Market selection does not establish local eligibility.</p><small>Sources reviewed: {TEMU_RESEARCH_DATE}. Source links are research references, not your affiliate links.</small></div>
 <section aria-labelledby="temu-types"><h2 id="temu-types">Promotion types & conditions</h2><div className="temu-research-grid">{TEMU_PROMOTION_RESEARCH.map((item,index)=><article key={item.id} className={`temu-research-card color-${index}`}><div className="temu-card-heading"><span aria-hidden="true" className="temu-type-icon">{item.icon}</span><span className="temu-status">Needs market verification</span></div><h3>{item.title}</h3><p>{item.summary}</p><details><summary>What to verify</summary><p>{item.check}</p></details><footer><small>{item.scope}</small><a href={item.source} target="_blank" rel="noopener noreferrer">{item.sourceLabel} ↗</a></footer></article>)}</div></section>
 <section className="temu-saved" aria-labelledby="temu-saved-title"><h2 id="temu-saved-title">Saved {market} offers ({saved.length})</h2>{error?<p role="alert">{error}</p>:saved.length?<ul>{saved.map(link=><li key={link.id}><strong>{link.title}</strong><span>{link.verificationState==="confirmed"?"Previously marked confirmed — recheck source before use":"Verification needed"}</span><a href={link.url} target="_blank" rel="noopener noreferrer">Open saved link ↗</a></li>)}</ul>:<p>No saved Temu offers assigned to this market.</p>}{unassigned.length>0&&<p>{unassigned.length} saved Temu offer(s) have no marketplace. Assign US or Canada in the offer editor.</p>}<Link className="temu-edit" href="/admin/store-apps">Manage saved offers</Link></section>
 <details className="temu-expired"><summary>Expired reference — excluded from current offers</summary><h3>{TEMU_EXPIRED_REFERENCE.title}</h3><p>{TEMU_EXPIRED_REFERENCE.note}</p><p>Ended: {TEMU_EXPIRED_REFERENCE.endsOn} ({TEMU_EXPIRED_REFERENCE.timeZone})</p><a href={TEMU_EXPIRED_REFERENCE.source} target="_blank" rel="noopener noreferrer">Read original rules ↗</a></details>
 </>;
}
