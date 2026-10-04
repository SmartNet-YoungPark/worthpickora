"use client";
import {visiblePromotion} from "@/lib/promotion-types";
import {useState} from "react";
import type {StoreLink} from "@/lib/store-apps";
import OfferCard from "./offer-card";
export default function MarketOffers({offers}:{offers:StoreLink[]}){const [market,setMarket]=useState("US");const filtered=offers.filter(offer=>visiblePromotion(offer)&&(offer.market||"US")===market);return <><div className="coupon-ranking-controls"><label>Shopping marketplace<select value={market} onChange={e=>setMarket(e.target.value)}><option value="US">United States ? USD</option><option value="CA">Canada ? CAD</option></select></label></div><section className="offers-grid">{filtered.map((offer,index)=><OfferCard key={offer.id} offer={offer} index={index}/>)}</section>{!filtered.length&&<p className="offers-empty">No offers registered for this marketplace.</p>}</>;}
