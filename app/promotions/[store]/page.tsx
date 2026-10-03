import Link from "next/link";
import {notFound} from "next/navigation";
import BrandMark from "../../brand-mark";
import {STORE_APPS} from "@/lib/store-apps";
import {readStoreLinks} from "@/lib/server-store-apps";
import "../promotions.css";
import AmazonPublicOffers from "../amazon-public-offers";
import MarketOffers from "../market-offers";
import PromotionProducts from "../promotion-products";

export const dynamic = "force-dynamic";

export default async function StorePromotions({params}:{params:Promise<{store:string}>}) {
  const {store:requested}=await params;
  const links=await readStoreLinks();
  const stores=[...new Set([...STORE_APPS.map(app=>app.store),...links.map(link=>link.store)])];
  let decoded=requested;
  try { decoded=decodeURIComponent(requested); } catch { notFound(); }
  const store=stores.find(name=>name===requested)||stores.find(name=>name===decoded);
  if(!store) notFound();
  const offers=links.filter(link=>link.store===store);
  const apps=STORE_APPS.filter(app=>app.store===store);
  return <main className={`offers-page ${store==="Amazon"?"amazon-catalog-page":""}`}>
    <nav className="offers-nav"><Link href="/">WorthPickora</Link><Link href="/">&larr; Shopping shorts</Link></nav>
    <header className="offers-hero"><span className="offers-eyebrow">STORE APPS &amp; OFFERS</span><div><BrandMark brand={store}/><h1>{`${store} promotions`}</h1></div><p>A little more value for your everyday. Explore offers and check the latest details at {store}.</p></header>
    <nav className="offers-stores" aria-label="Store promotions">{stores.filter(name=>links.some(link=>link.store===name)).map(name=><Link key={name} href={`/promotions/${encodeURIComponent(name)}`} aria-current={name===store?"page":undefined}>{name}</Link>)}</nav>
    {store==="Amazon"&&<PromotionProducts offers={offers}/>}
    {store!=="Amazon"&&offers.length>0&&<MarketOffers offers={offers}/>}
    {!offers.length&&store!=="Amazon"&&<p className="offers-empty">No offers are available right now. Please check back later.</p>}
    {store==="Amazon"&&<details className="amazon-discovery-links"><summary>Explore Amazon coupon & deal pages</summary><AmazonPublicOffers/></details>}
    {apps.length>0&&<section className="offers-apps"><h2>Official {store} app links</h2><p>Prefer shopping in the app? Explore the official options.</p><div>{apps.map(app=><a key={app.id} href={`/store-app/${app.id}`} target="_blank" rel="noopener noreferrer">{app.label} ↗</a>)}</div></section>}
    <footer className="offers-disclosure">Offer availability, eligibility and terms are determined by {store}. Confirm the final price at checkout. We may earn a commission from qualifying purchases. As an Amazon Associate we earn from qualifying purchases.</footer>
  </main>;
}
