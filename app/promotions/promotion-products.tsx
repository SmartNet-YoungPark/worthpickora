"use client";
import {promotionSavings,rankSavings} from "@/lib/promotion-savings";
import {useEffect,useState} from "react";
import ProductSlider,{SetNavigation} from "../product-slider";
import type {StoreLink} from "@/lib/store-apps";
import {visiblePromotion,PROMOTION_TYPES,promotionSetAssignments,verifiedPromotionStatus} from "@/lib/promotion-types";
import type {Product} from "@/lib/catalog";

export default function PromotionProducts({offers,market="US",rankingLimit=30}:{offers:StoreLink[];market?:"US"|"CA";rankingLimit?:number}){
  const [now,setNow]=useState<number|null>(null);
  useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
  const marketplaceOffers=offers.filter(offer=>visiblePromotion(offer)&&(offer.market||(new URL(offer.url).hostname.endsWith(".ca")?"CA":"US"))===market);
  const statuses=now===null?{}:Object.fromEntries(offers.map(offer=>[offer.id,verifiedPromotionStatus(offer,now)]));
  const [query,setQuery]=useState("");
  const [couponCategory,setCouponCategory]=useState(""),[topCoupons,setTopCoupons]=useState(true);
  const couponCategories=[...new Set(offers.map(offer=>offer.category).filter((category):category is string=>!!category))].sort();
  const selectedOffers=topCoupons?rankSavings(marketplaceOffers.filter(offer=>now!==null&&verifiedPromotionStatus(offer,now)==="active"&&(!couponCategory||offer.category===couponCategory)),rankingLimit):marketplaceOffers;
  const codes=Object.fromEntries(offers.map(offer=>[offer.id,offer.offerType==="promo-code"?offer.promoCode?.trim()||"":""]));
  const summaries=Object.fromEntries(offers.map(offer=>{const value=promotionSavings(offer);const verified=now!==null&&verifiedPromotionStatus(offer,now)==="active";return [offer.id,{headline:verified?value.label:"",badges:verified?value.badges:[],breakdown:value.breakdown,verified,instruction:offer.saleInfo?.trim()||offer.description.trim(),details:value.details}];}));
  const assignments=promotionSetAssignments(selectedOffers);

  const products:Product[]=assignments.map(({offer,type,set})=>({id:offer.id,name:offer.title,code:`P${String(offers.findIndex(item=>item.id===offer.id)+1).padStart(3,"0")}`,description:[offer.discountPercent?`${type.label}: ${offer.discountPercent}% off. Conditions apply.`:"",offer.saleInfo?.trim()||""].filter(Boolean).join("\n"),category:type.label,set,store:offer.store,brand:"",asin:"",url:offer.url,image:offer.image||"",photo:null,status:"Published",updated:"2026-01-01T00:00:00Z"}));
  const matches=products.filter(product=>`${product.code} ${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <section className="promotion-products" aria-label="Amazon promotion products">

    <div className="promotion-products-toolbar"><label>Search promotions<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Product name, ID or sale information"/></label></div>
    <div className="coupon-ranking-controls"><button type="button" aria-pressed={topCoupons} onClick={()=>setTopCoupons(value=>!value)}>Top {rankingLimit} by savings</button>{topCoupons&&<label>Department<select value={couponCategory} onChange={event=>setCouponCategory(event.target.value)}><option value="">All Departments</option>{couponCategories.map(category=><option key={category} value={category}>{category}</option>)}</select></label>}</div>
    {topCoupons&&<p className="coupon-ranking-note">Largest verified savings among registered products in this marketplace. Up to {rankingLimit} results. Combined savings require verified stacking or a final price. Offers can change.</p>}
    {matches.length>0?<>{PROMOTION_TYPES.map((type,typeIndex)=>{const group=matches.filter(product=>product.category===type.label);if(!group.length)return null;return <section className="slider-category" key={type.value}><h2 className="slider-category-title">{type.icon} {type.label}</h2>{[...new Set(group.map(product=>product.set))].map(set=><ProductSlider key={set} name={`${type.label} Set ${String(set).padStart(2,"0")}`} products={group.filter(product=>product.set===set)} saved={[]} onSave={()=>{}} tone={typeIndex+set-1} promotionCodes={codes}  promotionSummaries={summaries} promotionStatuses={statuses}/>)}</section>;})}<SetNavigation/></>:<p className="offers-empty">{offers.length?"No matching offers. Try another search.":"No product offers have been registered yet. Explore Amazon's official destinations below."}</p>}
  </section>;
}
