import type { CommerceProduct, CommerceSku } from "../../lib/commerce-catalog-api";

export type ProductEditorState = { busy: boolean; dirty: boolean; blocked?: boolean };

export function catalogInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function matchesProduct(product: CommerceProduct, query: string): boolean {
  const normalize = (value: string) => value.replace(/ي/g, "ی").replace(/ك/g, "ک").toLocaleLowerCase().trim();
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const haystack = normalize([product.title, product.slug, product.category.name, ...product.skus.map((sku) => `${sku.code} ${sku.title ?? ""}`)].join(" "));
  return terms.every((term) => haystack.includes(term));
}

export function inventoryTotals(skus: CommerceSku[]) {
  return skus.reduce((total, sku) => ({
    physical: total.physical + sku.onHandQuantity,
    reserved: total.reserved + sku.reservedQuantity,
    free: total.free + Math.max(0, sku.onHandQuantity - sku.reservedQuantity),
  }), { physical: 0, reserved: 0, free: 0 });
}
