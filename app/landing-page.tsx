"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import SiteLogo from "./site-logo";
import BrandMark from "./brand-mark";
import ProductSlider, { SetNavigation } from "./product-slider";
import { useCatalog } from "@/lib/use-catalog";
import { CatalogSnapshot, productSets } from "@/lib/catalog";

let savedFallback = "[]";
function subscribeSaved(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("worthpickora-saved-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("worthpickora-saved-change", callback);
  };
}
function readSaved() {
  try { return localStorage.getItem("worthpickora-saved") || savedFallback; }
  catch { return savedFallback; }
}
function emptySaved() { return "[]"; }
function writeSaved(items: string[]) {
  savedFallback = JSON.stringify(items);
  try { localStorage.setItem("worthpickora-saved", savedFallback); } catch { /* Keep favorites for this session. */ }
  window.dispatchEvent(new Event("worthpickora-saved-change"));
}

type IconName = "search" | "heart" | "arrow" | "chevron" | "plus" | "external" | "tech" | "home" | "car" | "beauty" | "gift" | "close" | "chip" | "health" | "shirt" | "sports" | "games" | "pet" | "tools";
function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, chevron: <path d="m9 5 7 7-7 7"/>, plus: <path d="M12 4v16M4 12h16"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
    external: <><path d="M14 3h7v7m0-7L10 14"/><path d="M10 4H4v16h16v-6"/></>,
    tech: <><rect x="4" y="3" width="16" height="14" rx="1"/><path d="M2 21h20M9 17v4m6-4v4"/></>,
    chip: <><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/><rect x="9" y="9" width="6" height="6"/></>,
    health: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 5V2h8v3m-4 5v7m-3.5-3.5h7"/></>,
    shirt: <path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z"/>,
    sports: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M6 5c8 4 8 10 0 14M18 5c-8 4-8 10 0 14"/></>,
    games: <><path d="M7 7h10c3 0 4 4 5 10 0 4-4 4-6 0H8c-2 4-6 4-6 0 1-6 2-10 5-10Z"/><path d="M7 10v5m-2.5-2.5h5"/><circle cx="16" cy="11" r="1"/><circle cx="19" cy="14" r="1"/></>,
    pet: <><ellipse cx="6" cy="7" rx="2" ry="3"/><ellipse cx="12" cy="5" rx="2" ry="3"/><ellipse cx="18" cy="7" rx="2" ry="3"/><path d="M6 15c2-6 10-6 12 0 4 6-3 8-6 5-3 3-10 1-6-5Z"/></>,
    tools: <path d="M14 3a6 6 0 0 0-6 8L2 17l5 5 6-6a6 6 0 0 0 8-7l-4 4-5-5 4-4Z"/>,
    home: <path d="m2 11 10-9 10 9M5 9v12h5v-7h4v7h5V9"/>,
    car: <><path d="m5 9 2-6h10l2 6M3 10h18v10h-3v-3H6v3H3Z"/><path d="M6 13h2m8 0h2"/></>,
    beauty: <path d="M20 3C8 2 2 9 6 16c7 5 15-2 14-13ZM3 22 16 8"/>,
    gift: <><path d="M3 8h18v5H3zm2 5v8h14v-8M12 8v13"/><path d="M12 8C3 8 4 1 8 3c2 1 4 5 4 5Zm0 0c9 0 8-7 4-5-2 1-4 5-4 5Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function categoryAppearance(name: string, index: number): { name: string; icon: IconName; className: string; description: string } {
  const styles: Record<string, [IconName, string]> = {
    "Tech": ["tech", "tech"], "Home & Kitchen": ["home", "home"], "Electronics & Tech": ["chip", "car"],
    "Beauty & Personal Care": ["beauty", "beauty"], "Health & Household": ["health", "home"],
    "Clothing, Shoes & Jewelry": ["shirt", "beauty"], "Sports & Outdoors": ["sports", "home"],
    "Toys & Games": ["games", "cute"], "Pet Supplies": ["pet", "cute"], "Automotive": ["car", "car"],
    "Tools & Home Improvement": ["tools", "tech"],
  };
  const [icon, className] = styles[name] || ["gift", ["tech", "home", "car", "beauty", "cute"][index % 5]];
  return { name, icon, className, description: "Thoughtful finds for your everyday." };
}
const brands = ["Amazon", "Walmart", "Best Buy", "Temu", "Target", "Etsy"];

export default function LandingPage({ admin, initialCatalog }: { admin: boolean; initialCatalog: CatalogSnapshot }) {
  const { products: catalog, categories: categoryNames, error: catalogError } = useCatalog(initialCatalog);
  const categories = categoryNames.map(categoryAppearance);
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Tech");
  const [query, setQuery] = useState("");
  const savedSnapshot = useSyncExternalStore(subscribeSaved, readSaved, emptySaved);
  let saved: string[] = [];
  try { const value: unknown = JSON.parse(savedSnapshot); if (Array.isArray(value)) saved = value.filter((item): item is string => typeof item === "string"); } catch { /* Ignore malformed stored data. */ }
  const [savedOnly, setSavedOnly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  function toggleSave(id: string) {
    writeSaved(saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id]);
  }
  function selectCategory(name: string) { setCategory(name); }
  const filtering = !!query || savedOnly;
  const activeCategory = categoryNames.includes(category) ? category : categoryNames[0];
  const visibleCategories = filtering ? categories : [...categories.filter(item => item.name === activeCategory), ...categories.filter(item => item.name !== activeCategory)];
  function matchingProducts(name: string) {
    return catalog.filter(product => product.status === "Published" && product.category === name && (!brand || product.store === brand) && (!savedOnly || saved.includes(product.id)) && (!query || `${product.name} ${product.code} ${product.store} ${product.brand}`.toLowerCase().includes(query.toLowerCase())));
  }

  return <div className="site-shell">
    <div className="announcement"><span>GOOD FINDS, EVERY DAY</span><span>Small choices. Big happiness. <span className="tiny-spark">✦</span></span></div>
    <header className="header">
      <Link href="/" className="wordmark site-brand" aria-label="WorthPickora home"><SiteLogo/><span className="site-brand-text">Worth<span>Pickora</span>.</span></Link>
      <div className="landing-header-actions"><Link className="landing-admin-button" href={admin ? "/admin/products" : "/admin/login"}>admin</Link></div>
    </header>
    <main>
      {catalogError && <p className="catalog-sync-notice" role="status">Latest products could not be loaded. Reconnecting automatically.</p>}
      <section className="brand-section" aria-label="Shop by brand"><div className="brand-search-heading"><h2>Shop by Brand</h2><label className="search-box"><Icon name="search" size={21}/><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search product code, name or brand" aria-label="Search products"/>{query && <button aria-label="Clear search" onClick={() => setQuery("")}><Icon name="close" size={16}/></button>}<span className="search-hint">Explore a little</span></label></div><div className="brand-list">{brands.map(item => <button key={item} className={`brand-button ${brand === item ? "active" : ""}`} onClick={() => setBrand(brand === item ? "" : item)} aria-pressed={brand === item}><BrandMark brand={item}/><span>{item}</span>{brand === item && <span className="brand-selected-dot"/>}</button>)}</div></section>
      <nav className="categories" aria-label="Product categories">{categories.map(item => <button key={item.name} onClick={() => selectCategory(item.name)} className={`${item.className} ${activeCategory === item.name ? "active" : ""}`} aria-pressed={activeCategory === item.name}><Icon name={item.icon} size={26}/><span>{item.name}</span><Icon name="chevron" size={15}/></button>)}</nav>
      {filtering && <div className="filter-status"><span>{savedOnly ? "Saved items" : "Search results"}{query && ` for “${query}”`}</span><button onClick={() => {setQuery("");setSavedOnly(false);}}>Clear filters <Icon name="close" size={14}/></button></div>}
      <div className="set-list-toolbar"><div className="header-tagline"><span className="eyebrow">THE EVERYDAY, A LITTLE BETTER</span><h1>Find more of what’s <span>worth it.</span></h1></div><button className={`saved-button ${savedOnly ? "selected" : ""}`} onClick={() => setSavedOnly(!savedOnly)} aria-pressed={savedOnly}><Icon name="heart"/><span>Saved Items</span><b>{saved.length}</b></button></div>
      {visibleCategories.map(cat => {
        const matches = matchingProducts(cat.name);
        if (!matches.length) return null;
        return <section key={cat.name} className="slider-category" aria-label={cat.name+" product sets"}>
          <h2 className="slider-category-title">{cat.name}</h2>
          {productSets(matches,cat.name).map(number=><ProductSlider key={number} name={cat.name+" Set "+String(number).padStart(2,"0")} products={matches.filter(product=>product.set===number)} saved={saved} onSave={toggleSave} tone={categoryNames.indexOf(cat.name)+number-1}/>)}
        </section>;
      })}
      {filtering && !categories.some(cat => matchingProducts(cat.name).length) && <div className="empty-state"><Icon name={savedOnly ? "heart" : "search"} size={36}/><h2>{savedOnly ? "Your favorites start here." : "No finds just yet."}</h2><p>{savedOnly ? "Tap the heart on anything you love to keep it here." : "Try a product name, code, or a different search."}</p><button onClick={() => {setSavedOnly(false);setQuery("");}}>Explore the collection <Icon name="arrow" size={18}/></button></div>}
      <div className="closing-note"><span>✦</span><p>Small choices.<br/><em>Big happiness.</em></p><span>✦</span></div>
    </main>
    <SetNavigation/>
    <footer><Link href="/" className="wordmark">Worth<span>Pickora</span>.</Link><p>A little less searching. A little more finding.</p><span>© {new Date().getFullYear()} WorthPickora</span>{admin && <Link href="/admin/products" className="catalog-admin-link">Manage products</Link>}<small>Curated inspiration · Store links open retailer search results.</small></footer>
    <nav className="mobile-nav" aria-label="Mobile navigation"><button className={!savedOnly ? "active" : ""} onClick={() => {setSavedOnly(false);setQuery("");window.scrollTo({ top: 0, behavior: "smooth" });}}><Icon name="home"/>Home</button><button onClick={() => {searchRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });searchRef.current?.focus({ preventScroll: true });}}><Icon name="search"/>Search</button><button className={savedOnly ? "active" : ""} onClick={() => setSavedOnly(!savedOnly)}><Icon name="heart"/>Saved{saved.length > 0 && <b>{saved.length}</b>}</button></nav>
  </div>;
}
