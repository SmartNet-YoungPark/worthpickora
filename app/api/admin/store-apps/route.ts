import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { saveStoreOffer } from "@/lib/server-store-apps";
import { validTemuOffer } from "@/lib/store-apps";
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store, private" };
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  if (!await isAdmin()) return Response.json({ error: "Sign in first." }, { status: 401, headers });
  try {
    const body = await request.json();
    const offer = typeof body.offer === "string" ? body.offer.trim() : null;
    if (offer === null || offer.length > 2048 || (offer && (!validTemuOffer(offer) || body.confirmed !== true))) return Response.json({ error: "Enter a valid HTTPS Temu campaign URL and confirm that you checked its terms, or clear the URL to hide the offer." }, { status: 400, headers });
    await saveStoreOffer(offer);
    return Response.json({ ok: true }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not save settings." }, { status: 503, headers }); }
}
