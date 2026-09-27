import Link from "next/link";
import {notFound} from "next/navigation";
import BrandMark from "../../brand-mark";
import {STORE_APPS} from "@/lib/store-apps";
import {readStoreLinks} from "@/lib/server-store-apps";
import "../promotions.css";

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
  return <main className="offers-page">
    <nav className="offers-nav"><Link href="/">WorthPickora</Link><Link href="/">&larr; Shopping shorts</Link></nav>
    <header className="offers-hero"><span className="offers-eyebrow">STORE APPS &amp; OFFERS</span><div><BrandMark brand={store}/><h1>{`${store} promotions`}</h1></div><p>A little more value for your everyday. Explore offers and check the latest details at {store}.</p></header>
    <nav className="offers-stores" aria-label="Store promotions">{stores.filter(name=>links.some(link=>link.store===name)).map(name=><Link key={name} href={`/promotions/${encodeURIComponent(name)}`} aria-current={name===store?"page":undefined}>{name}</Link>)}</nav>
    <section aria-label={`${store} offers`} className="offers-grid">{offers.map((offer,index)=><article key={offer.id} className={`offer-tile offer-tone-${index%4}`}><span className="offers-eyebrow">{store} · OFFER {String(index+1).padStart(2,"0")}</span><h2>{offer.title}</h2>{offer.description&&<p>{offer.description}</p>}<span className="offer-host">{new URL(offer.url).hostname}</span><a href={`/store-app/${offer.id}`} target="_blank" rel="noopener noreferrer sponsored">View offer at {store} <span aria-hidden="true">↗</span></a></article>)}</section>
    {!offers.length&&<p className="offers-empty">No offers are available right now. Please check back later.</p>}
    {apps.length>0&&<section className="offers-apps"><h2>Official {store} app links</h2><p>Prefer shopping in the app? Explore the official options.</p><div>{apps.map(app=><a key={app.id} href={`/store-app/${app.id}`} target="_blank" rel="noopener noreferrer">{app.label} ↗</a>)}</div></section>}
    <footer className="offers-disclosure">Offer availability, eligibility and terms are determined by {store}. Confirm the final price at checkout. We may earn a commission from qualifying purchases. As an Amazon Associate we earn from qualifying purchases.</footer>
  </main>;
}
