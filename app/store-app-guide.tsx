import BrandMark from "./brand-mark";
import { STORE_APPS, validTemuOffer } from "@/lib/store-apps";
export default function StoreAppGuide({ offer = "" }: { offer?: string }) {
  return <details className="store-app-guide">
    <summary><span aria-hidden="true">▣</span> Store app guide <small>Optional</small></summary>
    <div className="store-app-guide-content">
      <p>No app installation required. You can also shop on the web.</p>
      <p>Tap a product image for details, then use the store button to check current prices, delivery and availability. Whether a store link opens an installed app depends on your device and browser.</p>
      <div className="store-app-guide-links">{[...new Set(STORE_APPS.map(app => app.store))].map(store => <div key={store}><strong><BrandMark brand={store}/>{store}</strong>{STORE_APPS.filter(app => app.store === store).map(app => <a key={app.id} href={`/store-app/${app.id}`} target="_blank" rel="noopener noreferrer">{app.label} <span aria-hidden="true">↗</span></a>)}</div>)}</div>
      {validTemuOffer(offer) && <aside className="store-app-offer"><strong>New to Temu?</strong><a href="/store-app/temu-offer" target="_blank" rel="noopener noreferrer sponsored">Check new-customer offers ↗</a><small>Eligibility and terms apply. Check current details at Temu.</small></aside>}
      <small>After installing, return here, open your chosen product and tap its store button to continue shopping. App guide links open a new tab.</small>
    </div>
  </details>;
}
