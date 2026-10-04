"use client";
import {visiblePromotion} from "@/lib/promotion-types";

import type {StoreLink} from "@/lib/store-apps";
import OfferCard from "./offer-card";
export default function MarketOffers({offers,market="US"}:{offers:StoreLink[];market?:"US"|"CA"}){const filtered=offers.filter(offer=>visiblePromotion(offer)&&(offer.market||"US")===market);return <><section className="offers-grid">{filtered.map((offer,index)=><OfferCard key={offer.id} offer={offer} index={index}/>)}</section>{!filtered.length&&<p className="offers-empty">No offers registered for this marketplace.</p>}</>;}
