import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {isAdmin} from "@/lib/admin-auth";
import {selectedMarket} from "@/lib/promotion-market";
export const dynamic="force-dynamic";
export default async function Page({params,searchParams}:{params:Promise<{store:string}>;searchParams:Promise<{market?:string}>}){
 const [{store},query,h,admin]=await Promise.all([params,searchParams,headers(),isAdmin()]);
 const market=selectedMarket(h.get("x-vercel-ip-country"),h.get("accept-language"),admin,query.market);
 redirect(`/promotions/${encodeURIComponent(store)}/${market}`);
}
