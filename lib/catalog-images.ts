import type { Product } from "./catalog";

// CSV stores actual image bytes, including the photos in the original design.
// Keep these source rectangles aligned with the product-photo CSS sprite.
export const REFERENCE_PHOTOS = [
  { x: 126, y: 461 }, { x: 327, y: 460 }, { x: 526, y: 460 }, { x: 727, y: 460 }, { x: 925, y: 460 },
];
async function loadImage(source: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = source;
  await image.decode();
  return image;
}

// Compress new embedded images before uploading, including Excel/CSV pictures.
export async function compressProductImages(products: Product[]): Promise<Product[]> {
  const result: Product[] = [];
  for (const product of products) {
    if (!product.image.startsWith("data:image/")) { result.push(product); continue; }
    try {
      const image = await loadImage(product.image);
      if (Math.max(image.naturalWidth, image.naturalHeight) <= 800 && product.image.length <= 200 * 1024) { result.push(product); continue; }
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable.");
      const ratio = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      result.push({ ...product, image: canvas.toDataURL("image/webp", 0.8) });
    } catch { throw new Error(`${product.code}: This image could not be processed. Choose another JPG, PNG, or WebP image.`); }
  }
  return result;
}

export async function embedProductImages(products: Product[], excelCompatible = false): Promise<Product[]> {
  const cache = new Map<string, string>();
  let reference: HTMLImageElement | undefined;
  const result: Product[] = [];
  for (const product of products) {
    if ((product.image.startsWith("data:image/") && !(excelCompatible && product.image.startsWith("data:image/webp"))) || (!product.image && product.photo === null)) { result.push({ ...product }); continue; }
    const key = product.image || `reference:${product.photo}`;
    if (!cache.has(key)) {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image processing is unavailable.");
        if (product.image) {
          const image = await loadImage(product.image);
          const ratio = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
          canvas.width = Math.round(image.naturalWidth * ratio); canvas.height = Math.round(image.naturalHeight * ratio);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
        } else {
          reference ??= await loadImage("/products-reference.png");
          const photo = REFERENCE_PHOTOS[product.photo!];
          canvas.width = 150; canvas.height = 132;
          context.drawImage(reference, photo.x, photo.y, 150, 132, 0, 0, 150, 132);
          context.clearRect(0, 0, 28, 18); context.clearRect(120, 0, 30, 18);
        }
        cache.set(key, canvas.toDataURL("image/png"));
      } catch { throw new Error(`Could not include the image for ${product.code}. Upload the image directly if its host blocks downloading, then export again.`); }
    }
    result.push({ ...product, image: cache.get(key)!, photo: null });
  }
  return result;
}
