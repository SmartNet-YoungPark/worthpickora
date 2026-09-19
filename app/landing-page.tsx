"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import SiteLogo from "./site-logo";
import ProductDescription from "./product-description";
import MoreProductsButton from "./more-products-button";
import { useCatalog } from "@/lib/use-catalog";
import { CatalogSnapshot, productSets, validUrl } from "@/lib/catalog";
import { groupProductSets } from "@/lib/set-groups";

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

type IconName = "search" | "heart" | "arrow" | "chevron" | "plus" | "external" | "tech" | "home" | "car" | "beauty" | "gift" | "close";
function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, chevron: <path d="m9 5 7 7-7 7"/>, plus: <path d="M12 4v16M4 12h16"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
    external: <><path d="M14 3h7v7m0-7L10 14"/><path d="M10 4H4v16h16v-6"/></>,
    tech: <><rect x="4" y="3" width="16" height="14" rx="1"/><path d="M2 21h20M9 17v4m6-4v4"/></>,
    home: <path d="m2 11 10-9 10 9M5 9v12h5v-7h4v7h5V9"/>,
    car: <><path d="m5 9 2-6h10l2 6M3 10h18v10h-3v-3H6v3H3Z"/><path d="M6 13h2m8 0h2"/></>,
    beauty: <path d="M20 3C8 2 2 9 6 16c7 5 15-2 14-13ZM3 22 16 8"/>,
    gift: <><path d="M3 8h18v5H3zm2 5v8h14v-8M12 8v13"/><path d="M12 8C3 8 4 1 8 3c2 1 4 5 4 5Zm0 0c9 0 8-7 4-5-2 1-4 5-4 5Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function categoryAppearance(name: string, index: number): { name: string; icon: IconName; className: string; description: string } {
  const styles: Record<string, [IconName, string]> = {
    "Tech": ["tech", "tech"], "Home & Kitchen": ["home", "home"], "Electronics & Tech": ["tech", "car"],
    "Beauty & Personal Care": ["beauty", "beauty"], "Health & Household": ["heart", "home"],
    "Clothing, Shoes & Jewelry": ["gift", "beauty"], "Sports & Outdoors": ["gift", "home"],
    "Toys & Games": ["gift", "cute"], "Pet Supplies": ["heart", "cute"], "Automotive": ["car", "car"],
    "Tools & Home Improvement": ["home", "tech"],
  };
  const [icon, className] = styles[name] || ["gift", ["tech", "home", "car", "beauty", "cute"][index % 5]];
  return { name, icon, className, description: "Thoughtful finds for your everyday." };
}
const brands = ["Amazon", "Walmart", "Best Buy", "Temu", "Target", "Etsy"];
function BrandMark({ brand }: { brand: string }) {
  return <span className={`brand-mark ${brand.toLowerCase().replace(" ", "-")}`} aria-hidden="true">{brand === "Amazon" ? "a" : brand === "Walmart" ? "✳" : brand === "Best Buy" ? <>BEST<br/>BUY</> : brand === "Temu" ? "TEMU" : brand === "Target" ? "◎" : "E"}</span>;
}

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
  const [moreBrands, setMoreBrands] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, number | null>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const [slides, setSlides] = useState<Record<string, number>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const collapsedSet = useRef<{ heading: HTMLElement; gridId: string } | null>(null);
  useLayoutEffect(() => {
    const target = collapsedSet.current;
    collapsedSet.current = null;
    if (!target || !target.heading.isConnected) return;
    // Collapsing the tall mobile grid can move the page's scroll anchor past
    // the set heading. Restore it after layout, with the toggle still visible.
    document.getElementById(target.gridId)?.scrollTo({ left: 0, behavior: "instant" });
    window.scrollTo({ top: Math.max(0, window.scrollY + target.heading.getBoundingClientRect().top - 16), behavior: "instant" });
  }, [showAll]);
  function toggleSave(id: string) {
    writeSaved(saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id]);
  }
  function selectCategory(name: string) { setCategory(name); setExpanded(current => ({ ...current, [name]: current[name] || 1 })); setSlides({}); }
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
      <label className="search-box"><Icon name="search" size={21}/><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search product code, name or brand" aria-label="Search products"/>{query && <button aria-label="Clear search" onClick={() => setQuery("")}><Icon name="close" size={16}/></button>}<span className="search-hint">Explore a little</span></label>
      <div className="landing-header-actions"><button className={`saved-button ${savedOnly ? "selected" : ""}`} onClick={() => setSavedOnly(!savedOnly)} aria-pressed={savedOnly}><Icon name="heart"/><span>Saved Items</span><b>{saved.length}</b></button><Link className="landing-admin-button" href={admin ? "/admin/products" : "/admin/login"}><Icon name="external" size={16}/>{admin ? "Admin Page" : "Admin Login"}</Link></div>
    </header>
    <main>
      {catalogError && <p className="catalog-sync-notice" role="status">Latest products could not be loaded. Reconnecting automatically.</p>}
      <div className="intro"><div><span className="eyebrow">THE EVERYDAY, A LITTLE BETTER</span><h1>Find more of what’s <span>worth it.</span></h1></div><p>Good products. Thoughtfully picked.<br/>A brighter everyday starts here.</p></div>
      <section className="brand-section" aria-label="Shop by brand"><h2>Shop by Brand</h2><div className="brand-list">{brands.slice(0, moreBrands ? 6 : 4).map(item => <button key={item} className={`brand-button ${brand === item ? "active" : ""}`} onClick={() => setBrand(brand === item ? "" : item)} aria-pressed={brand === item}><BrandMark brand={item}/><span>{item}</span>{brand === item && <span className="brand-selected-dot"/>}</button>)}<button className="more-brands" onClick={() => setMoreBrands(!moreBrands)} aria-expanded={moreBrands}><Icon name={moreBrands ? "close" : "plus"} size={19}/><span>{moreBrands ? "Fewer Brands" : "More Brands"}</span></button></div></section>
      <nav className="categories" aria-label="Product categories">{categories.map(item => <button key={item.name} onClick={() => selectCategory(item.name)} className={`${item.className} ${activeCategory === item.name ? "active" : ""}`} aria-pressed={activeCategory === item.name}><Icon name={item.icon} size={26}/><span>{item.name}</span><Icon name="chevron" size={15}/></button>)}</nav>
      <div className="collection-heading"><span><span className="little-star">✦</span> {savedOnly ? "Your little collection of good finds" : "Curated finds, made for your everyday"}</span><span>HANDPICKED, NOT OVERWHELMING</span></div>
      {filtering && <div className="filter-status"><span>{savedOnly ? "Saved items" : "Search results"}{query && ` for “${query}”`}</span><button onClick={() => {setQuery("");setSavedOnly(false);}}>Clear filters <Icon name="close" size={14}/></button></div>}
      {visibleCategories.map(cat => {
        const matches = matchingProducts(cat.name);
        if (matches.length === 0) return null;
        const availableSets = productSets(matches, cat.name);
        const grouped = availableSets.length >= 5;
        const requestedSet = expanded[cat.name];
        const lastSet = availableSets[availableSets.length - 1];
        const selectedSet = requestedSet === null ? null : requestedSet !== undefined && availableSets.includes(requestedSet) ? requestedSet : lastSet;
        return <section key={cat.name} className={`product-section ${cat.className}`} aria-label={`${cat.name} product sets`}>
          <div className="section-bar"><h2>{cat.name} Products Set</h2>{!grouped && <div className="set-tabs">{availableSets.map(number => <button key={number} className={(selectedSet || availableSets[0]) === number ? "active" : ""} onClick={() => {setExpanded(current => ({ ...current, [cat.name]: number }));setSlides({});}}>Set {String(number).padStart(2, "0")}</button>)}</div>}<span className="section-note">{grouped ? `${availableSets.length} sets · Browse in groups of 5` : "A few favorites, just for you"}</span></div>
          {groupProductSets(availableSets).map(group => {
            const rows = group.map(number => {
            const open = filtering || selectedSet === number;
            const ordered = matches.filter(product => product.set === number);
            const setKey = JSON.stringify([cat.name, number]);
            const showingAll = !!showAll[setKey] || filtering;
            const products = showingAll ? ordered : ordered.slice(0, 5);
            const gridId = `products-${encodeURIComponent(cat.name)}-${number}`;
            return <div className={`product-set ${open ? "open" : ""}`} key={number}>
              <div className="set-heading"><button className="set-toggle" onClick={() => setExpanded(current => ({ ...current, [cat.name]: open ? null : number }))} aria-expanded={open}><h3>{cat.name} Set {String(number).padStart(2, "0")}</h3>{!open && <span>{ordered.length} products</span>}</button>{open ? <div className="set-details"><span>Showing {products.length} of {ordered.length}</span>{ordered.length > 5 && !filtering && <MoreProductsButton expanded={!!showAll[setKey]} controls={gridId} onToggle={button => { if (showAll[setKey] && window.matchMedia("(max-width: 760px)").matches) { const heading = button.closest<HTMLElement>(".set-heading"); if (heading) collapsedSet.current = { heading, gridId }; } setShowAll(current => ({ ...current, [setKey]: !current[setKey] })); setSlides(current => ({ ...current, [setKey]: 0 })); }}/>}</div> : <button className="expand-button" onClick={() => setExpanded(current => ({ ...current, [cat.name]: number }))} aria-label={`Expand ${cat.name} set ${number}`}><Icon name="plus"/></button>}</div>
              {open && <><div id={gridId} className={`product-grid${showingAll ? " product-grid-expanded" : ""}`} onScroll={event => { const element = event.currentTarget; const slide = Math.round(element.scrollLeft / (element.scrollWidth - element.clientWidth || 1) * 4); setSlides(current => current[setKey] === slide ? current : { ...current, [setKey]: slide }); }}>{products.length === 0 && <p className="catalog-empty-set">New finds are on their way. Explore another set or store.</p>}{products.map(product => <article className="product-card" key={product.id}>
                <div className="card-top"><button className={`heart-button ${saved.includes(product.id) ? "is-saved" : ""}`} onClick={() => toggleSave(product.id)} aria-label={`${saved.includes(product.id) ? "Unsave" : "Save"} ${product.name}`} aria-pressed={saved.includes(product.id)}><Icon name="heart" size={23}/></button><BrandMark brand={product.store}/></div>
                <a className="product-image-link" href={validUrl(product.url) ? `/go/${encodeURIComponent(product.id)}` : undefined} target="_blank" rel="noopener noreferrer sponsored" aria-label={`View ${product.name} on ${product.store} (opens in a new tab)`}>{product.image ? <Image className="catalog-uploaded-photo" src={product.image} alt={product.name} width={150} height={132} unoptimized/> : product.photo !== null ? <div className={`product-photo photo-${product.photo}`} role="img" aria-label={product.name}/> : <div className="product-illustration"><Icon name={cat.icon} size={68}/><span>THE {cat.name.toUpperCase()} EDIT</span></div>}</a>
                <div className="product-info"><div className="product-code-row"><h4>{product.code}</h4><ProductDescription description={product.description} name={product.name}/></div><p>{product.name}</p></div><a className="store-button" href={validUrl(product.url) ? `/go/${encodeURIComponent(product.id)}` : undefined} target="_blank" rel="noopener noreferrer"><Icon name="external" size={18}/>View on Store</a>
              </article>)}</div>{!showingAll && <div className="mobile-dots" aria-hidden="true">{[0, 1, 2, 3, 4].map(dot => <span key={dot} className={(slides[setKey] || 0) === dot ? "active" : ""}/>)}</div>}<div className="set-caption"><span><span className="little-star">✦</span> {cat.description}</span><span>Find your next favorite <Icon name="arrow" size={14}/></span></div></>}
            </div>;
            });
            if (!grouped) return <div key={group[0]}>{rows}</div>;
            const label = group.length === 1 ? `${cat.name} Set ${group[0]}` : `${cat.name} Set ${group[0]} - ${cat.name} Set ${group[group.length - 1]}`;
            return <details key={group[0]} className="set-group" open={filtering || group.includes(lastSet) ? true : undefined}>
              <summary><span>{label}</span><span className="set-group-count">{group.length} {group.length === 1 ? "set" : "sets"}</span><Icon name="chevron" size={19}/></summary>
              <div className="set-group-rows">{rows}</div>
            </details>;
          })}
        </section>;
      })}
      {filtering && !categories.some(cat => matchingProducts(cat.name).length) && <div className="empty-state"><Icon name={savedOnly ? "heart" : "search"} size={36}/><h2>{savedOnly ? "Your favorites start here." : "No finds just yet."}</h2><p>{savedOnly ? "Tap the heart on anything you love to keep it here." : "Try a product name, code, or a different search."}</p><button onClick={() => {setSavedOnly(false);setQuery("");}}>Explore the collection <Icon name="arrow" size={18}/></button></div>}
      <div className="closing-note"><span>✦</span><p>Small choices.<br/><em>Big happiness.</em></p><span>✦</span></div>
    </main>
    <footer><Link href="/" className="wordmark">Worth<span>Pickora</span>.</Link><p>A little less searching. A little more finding.</p><span>© {new Date().getFullYear()} WorthPickora</span>{admin && <Link href="/admin/products" className="catalog-admin-link">Manage products</Link>}<small>Curated inspiration · Store links open retailer search results.</small></footer>
    <nav className="mobile-nav" aria-label="Mobile navigation"><button className={!savedOnly ? "active" : ""} onClick={() => {setSavedOnly(false);setQuery("");window.scrollTo({ top: 0, behavior: "smooth" });}}><Icon name="home"/>Home</button><button onClick={() => {searchRef.current?.focus();window.scrollTo({ top: 0, behavior: "smooth" });}}><Icon name="search"/>Search</button><button className={savedOnly ? "active" : ""} onClick={() => setSavedOnly(!savedOnly)}><Icon name="heart"/>Saved{saved.length > 0 && <b>{saved.length}</b>}</button></nav>
  </div>;
}
