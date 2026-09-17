import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  await requireAdmin();
  redirect("/admin/products");
}
