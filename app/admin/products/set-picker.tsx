import { Product, productSets } from "@/lib/catalog";

export default function SetPicker({ products, category, value, onChange }: { products: Product[]; category: string; value: number; onChange: (value: number) => void }) {
  const sets = productSets(products, category, value);
  const next = sets[sets.length - 1] + 1;
  return <div className="set-picker"><select aria-label="Choose product set" value={value} onChange={event => onChange(Number(event.target.value))}>{sets.map(number => <option key={number} value={number}>{category} Set {String(number).padStart(2, "0")}</option>)}{Number.isSafeInteger(next) && <option value={next}>+ New {category} Set {String(next).padStart(2, "0")}</option>}</select><input aria-label="Product set number" type="number" min={1} step={1} value={value || ""} onChange={event => onChange(Number(event.target.value))} required/><small>Choose a set or enter a new number.</small></div>;
}
