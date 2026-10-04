import {notFound} from "next/navigation";
import StorePromotions from "../../store-page";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{store:string;market:string}>}){
 const {store,market}=await params;
 if(market!=="US"&&market!=="CA")notFound();
 return <StorePromotions requested={store} market={market}/>;
}
