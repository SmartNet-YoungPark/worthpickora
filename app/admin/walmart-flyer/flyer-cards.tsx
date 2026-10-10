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
 const [page,setPage]=useState(0);
 const today=torontoDate();const status=today<flyer.startDate?"Upcoming":today>flyer.endDate?"Ended":"Within flyer dates";
 const items=flyer.items.filter(item=>(!page||item.sourcePages.includes(page))&&`${item.name} ${item.storeCode} ${item.size}`.toLowerCase().includes(query.toLowerCase()));
 const products:Product[]=items.map((item,index)=>({id:item.id,name:item.name,code:item.storeCode,category:"Flyer",set:Math.floor(index/10)+1,store:"Walmart",brand:"",asin:"",url:"",image:`/api/admin/walmart-flyer/${item.imageFile}`,photo:null,status:"Draft",updated:flyer.startDate,
 description:[item.size,`Product code: ${item.storeCode}`,`Promotion: ${item.promotionType}`,
 item.regularPrice!==null&&!item.priceConflict?`Was: ${money(item.regularPrice)}${item.unit==="lb"?"/lb":""}`:null,
 item.priceConflict?null:`Flyer price: ${item.pricePrefix}${money(item.salePrice)}${item.unit==="lb"?"/lb":""}`,
 item.savings!==null&&!item.priceConflict?`Savings: ${money(item.savings)}${item.unit==="lb"?" per lb":""}`:null,
 item.conditions||null,"Currency: CAD",`Flyer dates: ${flyer.startDate} to ${flyer.endDate}`,`Status: ${status}`].filter(Boolean).join("\n")}));
 const saleFooters=Object.fromEntries(items.map(item=>[item.id,{promotionType:item.promotionType,
 price:item.priceConflict?"Confirm price":item.pricePrefix+money(item.salePrice)+(item.unit==="lb"?"/lb":""),
 previousPrice:item.regularPrice!==null&&!item.priceConflict?money(item.regularPrice)+(item.unit==="lb"?"/lb":""):"",
 savings:item.savings!==null&&!item.priceConflict?`Save ${money(item.savings)}${item.unit==="lb"?"/lb":""}`:""} ]));
 const sets=Array.from({length:Math.ceil(products.length/10)},(_,i)=>products.slice(i*10,i*10+10));
 return <main className="walmart-admin"><nav><Link href="/admin/products">Products</Link><Link href="/admin/store-apps">Store apps & offers</Link></nav>
 <header><div><p className="walmart-kicker">ADMIN PREVIEW / CANADA</p><h1>Walmart product cards</h1><p>{flyer.startDate} - {flyer.endDate} / {status}</p></div></header>
 <div className="walmart-controls"><label>Find a product or code<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name, code or size"/></label><label className="walmart-page-filter">Flyer section<select value={page} onChange={event=>setPage(Number(event.target.value))}><option value={0}>All products</option>{flyer.review.productPages.map(value=><option key={value} value={value}>Page {value}</option>)}</select></label><span role="status">{items.length} / {flyer.items.length} offers · up to 10 per set</span></div>
 <p className="walmart-details-hint">All {flyer.pageCount} flyer pages reviewed. Repeated offers appear once; service ads are excluded. Select ? for prices, sizes and offer conditions. Availability is not checked live.</p>
 <section aria-label="Walmart flyer product sets">{sets.map((set,index)=><ProductSlider key={`${page}-${query}-${index}`} name={`Product group ${index+1}`} products={set} saved={[]} onSave={()=>{}} tone={index} detailsOnly hideSetHeading showProductCode saleFooters={saleFooters}/>)}</section>
 {!items.length&&<p>No matching products.</p>}<SetNavigation/>
 </main>;
}
