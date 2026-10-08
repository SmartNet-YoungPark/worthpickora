"use client";
import {useState} from "react";
import Link from "next/link";
import flyer from "@/lib/walmart-flyer.json";
import {torontoDate} from "@/lib/click-analytics";
import type {Product} from "@/lib/catalog";
import ProductSlider,{SetNavigation} from "@/app/product-slider";
const money=(value:number)=>`$${value.toFixed(2)}`;
export default function FlyerCards(){
 const [query,setQuery]=useState("");
 const today=torontoDate();const status=today<flyer.startDate?"Upcoming":today>flyer.endDate?"Ended":"Within flyer dates";
 const items=flyer.items.filter(item=>`${item.name} ${item.storeCode} ${item.size}`.toLowerCase().includes(query.toLowerCase()));
 const products:Product[]=items.map((item,index)=>({id:item.id,name:item.name,code:item.storeCode,category:"Flyer",set:Math.floor(index/10)+1,store:"Walmart",brand:"",asin:"",url:"",image:`/api/admin/walmart-flyer/product-${item.id.slice(-2)}.jpg`,photo:null,status:"Draft",updated:flyer.startDate,
 description:`${item.size}
Product code: ${item.storeCode}
Promotion: Rollback
Original price: ${money(item.regularPrice)}${item.unit==="lb"?"/lb":""}
Flyer price: ${money(item.salePrice)}${item.unit==="lb"?"/lb":""}
Savings: ${money(item.savings)}${item.unit==="lb"?" per lb":""}
Currency: CAD
Flyer dates: ${flyer.startDate} to ${flyer.endDate}
Status: ${status}`}));
 const saleFooters=Object.fromEntries(items.map(item=>[item.id,{promotionType:"Rollback",price:money(item.salePrice)+(item.unit==="lb"?"/lb":""),previousPrice:money(item.regularPrice)+(item.unit==="lb"?"/lb":""),savings:`Save ${money(item.savings)}${item.unit==="lb"?"/lb":""}`} ]));
 const sets=Array.from({length:Math.ceil(products.length/10)},(_,i)=>products.slice(i*10,i*10+10));
 return <main className="walmart-admin"><nav><Link href="/admin/products">Products</Link><Link href="/admin/store-apps">Store apps & offers</Link></nav>
 <header><div><p className="walmart-kicker">ADMIN PREVIEW / CANADA</p><h1>Walmart product cards</h1><p>{flyer.startDate} - {flyer.endDate} / {status}</p></div></header>
 <div className="walmart-controls"><label>Find a product or code<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name, code or size"/></label><span role="status">{items.length} products / up to 10 per set</span></div>
 <p className="walmart-details-hint">Select ? for prices, savings, specifications and promotion conditions. These 14 cards are verified from the supplied flyer, not a live stock check.</p>
 <section aria-label="Walmart flyer product sets">{sets.map((set,index)=><ProductSlider key={`${query}-${index}`} name={`Product group ${index+1}`} products={set} saved={[]} onSave={()=>{}} tone={index} detailsOnly hideSetHeading showProductCode saleFooters={saleFooters}/>)}</section>
 {!items.length&&<p>No matching products.</p>}<SetNavigation/>
 </main>;
}
