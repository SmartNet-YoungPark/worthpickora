export const STORE_APPS = [
  { id: "amazon-ios", store: "Amazon", label: "iPhone / iPad", url: "https://apps.apple.com/us/app/amazon-shopping/id297606951" },
  { id: "amazon-android", store: "Amazon", label: "Android", url: "https://play.google.com/store/apps/details?id=com.amazon.mShop.android.shopping" },
  { id: "walmart", store: "Walmart", label: "Official app guide", url: "https://www.walmart.com/cp/walmart-app/1087865" },
  { id: "best-buy", store: "Best Buy", label: "Official app guide", url: "https://www.bestbuy.com/discover-learn/benefits-of-the-best-buy-app/pcmcat1674162066016" },
  { id: "temu", store: "Temu", label: "Official app guide", url: "https://www.temu.com/app.html" },
  { id: "target", store: "Target", label: "Official app guide", url: "https://www.target.com/c/target-app/-/N-4th2r" },
  { id: "etsy", store: "Etsy", label: "Official app guide", url: "https://www.etsy.com/mobile" },
] as const;
export function validTemuOffer(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === "temu.com" || url.hostname.endsWith(".temu.com"));
  } catch { return false; }
}
export function storeAppDestination(id: string, offer = "") {
  return id === "temu-offer" ? (validTemuOffer(offer) ? offer : null) : STORE_APPS.find(app => app.id === id)?.url ?? null;
}
