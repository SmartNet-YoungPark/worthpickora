"use client";
import {createContext,type ReactNode} from "react";
export const AffiliateMarket = createContext<string|null>(null);
export default function AffiliateMarketProvider({country,children}:{country:string|null;children:ReactNode}){
  return <AffiliateMarket value={country}>{children}</AffiliateMarket>;
}
