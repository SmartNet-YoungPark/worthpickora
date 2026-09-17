import type { Metadata } from "next";
import ProductsAdmin from "./products-admin";
import "./products.css";
import { requireAdmin } from "@/lib/admin-auth";
import { catalogStorage } from "@/lib/server-catalog";

export const metadata: Metadata = { title: "Products · WorthPickora Admin", robots: { index: false, follow: false } };

export default async function ProductsPage() {
  await requireAdmin();
  return <ProductsAdmin initialCatalog={await catalogStorage.read()}/>;
}
