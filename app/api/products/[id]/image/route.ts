import { productImage } from "@/lib/server-catalog";
import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = new URL(_request.url).searchParams.get("scope") === "admin";
  if (admin && !await isAdmin()) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  const product = await productImage(id);
  const match = product && (admin || product.status === "Published") && /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=]+)$/i.exec(product.image);
  if (!match) return new Response("Image not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": `image/${match[1].toLowerCase()}`,
      "Cache-Control": admin ? "no-store, private" : "no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
