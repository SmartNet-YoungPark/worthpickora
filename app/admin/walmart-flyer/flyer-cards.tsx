"use client";
import {useRef,useState} from "react";
import Link from "next/link";
import flyer from "@/lib/walmart-flyer.json";
import {torontoDate} from "@/lib/click-analytics";
const asset=(file:string)=>`/api/admin/walmart-flyer/${file}.jpg`;
const money=(value:number)=>`$${value.toFixed(2)}`;
export default function FlyerCards(){
 const [query,setQuery]=useState("");const [page,setPage]=useState(1);
 const viewer=useRef<HTMLElement>(null);
 const today=torontoDate();const status=today<flyer.startDate?"Upcoming":today>flyer.endDate?"Ended":"Within flyer dates";
 const items=flyer.items.filter(item=>`${item.name} ${item.storeCode} ${item.size}`.toLowerCase().includes(query.toLowerCase()));
 function openPage(value:number){setPage(value);viewer.current?.scrollIntoView({behavior:"smooth",block:"start"});viewer.current?.focus({preventScroll:true});}
 return <main className="walmart-admin"><nav><Link href="/admin/products">? Products</Link><Link href="/admin/store-apps">Store apps & offers</Link></nav>
 <header><div><p className="walmart-kicker">ADMIN PREVIEW ? CANADA</p><h1>Walmart PDF cards</h1><p>Source: your uploaded flyer.pdf ? {flyer.pageCount} pages</p></div><span className="walmart-period">{status}<br/>{flyer.startDate} ? {flyer.endDate}</span></header>
 <aside className="walmart-source-note">14 Rollback offers verified from PDF pages 1?2. All 26 source pages are available below. Prices are CAD; these are flyer prices, not a live stock check. Selected varieties, sizes and store availability apply. UPC/GTIN and exact cross-store variant matches are not yet verified. This preview is separate from published promotions.</aside>
 <div className="walmart-controls"><label>Find a product or Walmart code<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name, code or size"/></label><button type="button" onClick={()=>openPage(page)}>View all PDF pages</button><span role="status">{items.length} product cards</span></div>
 <section className="walmart-card-grid" aria-label="Walmart flyer product cards">{items.map(item=><article key={item.id} className="walmart-flyer-card"><div className="walmart-card-top"><span>Walmart #{item.storeCode}</span><b>Rollback</b></div><button className="walmart-source-image" onClick={()=>openPage(item.page)} aria-label={`View ${item.name} in PDF page ${item.page}`}><img src={asset(item.id)} alt={`Original flyer excerpt for ${item.name}`} loading="lazy"/></button><div className="walmart-card-body"><h2>{item.name}</h2><p>{item.size}</p><div className="walmart-price"><strong>{money(item.salePrice)}{item.unit==="lb"?"/lb":""}</strong><del>{money(item.regularPrice)}{item.unit==="lb"?"/lb":""}</del></div><p className="walmart-savings">Save {money(item.savings)}{item.unit==="lb"?" per lb":""}</p><button onClick={()=>openPage(item.page)}>View source ? page {item.page}</button></div></article>)}</section>
 {!items.length&&<p>No matching cards. Other products may be visible in the PDF pages below.</p>}
 <section ref={viewer} tabIndex={-1} className="walmart-pdf-viewer" aria-label="Original PDF page viewer"><h2>Original PDF pages</h2><div className="walmart-page-controls"><button disabled={page===1} onClick={()=>setPage(value=>value-1)}>Previous</button><label>Page <select value={page} onChange={event=>setPage(Number(event.target.value))}>{Array.from({length:flyer.pageCount},(_,i)=><option value={i+1} key={i+1}>{i+1} / {flyer.pageCount}</option>)}</select></label><button disabled={page===flyer.pageCount} onClick={()=>setPage(value=>value+1)}>Next</button><a href={asset(`page-${String(page).padStart(2,"0")}`)} target="_blank" rel="noopener noreferrer">Open full-size page ?</a></div><img key={page} className="walmart-full-page" src={asset(`page-${String(page).padStart(2,"0")}`)} alt={`Walmart flyer source page ${page} of ${flyer.pageCount}`}/></section>
 </main>;
}
