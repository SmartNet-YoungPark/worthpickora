import { catalogStorage } from "@/lib/server-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalog = await catalogStorage.read();
  const product = catalog.products.find(item => item.id === id && item.status === "Published");
  const match = product && /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=]+)$/i.exec(product.image);
  if (!match) return new Response("Image not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": `image/${match[1].toLowerCase()}`,
      "Cache-Control": "no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
