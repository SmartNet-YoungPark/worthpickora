"use client";
import {useEffect,useState} from "react";
import ProductSlider,{SetNavigation} from "../product-slider";
import type {StoreLink} from "@/lib/store-apps";
import {visiblePromotion,PROMOTION_TYPES,promotionSetAssignments,promotionCardSummary,topCouponOffers,verifiedPromotionStatus} from "@/lib/promotion-types";
import type {Product} from "@/lib/catalog";

export default function PromotionProducts({offers,market="US"}:{offers:StoreLink[];market?:"US"|"CA"}){
  const [now,setNow]=useState<number|null>(null);
  useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
  const marketplaceOffers=offers.filter(offer=>visiblePromotion(offer)&&(offer.market||(new URL(offer.url).hostname.endsWith(".ca")?"CA":"US"))===market);
  const statuses=now===null?{}:Object.fromEntries(offers.map(offer=>[offer.id,verifiedPromotionStatus(offer,now)]));
  const [query,setQuery]=useState(""),[saved,setSaved]=useState<string[]>([]),[savedOnly,setSavedOnly]=useState(false);
  useEffect(()=>{try{const value=JSON.parse(localStorage.getItem("worthpickora-promotion-saved")||"[]");if(Array.isArray(value))setSaved(value.filter(id=>typeof id==="string"));}catch{}},[]);
  function toggleSave(id:string){setSaved(current=>{const next=current.includes(id)?current.filter(value=>value!==id):[...current,id];try{localStorage.setItem("worthpickora-promotion-saved",JSON.stringify(next));}catch{}return next;});}
  const [couponCategory,setCouponCategory]=useState(""),[topCoupons,setTopCoupons]=useState(false);
  const couponCategories=[...new Set(offers.filter(offer=>offer.offerType==="clip-coupon").map(offer=>offer.category).filter((category):category is string=>!!category))].sort();
  const selectedOffers=topCoupons?topCouponOffers(marketplaceOffers.filter(offer=>now!==null&&verifiedPromotionStatus(offer,now)==="active"),couponCategory,now??0):marketplaceOffers;
  const codes=Object.fromEntries(offers.map(offer=>[offer.id,offer.offerType==="promo-code"?offer.promoCode?.trim()||"":""]));
  const summaries=Object.fromEntries(offers.filter(offer=>now!==null&&verifiedPromotionStatus(offer,now)==="active").map(offer=>[offer.id,{...promotionCardSummary(offer),...(offer.promotionTitle?{headline:offer.promotionTitle}:{}),instruction:offer.saleInfo?.trim()||offer.description.trim()||promotionCardSummary(offer).instruction,details:offer.saleInfo||offer.description}]));
  const assignments=promotionSetAssignments(selectedOffers);
  const discounts=Object.fromEntries(offers.filter(offer=>typeof offer.discountPercent==="number"&&now!==null&&verifiedPromotionStatus(offer,now)==="active").map(offer=>[offer.id,{percent:offer.discountPercent!,label:PROMOTION_TYPES.find(type=>type.value===offer.offerType)?.label||"Offer"}]));
  const products:Product[]=assignments.map(({offer,type,set})=>({id:offer.id,name:offer.title,code:`P${String(offers.findIndex(item=>item.id===offer.id)+1).padStart(3,"0")}`,description:[offer.discountPercent?`${type.label}: ${offer.discountPercent}% off. Conditions apply.`:"",offer.saleInfo?.trim()||""].filter(Boolean).join("\n"),category:type.label,set,store:offer.store,brand:"",asin:"",url:offer.url,image:offer.image||"",photo:null,status:"Published",updated:"2026-01-01T00:00:00Z"}));
  const matches=products.filter(product=>(!savedOnly||saved.includes(product.id))&&`${product.code} ${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <section className="promotion-products" aria-label="Amazon promotion products">

    <div className="promotion-products-toolbar"><label>Search promotions<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Product name, ID or sale information"/></label><button type="button" aria-pressed={savedOnly} onClick={()=>setSavedOnly(value=>!value)}>♡ Saved offers {products.filter(product=>saved.includes(product.id)).length}</button></div>
    <div className="coupon-ranking-controls"><button type="button" aria-pressed={topCoupons} onClick={()=>setTopCoupons(value=>!value)}>Top 30 coupons by discount</button>{topCoupons&&<label>Product category<select value={couponCategory} onChange={event=>setCouponCategory(event.target.value)}><option value="">All categories</option>{couponCategories.map(category=><option key={category} value={category}>{category}</option>)}</select></label>}</div>
    {topCoupons&&<p className="coupon-ranking-note">Highest confirmed coupon percentages among registered, verified products. Up to 30 results; not an Amazon-wide ranking. Offers can change.</p>}
    {matches.length>0?<>{PROMOTION_TYPES.map((type,typeIndex)=>{const group=matches.filter(product=>product.category===type.label);if(!group.length)return null;return <section className="slider-category" key={type.value}><h2 className="slider-category-title">{type.icon} {type.label}</h2>{[...new Set(group.map(product=>product.set))].map(set=><ProductSlider key={set} name={`${type.label} Set ${String(set).padStart(2,"0")}`} products={group.filter(product=>product.set===set)} saved={saved} onSave={toggleSave} tone={typeIndex+set-1} promotionCodes={codes} promotionDiscounts={discounts} promotionSummaries={summaries} promotionStatuses={statuses}/>)}</section>;})}<SetNavigation/></>:<p className="offers-empty">{offers.length?"No matching offers. Try another search or turn off Saved offers.":"No product offers have been registered yet. Explore Amazon's official destinations below."}</p>}
  </section>;
}
