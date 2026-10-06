"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteLogo from "@/app/site-logo";
import ProductDescription from "@/app/product-description";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { STORES, STATUSES, CatalogSnapshot, Category, Product, ProductStatus, productSets, compareSetCode, sortProductsBySetCode, exportCsv, prepareCsvImport, validateProduct, validateSetCapacity, validUrl } from "@/lib/catalog";
import { embedProductImages } from "@/lib/catalog-images";
import { deleteCatalogProducts, saveCatalog, useCatalog } from "@/lib/use-catalog";
import Icon, { AdminIconName } from "./icons";
import SetPicker from "./set-picker";
import CategoryManager from "./category-manager";

function ProductImage({ product }: { product: Product }) {
  if (product.image) return <Image src={product.image} alt={product.name || "Product preview"} width={150} height={132} unoptimized className="uploaded-product-image"/>;
  if (product.photo !== null) return <div className={`product-photo photo-${product.photo}`} role="img" aria-label={product.name}/>;
  return <div className="admin-image-placeholder"><Icon name="image" size={30}/></div>;
}
function StoreMark({ store }: { store: string }) {
  return <span className={`admin-store-mark ${store.toLowerCase().replaceAll(" ", "-")}`}>{store === "Amazon" ? "a" : store === "Walmart" ? "✳" : store === "Best Buy" ? <>BEST<br/>BUY</> : store === "Temu" ? "TEMU" : store === "Target" ? "◎" : "E"}</span>;
}
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog className="admin-modal" ref={ref} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="admin-modal-heading"><h2>{title}</h2><button onClick={onClose} aria-label="Close dialog"><Icon name="close"/></button></div>{children}</dialog>;
}
async function download(products: Product[], format: "xlsx" | "csv") {
  const embedded = await embedProductImages(products, format === "xlsx");
  const bytes = format === "xlsx" ? await (await import("@/lib/catalog-workbook")).exportProductWorkbook(embedded) : exportCsv(embedded);
  const url = URL.createObjectURL(new Blob([bytes], { type: format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `worthpickora-products-${new Date().toISOString().slice(0, 10)}.${format}`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const nav: { label: string; icon: AdminIconName }[] = [{ label: "Dashboard", icon: "grid" }, { label: "Products", icon: "box" }, { label: "Product Sets", icon: "layers" }, { label: "Categories", icon: "folder" }, { label: "Brands", icon: "tag" }, { label: "Stores", icon: "store" }];
const PAGE_SIZE = 20;
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });

export default function ProductsAdmin({ initialCatalog }: { initialCatalog: CatalogSnapshot }) {
  const router = useRouter();
  const { products, categories: categoryNames, revision, error: syncError, loading } = useCatalog(initialCatalog, true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState("Products");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [store, setStore] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [sort, setSort] = useState("code");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<Product | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ run: () => void } | null>(null);
  const [pendingImport, setPendingImport] = useState<(ReturnType<typeof prepareCsvImport> & { revision: string }) | null>(null);
  const [importError, setImportError] = useState("");
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const importInFlight = useRef(false);
  const [pendingDelete, setPendingDelete] = useState<{ items: Product[]; revision: string } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveCategory, setMoveCategory] = useState<Category>("Tech");
  const [moveSet, setMoveSet] = useState(1);
  const csvInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const uploadVersion = useRef(0);
  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);
  const isNew = draft !== null && !products.some(product => product.id === draft.id);
  // Read the latest persisted item until the user starts editing it.
  const editor = draft && !dirty ? products.find(product => product.id === draft.id) || draft : draft;
  const distinctBrands = Array.from(new Set(products.map(product => product.brand).filter(Boolean))).sort();
  const filtered = products.filter(product => `${product.code} ${product.name} ${product.asin} ${product.url} ${product.brand}`.toLowerCase().includes(query.toLowerCase()) && (!category || product.category === category) && (!setFilter || product.set === Number(setFilter)) && (!store || product.store === store) && (!brand || product.brand === brand) && (!status || product.status === status) && (!hasImage || product.image || product.photo !== null));
  if (sort === "code") filtered.sort((a,b)=>a.code.localeCompare(b.code,"en",{numeric:true,sensitivity:"base"}) || compareSetCode(a,b) || a.id.localeCompare(b.id));
  if (sort === "set-code") filtered.sort(compareSetCode);
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "updated") filtered.sort((a, b) => b.updated.localeCompare(a.updated));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedProducts = products.filter(product => selected.includes(product.id));
  const filtersActive = !!(query || category || setFilter || store || brand || status || hasImage);

  function guard(action: () => void) { if (dirty) setPendingAction({ run: action }); else action(); }
  function openEditor(product: Product) {
    guard(() => { uploadVersion.current++; setUploading(false); setDraft({ ...product }); setDirty(false); setError(""); setPreview(false); setTimeout(() => nameInput.current?.focus(), 0); });
  }
  function addProduct() {
    const prefix = category === "Cute Finds" ? "F" : (category || categoryNames[0])[0];
    let number = 1; while (products.some(product => product.code === `${prefix}${String(number).padStart(3, "0")}`)) number++;
    openEditor({ id: crypto.randomUUID(), name: "", code: `${prefix}${String(number).padStart(3, "0")}`, description: "", category: (category || categoryNames[0]) as Category, set: Number(setFilter || 1), store: store || "Amazon", brand: "", asin: "", url: "", image: "", photo: null, status: "Draft", updated: new Date().toISOString() });
  }
  function closeEditor() { guard(() => { uploadVersion.current++; setUploading(false); setDraft(null); setDirty(false); setError(""); }); }
  function update(field: keyof Product, value: string | number | null) {
    if (!editor) return;
    setDraft({ ...editor, [field]: value, ...(field === "category" && value !== editor.category ? { set: productSets(products, String(value))[0] } : {}) }); setDirty(true); setError("");
  }
  async function persist(next: Product[], message: string, nextCategories: string[] = categoryNames, onFailure?: (message: string) => void) {
    if (saving || loading) return false;
    const capacityError = validateSetCapacity(next);
    if (capacityError) { setNotice({ message: capacityError, error: true }); onFailure?.(capacityError); return false; }
    setSaving(true);
    try { await saveCatalog(next, revision, nextCategories, setImportProgress); setNotice({ message, error: false }); return true; }
    catch (problem) { const message = problem instanceof Error ? problem.message : "Could not save. Check your connection and try again."; setNotice({ message, error: true }); onFailure?.(message); return false; }
    finally { setSaving(false); }
  }
  function requestDelete(items: Product[]) {
    if (saving || loading || !items.length) return;
    guard(() => { setDeleteError(""); setPendingDelete({ items, revision }); });
  }
  async function deleteProducts() {
    if (!pendingDelete || saving || loading) return;
    if (pendingDelete.revision !== revision) {
      setDeleteError("The catalog changed. Close this dialog and review the products before deleting again.");
      return;
    }
    const ids = new Set(pendingDelete.items.map(product => product.id));
    setDeleteError("");
    setSaving(true);
    try {
      await deleteCatalogProducts([...ids], { products, categories: categoryNames, revision, persisted: true });
      setNotice({ message: `${ids.size} product(s) permanently deleted.`, error: false });
      setSelected(current => current.filter(id => !ids.has(id)));
      if (draft && ids.has(draft.id)) { uploadVersion.current++; setUploading(false); setDraft(null); setDirty(false); setError(""); setPreview(false); }
      setPendingDelete(null);
    } catch (problem) {
      setDeleteError(problem instanceof Error ? problem.message : "Could not delete products. Check your connection and try again.");
    } finally { setSaving(false); }
  }
  async function exportProducts(items: Product[], format: "xlsx" | "csv" = "xlsx") {
    if (exporting) return;
    setExporting(true);
    try { await download(items, format); setNotice({ message: `Exported ${items.length} products with embedded images.`, error: false }); }
    catch (problem) { setNotice({ message: problem instanceof Error ? problem.message : "Could not export images.", error: true }); }
    finally { setExporting(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editor) return;
    const product = { ...editor, name: editor.name.trim(), code: editor.code.trim().toUpperCase(), url: (editor.store==="Amazon"?editor.urlUS?.trim():"")||editor.url.trim(), urlUS:editor.urlUS?.trim(),urlCA:editor.urlCA?.trim(), brand: editor.brand.trim(), asin: editor.asin.trim().toUpperCase(), updated: new Date().toISOString() };
    const problem = validateProduct(product, products, categoryNames); if (problem) { setError(problem); return; }
    const next = isNew ? [product, ...products] : products.map(item => item.id === product.id ? product : item);
    if (await persist(next, `${product.name} ${isNew ? "added" : "updated"}${product.status === "Published" ? " and visible on your storefront" : " as " + product.status.toLowerCase()}.`)) {
      setDraft(product); setDirty(false); setError("");
      if (isNew) { clearFilters(); setPage(1); }
    } else setError("Your changes were not saved. Check the notification above for details.");
  }
  async function upload(file?: File) {
    if (!file || !editor) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Please choose an image smaller than 5 MB."); return; }
    const version = ++uploadVersion.current; setDraft({ ...editor }); setUploading(true); setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const ratio = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
      const context = canvas.getContext("2d"); if (!context) throw new Error("Image processing is not available.");
      context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const image = canvas.toDataURL("image/jpeg", 0.82);
      if (version === uploadVersion.current) { setDraft(current => current ? { ...current, image, photo: null } : current); setDirty(true); }
    } catch { if (version === uploadVersion.current) setError("This image could not be opened. Try another JPG or PNG."); }
    finally { if (version === uploadVersion.current) setUploading(false); }
  }
  async function loadCsv(file?: File) {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { setNotice({ message: "Choose an Excel or CSV file smaller than 50 MB, including images.", error: true }); return; }
    try { const content = file.name.toLowerCase().endsWith(".xlsx") ? await (await import("@/lib/catalog-workbook")).workbookToCsv(await file.arrayBuffer()) : await file.text(); const next = prepareCsvImport(content, products, categoryNames); guard(() => { setImportError(""); setPendingImport({ ...next, revision }); }); }
    catch (problem) { setNotice({ message: problem instanceof Error ? problem.message : "Could not read the CSV file.", error: true }); }
  }
  async function confirmImport() {
    if (!pendingImport || saving || loading || importInFlight.current) return;
    setImportError("");
    if (pendingImport.revision !== revision) {
      setImportError("The catalog changed after you selected this file. Cancel and select the file again to review the latest products.");
      return;
    }
    importInFlight.current = true;
    setImportProgress(null);
    try {
      if (await persist(sortProductsBySetCode(pendingImport.products), `${pendingImport.imported} products imported. ${pendingImport.skipped.length} duplicate products skipped.`, categoryNames, setImportError)) {
        setPendingImport(null); setDraft(null); setDirty(false); clearFilters(); setSort("code"); setPage(1);
      }
    } finally { importInFlight.current = false; }
  }
  function bulkStatus(nextStatus: ProductStatus) {
    guard(async () => {
      if (await persist(products.map(product => selected.includes(product.id) ? { ...product, status: nextStatus, updated: new Date().toISOString() } : product), `${selectedProducts.length} products ${nextStatus === "Archived" ? "archived" : "published"}.`)) { setSelected([]); setDirty(false); }
    });
  }
  function clearFilters() { setQuery(""); setCategory(""); setStore(""); setBrand(""); setStatus(""); setSetFilter(""); setHasImage(false); setPage(1); setSelected([]); }
  function filterChange(action: () => void) { action(); setPage(1); setSelected([]); }
  function goView(label: string) { guard(() => { setView(label); clearFilters(); setDraft(null); setDirty(false); }); }

  return <div className={`admin-app ${editor ? "with-editor" : ""}`}>
    <aside className="admin-sidebar">
      <Link href="/" className="admin-logo site-brand"><SiteLogo/><span className="site-brand-text">Worth<span>Pickora</span><b>Admin</b></span></Link>
      <div className="admin-workspace"><span>W</span><div>WorthPickora<small>Product workspace</small></div><span className="workspace-dot"/></div>
      <p className="admin-nav-label">MANAGE</p>
      <nav aria-label="Admin navigation">{nav.map(item => <button key={item.label} className={view === item.label ? "active" : ""} onClick={() => goView(item.label)}><Icon name={item.icon}/>{item.label}{item.label === "Products" && <span>{products.length}</span>}</button>)}</nav>
      <p className="admin-nav-label second">QUICK LINKS</p>
      <Link href="/admin/analytics" className="admin-button"><Icon name="chart"/>Click analytics</Link>
      <Link href="/admin/store-apps" className="admin-button"><Icon name="external"/>Store apps &amp; offers</Link>
      <Link href="/admin/store-apps#department-rankings" className="admin-button"><Icon name="external"/>Department counts</Link>
      <Link href="/admin/store-apps#promotion-previews" className="admin-button"><Icon name="external"/>Promotion previews</Link>
      <Link href="/promotions/Amazon/US" target="_blank" rel="noopener noreferrer" prefetch={false} className="admin-button"><Icon name="external"/>Amazon US promotions</Link>
      <Link href="/promotions/Amazon/CA" target="_blank" rel="noopener noreferrer" prefetch={false} className="admin-button"><Icon name="external"/>Amazon Canada promotions</Link>
      <Link href="/admin/banner" className="admin-button"><Icon name="external"/>Landing banner</Link>
      <Link href="/admin/password" className="admin-button"><Icon name="external"/>Change PIN</Link>
      <nav aria-label="Quick links"><Link href="/" target="_blank"><Icon name="external"/>View storefront</Link><button disabled={exporting || loading} onClick={() => void exportProducts(products)}><Icon name="download"/>Excel with Images</button><button disabled={exporting || loading} onClick={() => void exportProducts(products, "csv")}><Icon name="download"/>Export CSV (text)</button></nav>
      <div className="sidebar-bottom"><div className="admin-motto"><span>♛</span><p>Good Products.<br/>A Brighter Today.<i/></p></div><div className="admin-profile"><span>WP</span><div>Your workspace<small>Shared product catalog</small></div><span className="workspace-dot"/></div></div>
    </aside>
    <main className="admin-main">
      <div className="admin-breadcrumb">Workspace <span>/</span> Catalog <span>/</span> <b>{view}</b><div className="admin-page-navigation"><Link className="admin-button" href="/" onClick={event => { if (dirty) { event.preventDefault(); guard(() => router.push("/")); } }}>Landing Page <Icon name="external" size={14}/></Link><form action="/api/admin/logout" method="post" onSubmit={event => { if (dirty) { event.preventDefault(); const form = event.currentTarget; guard(() => form.submit()); } }}><button className="admin-logout-button" type="submit">Log out</button></form></div></div>
      <div className="admin-title-row"><div><div className="admin-title-line"><h1>{view}</h1>{view === "Products" && <span>{products.length} products</span>}</div><p>{view === "Products" ? "Good finds deserve a well-kept catalog." : "A little clarity for your everyday curation."}</p></div><div className="admin-top-actions"><button className="admin-button" onClick={() => csvInput.current?.click()}><Icon name="upload" size={17}/><span>Import Excel / CSV</span></button><button className="admin-button" disabled={exporting || loading} onClick={() => void exportProducts(filtered)}><Icon name="download" size={17}/><span>{exporting ? "Including images…" : "Excel with Images"}</span></button><button className="admin-button primary" onClick={() => { setView("Products"); addProduct(); }}><Icon name="plus" size={19}/>Add Product</button></div></div>
      <input ref={csvInput} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={event => { void loadCsv(event.target.files?.[0]); event.target.value = ""; }}/>
      {notice && <div className={`admin-notice${notice.error ? " admin-notice-error" : ""}`} role={notice.error ? "alert" : "status"}><Icon name="box" size={18}/><span>{notice.message}</span><button aria-label="Dismiss notification" onClick={() => setNotice(null)}><Icon name="close" size={17}/></button></div>}
      {syncError && <div className="admin-notice admin-notice-error" role="alert">{syncError}</div>}
      {loading && <div className="admin-notice" role="status">Loading your latest product catalog…</div>}
      {view === "Dashboard" && <div className="admin-stats">{[{ label: "Total products", count: products.length, icon: "box" }, { label: "Published", count: products.filter(product => product.status === "Published").length, icon: "check" }, { label: "Drafts", count: products.filter(product => product.status === "Draft").length, icon: "edit" }, { label: "Needs review", count: products.filter(product => product.status === "Needs Review").length, icon: "eye" }].map(stat => <button key={stat.label} onClick={() => { setView("Products"); filterChange(() => setStatus(stat.label === "Total products" ? "" : stat.label === "Drafts" ? "Draft" : stat.label === "Needs review" ? "Needs Review" : "Published")); }}><Icon name={stat.icon as AdminIconName}/><strong>{stat.count}</strong><span>{stat.label}</span></button>)}</div>}
      {view === "Categories" ? <CategoryManager categories={categoryNames} products={products} busy={saving || loading} onSave={persist}/> : ["Product Sets", "Brands", "Stores"].includes(view) ? <div className="admin-directory">{(view === "Product Sets" ? categoryNames.flatMap(cat => productSets(products, cat).map(number => ({ label: `${cat} Set ${String(number).padStart(2, "0")}`, count: products.filter(product => product.category === cat && product.set === number).length, choose: () => { setCategory(cat); setSetFilter(String(number)); } }))) : view === "Stores" ? STORES.map(item => ({ label: item, count: products.filter(product => product.store === item).length, choose: () => setStore(item) })) : distinctBrands.map(item => ({ label: item, count: products.filter(product => product.brand === item).length, choose: () => setBrand(item) }))).map(item => <button key={item.label} onClick={() => { item.choose(); setView("Products"); }}><Icon name={view === "Product Sets" ? "layers" : view === "Stores" ? "store" : "tag"}/><h2>{item.label}</h2><span>{item.count} products</span><Icon name="arrow" size={17}/></button>)}{view === "Brands" && !distinctBrands.length && <div className="admin-empty"><Icon name="tag" size={36}/><h2>Your brands will appear here</h2><p>Add a brand name when registering or editing a product.</p><button className="admin-button primary" onClick={() => { setView("Products"); addProduct(); }}>Add Product</button></div>}</div> : <>
        <div className="admin-toolbar"><label className="admin-search"><Icon name="search"/><input aria-label="Search products" placeholder="Search code, name, ASIN or URL..." value={query} onChange={event => filterChange(() => setQuery(event.target.value))}/>{query && <button aria-label="Clear search" onClick={() => filterChange(() => setQuery(""))}><Icon name="close" size={16}/></button>}</label><div className="admin-filters">
          <select aria-label="Filter category" value={category} onChange={event => filterChange(() => setCategory(event.target.value))}><option value="">Category</option>{categoryNames.map(item => <option key={item}>{item}</option>)}</select>
          <select aria-label="Filter product set" value={setFilter} onChange={event => filterChange(() => setSetFilter(event.target.value))}><option value="">Product Set</option>{productSets(products, category).map(number => <option value={number} key={number}>Set {String(number).padStart(2, "0")}</option>)}</select>
          <select aria-label="Filter brand" value={brand} onChange={event => filterChange(() => setBrand(event.target.value))}><option value="">Brand</option>{distinctBrands.map(item => <option key={item}>{item}</option>)}</select>
          <select aria-label="Filter store" value={store} onChange={event => filterChange(() => setStore(event.target.value))}><option value="">Store</option>{STORES.map(item => <option key={item}>{item}</option>)}</select>
          <select aria-label="Filter status" value={status} onChange={event => filterChange(() => setStatus(event.target.value))}><option value="">Status</option>{STATUSES.map(item => <option key={item}>{item}</option>)}</select>
          <button className={`admin-button ${moreFilters ? "filter-active" : ""}`} onClick={() => setMoreFilters(!moreFilters)} aria-expanded={moreFilters}><Icon name="filter" size={16}/>More Filters</button>
          {filtersActive && <button className="admin-clear" onClick={clearFilters}>Reset</button>}
          <span className="admin-result-count">{filtered.length} results</span>
        </div>{moreFilters && <div className="admin-extra-filters"><label><input type="checkbox" checked={hasImage} onChange={event => filterChange(() => setHasImage(event.target.checked))}/>With product image</label><label>Sort by <select value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="code">Product code</option><option value="catalog">Catalog order</option><option value="set-code">Set ? Code</option><option value="updated">Recently updated</option><option value="name">Product name</option></select></label></div>}</div>
        {selectedProducts.length > 0 && <div className="admin-bulk"><strong>{selectedProducts.length} selected</strong><button onClick={() => { setMoveCategory(categoryNames.includes(moveCategory) ? moveCategory : categoryNames[0]); setMoveOpen(true); }}><Icon name="folder" size={16}/>Move to Set</button><button onClick={() => bulkStatus("Published")}><Icon name="send" size={16}/>Publish</button><button onClick={() => bulkStatus("Archived")}><Icon name="archive" size={16}/>Archive</button><button className="admin-delete-action" disabled={saving || loading} onClick={() => requestDelete(selectedProducts)}><Icon name="trash" size={16}/>Delete</button><button aria-label="Clear selection" onClick={() => setSelected([])}><Icon name="close" size={18}/></button></div>}
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th><input type="checkbox" aria-label="Select all products on this page" checked={rows.length > 0 && rows.every(product => selected.includes(product.id))} onChange={event => setSelected(event.target.checked ? Array.from(new Set([...selected, ...rows.map(product => product.id)])) : selected.filter(id => !rows.some(product => product.id === id)))}/></th><th>Image</th><th className="admin-name-heading">Name</th><th>Code</th><th>Category</th><th>Set</th><th>Brand / Store</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{rows.map(product => <tr key={product.id} className={`${selected.includes(product.id) ? "selected" : ""} ${editor?.id === product.id ? "editing" : ""}`}><td><input type="checkbox" aria-label={`Select ${product.name}`} checked={selected.includes(product.id)} onChange={event => setSelected(event.target.checked ? [...selected, product.id] : selected.filter(id => id !== product.id))}/></td><td className="admin-image-cell"><button className="admin-thumbnail" aria-label={`Edit image for ${product.name}`} onClick={() => openEditor(product)}><ProductImage product={product}/></button></td><td><button className="admin-product-cell" onClick={() => openEditor(product)}><strong>{product.name}</strong></button></td><td className="admin-code">{product.code}</td><td>{product.category}</td><td className="admin-set-cell">{product.category} Set {String(product.set).padStart(2, "0")}</td><td><span className="admin-store-cell"><StoreMark store={product.store}/><span>{product.store}{product.brand && <small>{product.brand}</small>}</span></span></td><td><span className={`admin-status ${product.status.toLowerCase().replaceAll(" ", "-")}`}><i/>{product.status}</span></td><td className="admin-date">{dateFormat.format(new Date(product.updated))}</td><td><div className="admin-row-actions"><button className="admin-delete-action" disabled={saving || loading} aria-label={`Delete ${product.name}`} onClick={() => requestDelete([product])}><Icon name="trash" size={16}/></button><button aria-label={`Edit ${product.name}`} onClick={() => openEditor(product)}><Icon name="edit" size={17}/></button><a href={validUrl(product.url) ? product.url : undefined} target="_blank" rel="noopener noreferrer" aria-label={`Open ${product.name} store page`}><Icon name="external" size={15}/></a></div></td></tr>)}</tbody></table>{!rows.length && <div className="admin-empty"><Icon name="search" size={35}/><h2>No products found</h2><p>Try another search or reset your filters.</p><button className="admin-button" onClick={clearFilters}>Reset filters</button></div>}</div>
        <div className="admin-pagination"><span>Showing <b>{filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</b> of {filtered.length} products</span><div><button disabled={currentPage <= 1} aria-label="Previous page" onClick={() => setPage(currentPage - 1)}><span className="rotate"><Icon name="chevron" size={14}/></span></button>{Array.from({ length: pageCount }, (_, i) => i + 1).filter(number => number === 1 || number === pageCount || Math.abs(number - currentPage) <= 1).map((number, index, numbers) => <span key={number}>{index > 0 && number - numbers[index - 1] > 1 && <span className="page-ellipsis">…</span>}<button className={currentPage === number ? "active" : ""} aria-label={`Page ${number}`} aria-current={currentPage === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button></span>)}<button disabled={currentPage >= pageCount} aria-label="Next page" onClick={() => setPage(currentPage + 1)}><Icon name="chevron" size={14}/></button></div></div>
        <div className="admin-bottom-note"><span><span className="workspace-dot"/> Products synced across your site</span><span>A thoughtful collection starts with you.</span></div>
      </>}
    </main>
    {editor && <><button className="admin-editor-backdrop" aria-label="Close product editor" onClick={closeEditor}/><aside className="admin-editor" aria-label={isNew ? "Add product" : "Edit product"}><div className="admin-editor-title"><div><span className="admin-editor-eyebrow">YOUR NEXT GOOD FIND</span><h2>{isNew ? "Add Product" : "Edit Product"}</h2></div><button onClick={closeEditor} aria-label="Close product editor"><Icon name="close" size={20}/></button></div>
      <form onSubmit={save} className="admin-form"><fieldset className="admin-editor-fields" disabled={saving || loading}>
        <label>Product Name <span>*</span><input ref={nameInput} required maxLength={120} value={editor.name} placeholder="e.g. Wireless Earbuds" onChange={event => update("name", event.target.value)}/></label>
        <label>Product Code <span>*</span><input required maxLength={24} value={editor.code} placeholder="T001" onChange={event => update("code", event.target.value.toUpperCase())}/></label>
        {editor.store==="Amazon"&&<><label>US full affiliate link<input type="url" value={editor.urlUS||""} placeholder="https://www.amazon.com/dp/ASIN?tag=smartnetweb0a-20" onChange={event=>update("urlUS",event.target.value)}/></label><label>Canada full affiliate link<input type="url" value={editor.urlCA||""} placeholder="https://www.amazon.ca/dp/ASIN?tag=smartnetwe06a-20" onChange={event=>update("urlCA",event.target.value)}/></label><p>Enter both country-specific product URLs to enable IP-based routing. Tags are applied automatically. Unknown countries use US. Existing links remain in use until both URLs are saved.</p></>}
        {editor.store!=="Amazon"&&<label>Store product link <span>*</span><input required type="url" value={editor.url} placeholder="https://..." onChange={event => update("url", event.target.value)}/></label>}
        <label>Store <span>*</span><select value={editor.store} onChange={event => update("store", event.target.value)}>{STORES.map(item => <option key={item}>{item}</option>)}</select></label>
        <div className="admin-form-pair"><label>Category<select value={editor.category} onChange={event => update("category", event.target.value)}>{categoryNames.map(item => <option key={item}>{item}</option>)}</select></label><label>Product Set<SetPicker products={products} category={editor.category} value={editor.set} onChange={number => update("set", number)}/></label></div>
        <label className="admin-image-label">Product Image</label><div className="admin-image-upload" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(event.dataTransfer.files[0]); }}><div className="admin-upload-preview"><ProductImage product={editor}/></div><div><button type="button" className="admin-button" disabled={uploading} onClick={() => imageInput.current?.click()}><Icon name="upload" size={16}/>{uploading ? "Processing..." : "Upload Image"}</button><p>Drop an image here<br/>JPG, PNG, WebP · max 5 MB</p>{(editor.image || editor.photo !== null) && <button type="button" className="admin-remove-image" onClick={() => { uploadVersion.current++; setUploading(false); setDraft({ ...editor, image: "", photo: null }); setDirty(true); }}>Remove image</button>}</div><input ref={imageInput} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }}/></div>
        <label>Card Description <small>optional</small><textarea rows={3} maxLength={300} value={editor.description} aria-describedby="card-description-help" placeholder="Small size. Beautiful sound. Your everyday listening companion." onChange={event => update("description", event.target.value)}/></label>
        <div className="admin-description-help" id="card-description-help"><span>Shown only when the ? button beside the product code is clicked or tapped. Keep it to 1–2 short sentences.</span><span>{editor.description.length}/300</span></div>
        {editor.description.trim() && <div className="admin-description-preview"><small>LIVE CARD PREVIEW</small><ProductDescription description={editor.description} name={editor.name || "Your product name"} preview/></div>}
        <div className="admin-form-pair"><label>Brand <small>optional</small><input maxLength={60} value={editor.brand} placeholder="e.g. Anker" onChange={event => update("brand", event.target.value)}/></label><label>ASIN <small>optional</small><input maxLength={10} value={editor.asin} placeholder="B0XXXXXXXX" onChange={event => update("asin", event.target.value.toUpperCase())}/></label></div>
        <div className="admin-publish-setting"><div><strong>Published</strong><p>Visible on your storefront.</p></div><button type="button" className={`admin-switch ${editor.status === "Published" ? "on" : ""}`} role="switch" aria-label="Publish product" aria-checked={editor.status === "Published"} onClick={() => update("status", editor.status === "Published" ? "Draft" : "Published")}><span/></button></div>
        {editor.status !== "Published" && <label>Status<select value={editor.status} onChange={event => update("status", event.target.value)}>{STATUSES.filter(item => item !== "Published").map(item => <option key={item}>{item}</option>)}</select></label>}
        {error && <p className="admin-form-error" role="alert">{error}</p>}
      </fieldset><div className="admin-editor-footer"><button className="admin-button primary" type="submit" disabled={uploading || saving || loading}><Icon name="check" size={17}/>{saving ? "Saving…" : isNew ? "Add Product" : "Save Changes"}</button><button className="admin-button" type="button" onClick={() => setPreview(true)}><Icon name="eye" size={18}/>Preview</button>{!isNew && <button className="admin-button admin-delete-action" type="button" disabled={saving || loading} onClick={() => requestDelete(products.filter(product => product.id === editor.id))}><Icon name="trash" size={16}/>Delete Product</button>}<small>{dirty ? "You have unsaved changes" : "Your catalog, thoughtfully organized."}</small></div></form>
    </aside></>}
    {preview && editor && <Modal title="Product preview" onClose={() => setPreview(false)}><div className="admin-preview-card"><ProductImage product={editor}/><span>{editor.code}</span><h3>{editor.name || "Your product name"}</h3><ProductDescription description={editor.description} name={editor.name || "Your product name"} preview/><span className={`admin-status ${editor.status.toLowerCase().replaceAll(" ", "-")}`}>{editor.status}</span>{validUrl(editor.url) ? <a className="admin-button primary" href={editor.url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16}/>View on {editor.store}</a> : <p>Add a valid affiliate URL to preview the store link.</p>}</div></Modal>}
    {pendingAction && <Modal title="Unsaved changes" onClose={() => setPendingAction(null)}><p>You have changes in the product editor. Discard them to continue?</p><div className="admin-modal-actions"><button className="admin-button" onClick={() => setPendingAction(null)}>Keep editing</button><button className="admin-button primary" onClick={() => { const action = pendingAction.run; setPendingAction(null); setDirty(false); action(); }}>Discard changes</button></div></Modal>}
    {pendingDelete && <Modal title="Permanently delete products?" onClose={() => { if (!saving) setPendingDelete(null); }}><p>These products and their images will be removed from the catalog and Landing page. This cannot be undone.</p><ul className="admin-delete-list">{pendingDelete.items.map(product => <li key={product.id}><strong>{product.code} ? {product.name}</strong><small>{product.category} ? Set {product.set}</small></li>)}</ul>{deleteError && <p className="admin-notice admin-notice-error" role="alert">{deleteError}</p>}<div className="admin-modal-actions"><button className="admin-button" autoFocus disabled={saving} onClick={() => setPendingDelete(null)}>Cancel</button><button className="admin-button admin-delete-confirm" disabled={saving || loading} onClick={() => void deleteProducts()}><Icon name="trash" size={16}/>{saving ? "Deleting..." : `Delete ${pendingDelete.items.length} permanently`}</button></div></Modal>}
    {pendingImport && <Modal title="Import your products" onClose={() => { if (!saving && !importInFlight.current) setPendingImport(null); }}>
      <p>Your catalog will contain <strong>{pendingImport.products.length} products</strong>. Duplicate codes in the same category and set are skipped. Matching codes in a different set update the existing product; new codes are added. Existing products not in the file will be kept.</p>
      <p><strong>{pendingImport.imported}</strong> products to import.</p>
      {pendingImport.skipped.length > 0 && <div className="admin-notice admin-notice-warning" role="status"><div><strong>{pendingImport.skipped.length} duplicate product(s) skipped.</strong><ul className="admin-import-skipped">{pendingImport.skipped.map((message, index) => <li key={index}>{message}</li>)}</ul></div></div>}
      <p className="admin-modal-note">Images and publication status are included. Nothing is saved until you import.</p>
      {importError && <p className="admin-notice admin-notice-error" role="alert">{importError}</p>}
      {saving && <p role="status" aria-live="polite">{importProgress !== null && importProgress < 100 ? `Uploading images: ${importProgress}%` : "Saving products and images. Please keep this window open."}</p>}
      <div className="admin-modal-actions">
        <button className="admin-button" disabled={saving} onClick={() => setPendingImport(null)}>Cancel</button>
        <button className="admin-button primary" disabled={saving || loading} onClick={() => void confirmImport()}>{saving ? "Importing..." : "Import products"}</button>
      </div>
    </Modal>}
    {moveOpen && <Modal title="Move products to a set" onClose={() => setMoveOpen(false)}><p>Choose a category and set for {selectedProducts.length} selected products.</p><div className="admin-move-fields"><label>Category<select value={moveCategory} onChange={event => { setMoveCategory(event.target.value as Category); setMoveSet(productSets(products, event.target.value)[0]); }}>{categoryNames.map(item => <option key={item}>{item}</option>)}</select></label><label>Product Set<SetPicker products={products} category={moveCategory} value={moveSet} onChange={setMoveSet}/></label></div><div className="admin-modal-actions"><button className="admin-button" onClick={() => setMoveOpen(false)}>Cancel</button><button className="admin-button primary" onClick={() => { setMoveOpen(false); guard(async () => { if (await persist(products.map(product => selected.includes(product.id) ? { ...product, category: moveCategory, set: moveSet, updated: new Date().toISOString() } : product), `${selectedProducts.length} products moved to ${moveCategory} Set ${String(moveSet).padStart(2, "0")}.`)) { setSelected([]); setDirty(false); } }); }}>Move products</button></div></Modal>}
  </div>;
}
