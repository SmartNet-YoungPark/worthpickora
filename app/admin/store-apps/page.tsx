import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { appClickReport, readStoreLinks, type AppClick } from "@/lib/server-store-apps";
import { STORE_APPS, type StoreLink } from "@/lib/store-apps";
import OfferForm from "./offer-form";
export const metadata = { title: "Store apps | WorthPickora Admin", robots: { index: false, follow: false } };
export default async function StoreAppsPage() {
  await requireAdmin();
  let links: StoreLink[] = [], rows: AppClick[] = [], error = "";
  try { [links, rows] = await Promise.all([readStoreLinks(), appClickReport()]); }
  catch (problem) { error = problem instanceof Error ? problem.message : "Store app settings unavailable."; }
  return <main className="store-app-admin"><nav><Link href="/admin/products">← Products</Link><Link href="/admin/analytics">Product analytics</Link><Link href="/">Landing page</Link></nav>
    <h1>Store apps & offers</h1><p>Official app guides help shoppers find retailer apps. Product images keep their existing affiliate destinations.</p>
    {error && <p role="alert" className="store-app-error">{error}</p>}
    {!error && <OfferForm initialLinks={links}/>}
    <section><h2>App guide & offer clicks — last 30 days</h2><p>Toronto time. Counts link clicks, not app installs, orders or commissions. Logged-in admin tests and recognized bots/prefetches are excluded. These counts do not enter product analytics.</p>
      {!error && <><strong>{rows.reduce((sum, row) => sum + Number(row.clicks), 0)} link clicks</strong><div className="store-app-table"><table><thead><tr><th>Date</th><th>Store</th><th>Link</th><th>Clicks</th></tr></thead><tbody>{rows.map(row => { const app = STORE_APPS.find(app => app.id === row.link_id); const link = links.find(link => link.id === row.link_id); return <tr key={row.click_date + row.link_id}><td>{row.click_date}</td><td>{row.store_name || link?.store || app?.store || (row.link_id === "temu-offer" ? "Temu" : "Removed store link")}</td><td>{row.link_title || link?.title || app?.label || (row.link_id === "temu-offer" ? "New-customer offer" : row.link_id)}</td><td>{row.clicks}</td></tr>; })}</tbody></table></div>{!rows.length && <p>No app guide clicks in this period.</p>}</>}
    </section>
  </main>;
}
