import {storeClickTotals} from "@/lib/server-click-analytics";
import LandingViewTracker from "./landing-view-tracker";
import LandingPage from "./landing-page";
import { isAdmin } from "@/lib/admin-auth";
import { publicCatalog } from "@/lib/server-catalog";
import { readStoreLinks, readSiteBanner } from "@/lib/server-store-apps";

export default async function Home() {
  const [admin, initialCatalog, storeLinks, bannerMessage, storeClicks] = await Promise.all([isAdmin(), publicCatalog(), readStoreLinks().catch(() => []), readSiteBanner().catch(() => ""), storeClickTotals().catch(()=>null)]);
  // The shopping page only needs store names/counts for navigation. Offer details
  // and codes belong exclusively to the separate promotion pages.
  const storeNavigation=storeLinks.map(({id,store})=>({id,store,title:"",description:"",url:""}));
  return <><LandingViewTracker admin={admin}/><LandingPage admin={admin} initialCatalog={initialCatalog} storeLinks={storeNavigation} bannerMessage={bannerMessage} storeClicks={storeClicks}/></>;
}
