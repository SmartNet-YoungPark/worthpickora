import sharp from "sharp";

// Bound stored image dimensions and payloads without fetching external URLs.
export async function optimizeProductImage(image: string): Promise<string> {
  const match = /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=]+)$/i.exec(image);
  if (!match) return image;
  const input = Buffer.from(match[2], "base64");
  const source = sharp(input, { limitInputPixels: 40000000 });
  const metadata = await source.metadata();
  if (!metadata.width || !metadata.height) throw new Error("Invalid product image.");
  if (metadata.width <= 800 && metadata.height <= 800 && input.length <= 150 * 1024) return image;
  let output = await source.rotate().resize(800, 800, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  if (output.length > 150 * 1024) output = await sharp(input).rotate().resize(600, 600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 65 }).toBuffer();
  return `data:image/webp;base64,${output.toString("base64")}`;
}
