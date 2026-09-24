import LandingPage from "./landing-page";
import { isAdmin } from "@/lib/admin-auth";
import { publicCatalog } from "@/lib/server-catalog";
import { readStoreOffer } from "@/lib/server-store-apps";

export default async function Home() {
  const [admin, initialCatalog, storeOffer] = await Promise.all([isAdmin(), publicCatalog(), readStoreOffer().catch(() => "")]);
  return <LandingPage admin={admin} initialCatalog={initialCatalog} storeOffer={storeOffer}/>;
}
