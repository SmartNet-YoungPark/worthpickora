"use client";
import {useEffect,useRef,useState,type CSSProperties} from "react";
import Image from "next/image";
import ProductDescription from "./product-description";
import BrandMark from "./brand-mark";
import {type Product,validUrl} from "@/lib/catalog";
import "./product-slider.css";

function Arrow({direction}:{direction:"left"|"right"|"up"|"down"}){
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{transform:`rotate(${{right:0,down:90,left:180,up:270}[direction]}deg)`}}><path d="m9 5 7 7-7 7"/></svg>;
}
export default function ProductSlider({name,products,saved,onSave,tone}:{name:string;products:Product[];saved:string[];onSave:(id:string)=>void;tone:number}){
  const track=useRef<HTMLDivElement>(null);
  const [edges,setEdges]=useState({start:true,end:true});
  const items=products.slice(0,10);
  const id="slider-"+encodeURIComponent(name);
  useEffect(()=>{
    const element=track.current;if(!element)return;
    const measure=()=>setEdges({start:element.scrollLeft<2,end:element.scrollLeft+element.clientWidth>=element.scrollWidth-2});
    measure();const observer=new ResizeObserver(measure);observer.observe(element);
    element.addEventListener("scroll",measure,{passive:true});
    return()=>{observer.disconnect();element.removeEventListener("scroll",measure);};
  },[products]);
  function slide(direction:number){
    const element=track.current;if(!element)return;
    const card=element.querySelector<HTMLElement>(".slide-card");
    const gap=parseFloat(getComputedStyle(element).columnGap)||0;
    element.scrollBy({left:direction*((card?.offsetWidth||220)+gap),behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }
  const palette=["#eee7c9","#ffe4cf","#e3efdf","#e8e3f6","#fbe1e5","#dceef2"];
  return <div className="product-set-slider" data-product-set style={{"--set-background":palette[tone%palette.length]} as CSSProperties}>
    <div className="slider-set-heading"><h3>{name}</h3><span className="click-images-hint">click product images <span aria-hidden="true">↗</span></span><small>{items.length} products</small></div>
    <div className="slider-viewport">
      <div className="product-slider-track" id={id} ref={track} tabIndex={0} role="region" aria-label={name+" products; swipe left or right"}>
        {items.map(product=><article className="slide-card product-card" key={product.id}>
          <div className="slide-card-top"><strong className="slide-product-code">{product.code}</strong><div className="slide-card-actions"><ProductDescription description={product.description} name={product.name}/><BrandMark brand={product.store}/><button className={saved.includes(product.id)?"slide-save is-saved":"slide-save"} onClick={()=>onSave(product.id)} aria-label={(saved.includes(product.id)?"Unsave ":"Save ")+product.name} aria-pressed={saved.includes(product.id)}>{saved.includes(product.id)?"♥":"♡"}</button></div></div>
          <h4 className="slide-product-name">{product.name}</h4>
          <a className="slide-image-link" href={validUrl(product.url)?`/go/${encodeURIComponent(product.id)}`:undefined} target="_blank" rel="noopener noreferrer sponsored" aria-label={`View ${product.name} on ${product.store} (opens in a new tab)`}>
            {product.image?<Image src={product.image} alt={product.name} width={400} height={400} unoptimized className="slide-product-image"/>:product.photo!==null?<div className={`product-photo photo-${product.photo}`} role="img" aria-label={product.name}/>:<span className="slide-image-placeholder">Explore on {product.store} ↗</span>}
          </a>
        </article>)}
      </div>
      <button className="slider-arrow slider-arrow-left" onClick={()=>slide(-1)} disabled={edges.start} aria-controls={id} aria-label={"Previous products in "+name}><Arrow direction="left"/></button>
      <button className="slider-arrow slider-arrow-right" onClick={()=>slide(1)} disabled={edges.end} aria-controls={id} aria-label={"Next products in "+name}><Arrow direction="right"/></button>
    </div>
  </div>;
}

export function SetNavigation(){
  const [edges,setEdges]=useState({start:true,end:true});
  useEffect(()=>{
    const measure=()=>{
      const positions=[...document.querySelectorAll<HTMLElement>("[data-product-set]")].map(node=>node.getBoundingClientRect().top);
      const atBottom=Math.ceil(window.scrollY+window.innerHeight)>=document.documentElement.scrollHeight-2;
      setEdges({start:!positions.some(top=>top<-8),end:atBottom||!positions.some(top=>top>32)});
    };
    measure();window.addEventListener("scroll",measure,{passive:true});window.addEventListener("resize",measure);
    const observer=new ResizeObserver(measure);observer.observe(document.body);
    return()=>{observer.disconnect();window.removeEventListener("scroll",measure);window.removeEventListener("resize",measure);};
  },[]);
  function move(direction:number){
    const sets=[...document.querySelectorAll<HTMLElement>("[data-product-set]")];
    const target=direction>0?sets.find(node=>node.getBoundingClientRect().top>32):sets.reverse().find(node=>node.getBoundingClientRect().top<-8);
    target?.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }
  return <nav className="set-direction-nav" aria-label="Browse product sets"><button onClick={()=>move(-1)} disabled={edges.start} aria-label="Previous product set"><Arrow direction="up"/></button><span>SETS</span><button onClick={()=>move(1)} disabled={edges.end} aria-label="Next product set"><Arrow direction="down"/></button></nav>;
}
