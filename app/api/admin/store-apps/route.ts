import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { saveStoreOffer,saveStoreLinks } from "@/lib/server-store-apps";
import { validTemuOffer,validateStoreLinks } from "@/lib/store-apps";
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store, private" };
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await isAdmin()) return Response.json({ error: "Sign in first." }, { status: 401, headers });
  try {
    const body = await request.json();
    if(body&&"links" in body){
      const links:unknown=body.links;
      if(!validateStoreLinks(links))return Response.json({error:"Use up to 1000 valid HTTPS links. Product names must be at most 300 characters, promotion titles 200, descriptions 500, original text 1000 and promo codes 80. Start time must precede end time. Optional image URLs must use HTTPS. Seller promo-code offers require a code. Discount percentages must be greater than 0 and at most 100."},{status:400,headers});
      await saveStoreLinks(links.map(link=>({...link,store:link.store.trim(),title:link.title.trim(),description:link.description.replace(/[\r\n]+/g," ").trim(),url:link.url.trim()})));
      return Response.json({ok:true},{headers});
    }
    const offer = typeof body.offer === "string" ? body.offer.trim() : null;
    if (offer === null || offer.length > 2048 || (offer && (!validTemuOffer(offer) || body.confirmed !== true))) return Response.json({ error: "Enter a valid HTTPS Temu campaign URL and confirm that you checked its terms, or clear the URL to hide the offer." }, { status: 400, headers });
    await saveStoreOffer(offer);
    return Response.json({ ok: true }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not save settings." }, { status: 503, headers }); }
}
