import BrandMark from "./brand-mark";
import {STORE_APPS,type StoreLink} from "@/lib/store-apps";
export default function StoreAppGuide({links=[]}:{links?:StoreLink[]}){
  const entries=[...STORE_APPS.map(app=>({id:app.id,store:app.store,title:app.label,url:app.url,description:app.store==="Amazon"?`Amazon Shopping for ${app.label}.`:`Find ${app.store}'s official app information.`,sponsored:false})),...links.map(link=>({...link,sponsored:true}))];
  return <details className="store-app-guide store-links-guide" open><summary>Store apps &amp; offers <small>Explore store links</small></summary><div className="store-app-guide-content"><p>No app installation required. Explore official apps and store links, or shop directly from product images.</p>
    <div className="store-links-list">{[...new Set(entries.map(link=>link.store))].map(store=><section className="store-links-group" key={store}><h3><BrandMark brand={store}/>{store}</h3><ul>{entries.filter(link=>link.store===store).map(link=><li key={link.id}><a href={`/store-app/${link.id}`} target="_blank" rel={link.sponsored?"noopener noreferrer sponsored":"noopener noreferrer"}><span>{link.title}</span><span aria-hidden="true">↗</span></a><span className="store-link-host">{new URL(link.url).hostname}</span>{link.description&&<p className="store-link-description" title={link.description}>{link.description}</p>}</li>)}</ul></section>)}</div>
    <p className="store-links-note">Links open in a new tab. Check prices, offer eligibility and terms at the store. We may earn a commission from qualifying purchases.</p></div></details>;
}
