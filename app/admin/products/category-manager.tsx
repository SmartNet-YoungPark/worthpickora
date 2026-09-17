"use client";

import { useRef, useState } from "react";
import { Product, validateCategories } from "@/lib/catalog";
import Icon from "./icons";

export default function CategoryManager({ categories, products, busy, onSave }: {
  categories: string[]; products: Product[]; busy: boolean;
  onSave: (products: Product[], message: string, categories: string[]) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const affected = products.filter(product => product.category === deleting);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = name.trim().replace(/\s+/g, " ");
    if (editing && !categories.includes(editing)) { setError("This category changed in another session. Select it again."); return; }
    const next = editing ? categories.map(category => category === editing ? normalized : category) : [...categories, normalized];
    const problem = validateCategories(next);
    if (problem) { setError(problem); return; }
    const updated = editing ? products.map(product => product.category === editing ? { ...product, category: normalized, updated: new Date().toISOString() } : product) : products;
    if (await onSave(updated, editing ? `Category updated to ${normalized}. Linked products were updated too.` : `${normalized} added. It is now available across your site.`, next)) { setName(""); setEditing(null); setError(""); }
  }
  async function remove() {
    if (!deleting || !categories.includes(deleting)) { setDeleting(null); return; }
    const next = categories.filter(category => category !== deleting);
    if (affected.length && (!next.includes(destination))) { setError("Choose where to move the products before deleting this category."); return; }
    const problem = validateCategories(next);
    if (problem) { setError(problem); return; }
    const updated = products.map(product => product.category === deleting ? { ...product, category: destination, updated: new Date().toISOString() } : product);
    if (await onSave(updated, `${deleting} deleted.${affected.length ? ` ${affected.length} products moved to ${destination}.` : ""}`, next)) {
      if (editing === deleting) { setEditing(null); setName(""); }
      setDeleting(null); setError("");
    }
  }
  return <section className="category-manager" aria-label="Manage categories">
    <form onSubmit={submit} className="category-add-form"><label htmlFor="category-name">{editing ? "Edit category name" : "Add a category"}<input id="category-name" ref={input} value={name} maxLength={80} required placeholder="e.g. Books & Stationery" onChange={event => { setName(event.target.value); setError(""); }} disabled={busy}/></label><button type="submit" className="admin-button primary" disabled={busy}><Icon name={editing ? "check" : "plus"} size={17}/>{editing ? "Save Category" : "Add Category"}</button>{editing && <button type="button" className="admin-button" disabled={busy} onClick={() => { setName(""); setEditing(null); setError(""); }}>Cancel</button>}</form>
    <p className="category-help">Changes apply to product forms, filters, product sets, imports, and your storefront.</p>
    {error && <p className="admin-form-error" role="alert">{error}</p>}
    {deleting && <div className="category-delete-panel"><h2>Delete {deleting}?</h2><p>{affected.length ? `${affected.length} products belong to this category. Choose their new category; product details and set numbers will be kept.` : "This category has no products. It will be removed from your site."}</p>{affected.length > 0 && <label>Move products to<select aria-label="Category for reassigned products" value={destination} onChange={event => setDestination(event.target.value)} disabled={busy}><option value="">Choose a category</option>{categories.filter(category => category !== deleting).map(category => <option key={category}>{category}</option>)}</select></label>}<div><button className="admin-button" disabled={busy} onClick={() => { setDeleting(null); setError(""); }}>Cancel</button><button className="admin-button primary" disabled={busy || categories.length <= 1 || (affected.length > 0 && !destination)} onClick={() => void remove()}>Delete Category</button></div></div>}
    <div className="category-list">{categories.map((category, index) => { const count = products.filter(product => product.category === category).length; return <div className="category-row" key={category}><span className="category-number">{String(index + 1).padStart(2, "0")}</span><div><h2>{category}</h2><span>{count} {count === 1 ? "product" : "products"}</span></div><button className="admin-button" aria-label={`Edit category ${category}`} disabled={busy} onClick={() => { setEditing(category); setName(category); setDeleting(null); setError(""); input.current?.focus(); }}><Icon name="edit" size={16}/>Edit</button><button className="admin-button category-delete-button" aria-label={`Delete category ${category}`} disabled={busy || categories.length <= 1} onClick={() => { setDeleting(category); setDestination(""); setError(""); }}><Icon name="close" size={16}/>Delete</button></div>; })}</div>
  </section>;
}
