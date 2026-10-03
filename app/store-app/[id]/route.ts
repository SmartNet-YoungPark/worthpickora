import {amazonAffiliateUrl} from "@/lib/amazon-affiliate";
import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { readStoreLinks, recordAppClick } from "@/lib/server-store-apps";
import { storeAppDestination } from "@/lib/store-apps";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
  let link;
  if (id === "temu-offer"||id.startsWith("link-")) {
    try { link = (await readStoreLinks()).find(link=>link.id===id); }
    catch { return new Response("Offer temporarily unavailable", { status: 503, headers }); }
    if(!link)return new Response("Link unavailable",{status:404,headers});
  }
  const savedDestination = link?.url||storeAppDestination(id);
  const destination = savedDestination?amazonAffiliateUrl(savedDestination):null;
  if (!destination) return new Response("Link unavailable", { status: 404, headers });
  const preview = /prefetch|prerender/i.test((request.headers.get("purpose") || "") + (request.headers.get("sec-purpose") || "")) || request.headers.has("next-router-prefetch");
  const bot = /bot|crawler|spider|preview|facebookexternalhit|headless/i.test(request.headers.get("user-agent") || "");
  let recorded = false;
  if (!preview && !bot && !await isAdmin()) {
    try { await recordAppClick(id,link); recorded = true; }
    catch { console.error("Store app click was not recorded; check store app migration and database connection."); }
  }
  return new Response(null, { status: 302, headers: { ...headers, Location: destination, "X-App-Click-Recorded": String(recorded) } });
}
export async function HEAD() { return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } }); }
