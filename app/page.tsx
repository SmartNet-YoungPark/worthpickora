import LandingPage from "./landing-page";
import { isAdmin } from "@/lib/admin-auth";
import { publicCatalog } from "@/lib/server-catalog";
import { readStoreLinks, readSiteBanner } from "@/lib/server-store-apps";

export default async function Home() {
  const [admin, initialCatalog, storeLinks, bannerMessage] = await Promise.all([isAdmin(), publicCatalog(), readStoreLinks().catch(() => []), readSiteBanner().catch(() => "")]);
  return <LandingPage admin={admin} initialCatalog={initialCatalog} storeLinks={storeLinks} bannerMessage={bannerMessage}/>;
}
