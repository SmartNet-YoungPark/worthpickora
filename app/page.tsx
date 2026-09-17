import LandingPage from "./landing-page";
import { isAdmin } from "@/lib/admin-auth";
import { publicCatalog } from "@/lib/server-catalog";

export default async function Home() {
  const [admin, initialCatalog] = await Promise.all([isAdmin(), publicCatalog()]);
  return <LandingPage admin={admin} initialCatalog={initialCatalog}/>;
}
