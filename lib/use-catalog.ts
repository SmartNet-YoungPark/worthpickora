"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CatalogSnapshot, normalizeLegacyCategory, Product, seedProducts, validateProduct } from "./catalog";

const EVENT = "worthpickora-catalog-change";
const SIGNAL = "worthpickora-catalog-revision";

export async function saveCatalog(products: Product[], revision: string, categories?: string[]): Promise<CatalogSnapshot> {
  const response = await fetch("/api/catalog", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products, revision, categories }), cache: "no-store" });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 409) window.dispatchEvent(new Event("worthpickora-catalog-refresh"));
    throw new Error(data.error || "Could not save the catalog.");
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: data }));
  try { localStorage.setItem(SIGNAL, data.revision); } catch { /* Server save succeeds even when browser storage is full. */ }
  return data;
}

function createStore(initial: CatalogSnapshot, admin: boolean) {
  let value = { ...initial, error: "", loading: admin };
  const serverValue = value;
  const listeners = new Set<() => void>();
  let generation = 0;
  let pending = false;
  function notify() { listeners.forEach(listener => listener()); }
  function apply(catalog: CatalogSnapshot) {
    generation++;
    value = { ...catalog, products: admin ? catalog.products : catalog.products.filter(product => product.status === "Published"), error: "", loading: false };
    notify();
  }
  async function refresh() {
    if (pending) return;
    pending = true;
    const requestGeneration = generation;
    try {
      const response = await fetch(`/api/catalog${admin ? "?scope=admin" : ""}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the latest catalog.");
      let catalog = data as CatalogSnapshot;
      // Preserve existing browser-local work on the first administrator visit.
      if (admin && !catalog.persisted) {
        let previous: string | null = null;
        try { previous = localStorage.getItem("worthpickora-catalog-v1"); } catch { /* Optional migration. */ }
        if (previous && previous !== JSON.stringify(seedProducts)) {
          let legacy: Product[];
          try { legacy = JSON.parse(previous); } catch { throw new Error("The previous browser catalog could not be read. Your original data has been kept."); }
          if (Array.isArray(legacy)) legacy = legacy.map(product => ({ ...product, category: normalizeLegacyCategory(product.category) }));
          if (!Array.isArray(legacy) || legacy.some(product => validateProduct(product, [], catalog.categories))) throw new Error("The previous browser catalog needs review before importing. Your original data has been kept.");
          catalog = await saveCatalog(legacy, catalog.revision);
          apply(catalog);
          return;
        }
      }
      if (generation === requestGeneration) apply(catalog);
    } catch (problem) {
      if (generation === requestGeneration) { value = { ...value, loading: false, error: problem instanceof Error ? problem.message : "Could not load the catalog." }; notify(); }
    } finally { pending = false; }
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => value, serverSnapshot: () => serverValue, refresh, apply,
  };
}

export function useCatalog(initial: CatalogSnapshot, admin = false) {
  const [store] = useState(() => createStore(initial, admin));
  useEffect(() => {
    const refresh = () => { void store.refresh(); };
    const onStorage = (event: StorageEvent) => { if (event.key === SIGNAL) refresh(); };
    const onChange = (event: Event) => { store.apply((event as CustomEvent<CatalogSnapshot>).detail); };
    refresh();
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener(EVENT, onChange);
    window.addEventListener("worthpickora-catalog-refresh", refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("worthpickora-catalog-refresh", refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [store]);
  return useSyncExternalStore(store.subscribe, store.snapshot, store.serverSnapshot);
}
