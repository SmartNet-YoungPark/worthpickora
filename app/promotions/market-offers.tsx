"use client";
import {useState} from "react";
import {visiblePromotion} from "@/lib/promotion-types";
import {rankSavings} from "@/lib/promotion-savings";
import type {StoreLink} from "@/lib/store-apps";
import OfferCard from "./offer-card";
export default function MarketOffers({offers,market="US",rankingLimit=30}:{offers:StoreLink[];market?:"US"|"CA";rankingLimit?:number}){const [ranked,setRanked]=useState(true);const eligible=offers.filter(o=>visiblePromotion(o)&&(o.market||"US")===market);const filtered=ranked?rankSavings(eligible,rankingLimit):eligible;return <><div className="coupon-ranking-controls"><button aria-pressed={ranked} onClick={()=>setRanked(!ranked)}>Top {rankingLimit} by savings</button><small>Known savings in this marketplace. Final price and eligibility must be confirmed at the store.</small></div><section className="offers-grid">{filtered.map((offer,index)=><OfferCard key={offer.id} offer={offer} index={index}/>)}</section>{!filtered.length&&<p className="offers-empty">No ranked offers with confirmed amounts. Turn off ranking to view all registered offers.</p>}</>;}
