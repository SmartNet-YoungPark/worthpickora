"use client";
import {useEffect,useId,useRef} from "react";
import {createPortal} from "react-dom";
import Image from "next/image";
import BrandMark from "./brand-mark";
import {type Product,validUrl} from "@/lib/catalog";

export default function ProductOverview({product,onClose}:{product:Product;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),title=useId();
  useEffect(()=>{
    const element=dialog.current;if(!element)return;
    const trigger=document.activeElement as HTMLElement|null;
    element.showModal();
    const previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";
    return()=>{element.close();document.body.style.overflow=previousOverflow;if(trigger?.isConnected)trigger.focus({preventScroll:true});};
  },[]);
  return createPortal(<dialog ref={dialog} className="product-overview" aria-labelledby={title} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();}}>
    <div className="product-overview-top"><span>THE DETAILS, BEFORE YOU GO</span><button type="button" autoFocus onClick={onClose} aria-label="Close product overview">×</button></div>
    <div className="product-overview-body"><div className="product-overview-art">
      {product.image?<Image src={product.image} alt={product.name} width={400} height={400} unoptimized/>:product.photo!==null?<svg viewBox="0 0 150 132" role="img" aria-label={product.name}><svg width="150" height="132" viewBox={`${[126,327,526,727,925][product.photo]??126} ${product.photo===0?461:460} 150 132`} overflow="hidden"><image href="/products-reference.png" width="1536" height="1024"/></svg></svg>:<span>{product.code}</span>}
    </div><div className="product-overview-heading"><span>{product.code} · {product.category} Set {String(product.set).padStart(2,"0")}</span><h2 id={title}>{product.name}</h2><div><BrandMark brand={product.store}/><strong>{product.store}</strong></div></div>
    {product.description.trim()&&<section><h3>About this find</h3><p>{product.description}</p></section>}
    {product.options?.trim()&&<section><h3>Product options</h3><p>{product.options}</p><small>Confirm available options at the store.</small></section>}
    <section className="product-overview-offer"><h3>Price & promotions</h3><p>Check current prices, discounts, coupons and available options at {product.store}.</p></section>
    <div className="product-overview-footer">{validUrl(product.url)?<a href={`/go/${encodeURIComponent(product.id)}`} target="_blank" rel="noopener noreferrer sponsored">Check price & options at {product.store} <span aria-hidden="true">↗</span></a>:<p>Store link is currently unavailable.</p>}<small>Opens the store in a new tab. We may earn a commission from qualifying purchases.</small></div>
    </div>
  </dialog>,document.body);
}
