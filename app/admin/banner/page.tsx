import Link from "next/link";
import {requireAdmin} from "@/lib/admin-auth";
import {readSiteBanner} from "@/lib/server-store-apps";
import BannerForm from "./banner-form";
export const metadata={title:"Landing banner | WorthPickora Admin",robots:{index:false,follow:false}};
export default async function BannerPage(){
  await requireAdmin();let message="",error="";
  try{message=await readSiteBanner();}catch{error="Banner settings unavailable. Apply 20260924030000_site_banner.sql in Supabase and check the connection.";}
  return <main className="store-app-admin"><nav><Link href="/admin/products">← Products</Link><Link href="/">Landing page</Link></nav><h1>Landing page banner</h1><p>A message for customers before they explore your products.</p>{error?<p className="store-app-error" role="alert">{error}</p>:<BannerForm initialMessage={message}/>}</main>;
}
