import { describe, expect, it } from "vitest";
import type { CommerceProduct, CommerceSku } from "../../lib/commerce-catalog-api";
import { catalogInteger, inventoryTotals, matchesProduct } from "./catalog-view";

const sku: CommerceSku = { id: "sku-one", code: "SKU-1", title: "بسته کوچک", currentPriceToman: "100000", currentTaxToman: "0", isActive: true, onHandQuantity: 7, reservedQuantity: 3 };
const product: CommerceProduct = { id: "product-one", title: "کرم گیاهی", slug: "herbal-cream", status: "DRAFT", category: { id: "category-one", name: "پوست", slug: "skin", isActive: true, productCount: 1 }, skus: [sku] };

describe("Catalog presentation rules", () => {
  it("rejects blank, negative, fractional and unsafe mutation amounts", () => {
    for (const value of ["", " ", "-1", "1.5", "NaN", "Infinity", "9007199254740992"]) expect(catalogInteger(value)).toBeNull();
    expect(catalogInteger("0")).toBe(0);
    expect(catalogInteger(" 125000 ")).toBe(125000);
  });
  it("searches names, Persian letter variants and every SKU", () => {
    expect(matchesProduct(product, "كرم گياهي")).toBe(true);
    expect(matchesProduct(product, "SKU-1 کوچک")).toBe(true);
    expect(matchesProduct(product, "HERBAL پوست")).toBe(true);
    expect(matchesProduct(product, "ناموجود")).toBe(false);
  });
  it("distinguishes physical, reserved and free inventory across all SKUs", () => {
    expect(inventoryTotals([sku, { ...sku, id: "sku-two", onHandQuantity: 5, reservedQuantity: 5 }])).toEqual({ physical: 12, reserved: 8, free: 4 });
    expect(inventoryTotals([])).toEqual({ physical: 0, reserved: 0, free: 0 });
  });
});
