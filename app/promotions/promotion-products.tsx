"use client";
import {useEffect,useState} from "react";
import ProductSlider,{SetNavigation} from "../product-slider";
import type {StoreLink} from "@/lib/store-apps";
import {PROMOTION_TYPES,promotionSetAssignments} from "@/lib/promotion-types";
import type {Product} from "@/lib/catalog";

export default function PromotionProducts({offers}:{offers:StoreLink[]}){
  const [query,setQuery]=useState(""),[saved,setSaved]=useState<string[]>([]),[savedOnly,setSavedOnly]=useState(false);
  useEffect(()=>{try{const value=JSON.parse(localStorage.getItem("worthpickora-promotion-saved")||"[]");if(Array.isArray(value))setSaved(value.filter(id=>typeof id==="string"));}catch{}},[]);
  function toggleSave(id:string){setSaved(current=>{const next=current.includes(id)?current.filter(value=>value!==id):[...current,id];try{localStorage.setItem("worthpickora-promotion-saved",JSON.stringify(next));}catch{}return next;});}
  const codes=Object.fromEntries(offers.map(offer=>[offer.id,offer.offerType==="promo-code"?offer.promoCode?.trim()||"":""]));
  const assignments=promotionSetAssignments(offers);
  const discounts=Object.fromEntries(offers.filter(offer=>typeof offer.discountPercent==="number").map(offer=>[offer.id,{percent:offer.discountPercent!,label:PROMOTION_TYPES.find(type=>type.value===offer.offerType)?.label||"Offer"}]));
  const products:Product[]=assignments.map(({offer,type,set},index)=>({id:offer.id,name:offer.title,code:`P${String(index+1).padStart(3,"0")}`,description:[offer.discountPercent?`${type.label}: ${offer.discountPercent}% off. Conditions apply.`:"",offer.saleInfo?.trim()||""].filter(Boolean).join("\n"),category:type.label,set,store:offer.store,brand:"",asin:"",url:offer.url,image:offer.image||"",photo:null,status:"Published",updated:"2026-01-01T00:00:00Z"}));
  const matches=products.filter(product=>(!savedOnly||saved.includes(product.id))&&`${product.code} ${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <section className="promotion-products" aria-label="Amazon promotion products">
    <div className="promotion-products-toolbar"><label>Search promotions<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Product name, ID or sale information"/></label><button type="button" aria-pressed={savedOnly} onClick={()=>setSavedOnly(value=>!value)}>♡ Saved offers {products.filter(product=>saved.includes(product.id)).length}</button></div>
    <p className="promotion-sale-legend"><span>SALE ?</span> Sale information · Tap the orange ? for offer details and conditions.</p>
    {matches.length>0?<>{PROMOTION_TYPES.map((type,typeIndex)=>{const group=matches.filter(product=>product.category===type.label);if(!group.length)return null;return <section className="slider-category" key={type.value}><h2 className="slider-category-title">{type.icon} {type.label}</h2>{[...new Set(group.map(product=>product.set))].map(set=><ProductSlider key={set} name={`${type.label} Set ${String(set).padStart(2,"0")}`} products={group.filter(product=>product.set===set)} saved={saved} onSave={toggleSave} tone={typeIndex+set-1} promotionCodes={codes} promotionDiscounts={discounts}/>)}</section>;})}<SetNavigation/></>:<p className="offers-empty">{offers.length?"No matching offers. Try another search or turn off Saved offers.":"No product offers have been registered yet. Explore Amazon's official destinations below."}</p>}
  </section>;
}
