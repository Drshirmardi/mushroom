import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CommerceProduct } from "../../lib/commerce-catalog-api";
import { ProductCatalog } from "./product-catalog";

vi.mock("../../lib/commerce-catalog-api", () => ({ updateCommerceInventory: vi.fn(), updateCommerceSku: vi.fn(), updateCommerceProduct: vi.fn() }));
const category = { id: "category", name: "سلامت", slug: "health", isActive: true, productCount: 1 };
const product: CommerceProduct = { id: "product", title: "محصول واقعی", slug: "real", category, status: "DRAFT", skus: [
  { id: "sku-one", code: "SKU-A", currentPriceToman: "125000", currentTaxToman: "0", isActive: true, onHandQuantity: 6, reservedQuantity: 2 },
  { id: "sku-two", code: "SKU-B", currentPriceToman: "95000", currentTaxToman: "0", isActive: true, onHandQuantity: 2, reservedQuantity: 2 },
] };
const render = (items: CommerceProduct[], busy = false) => renderToStaticMarkup(createElement(ProductCatalog, {
  data: { categories: [category], products: items }, accessToken: "test-token", busy,
  submit: async () => {}, editImage: () => {}, editContent: () => {}, addSku: () => {},
}));

describe("Product catalog interface", () => {
  it("provides a labeled price and stock editor for every SKU", () => {
    const html = render([product]);
    for (const id of ["sku-one", "sku-two"]) {
      expect(html).toContain(`id="price-${id}"`);
      expect(html).toContain(`id="stock-${id}"`);
    }
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('hidden=""');
    expect(html).toContain("موجودی فیزیکی");
    expect(html).toContain("۹۵٬۰۰۰");
  });
  it("keeps a genuine empty state separate from loading", () => {
    expect(render([])).toContain("هنوز محصولی ثبت نشده است");
    expect(render([])).not.toContain("در حال دریافت");
  });
  it("does not offer activation without an active SKU", () => {
    const html = render([{ ...product, skus: [] }]);
    expect(html).toMatch(/disabled=""[^>]*>فعال‌سازی محصول/);
  });
});
