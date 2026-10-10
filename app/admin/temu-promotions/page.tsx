import Link from "next/link";
import {requireAdmin} from "@/lib/admin-auth";
import {readStoreLinks} from "@/lib/server-store-apps";
import TemuResearch from "./temu-research";
import "./temu.css";
export const metadata={title:"Temu promotion research | WorthPickora Admin",robots:{index:false,follow:false}};
export default async function TemuPromotionsPage(){
 await requireAdmin();
 let links:Awaited<ReturnType<typeof readStoreLinks>>=[];
 let error="";
 try{links=(await readStoreLinks()).filter(link=>link.store.toLowerCase()==="temu");}
 catch{error="Saved Temu offers could not be loaded. The research below is still available; no saved offers were changed.";}
 return <main className="temu-admin"><nav><Link href="/admin/products">Products</Link><Link href="/admin/store-apps">Store apps & offers</Link></nav><TemuResearch links={links} error={error}/></main>;
}
