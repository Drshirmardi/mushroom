import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CommerceProduct } from "../../lib/commerce-catalog-api";
import { ProductCatalog } from "./product-catalog";

const category = { id: "category", name: "سلامت", slug: "health", isActive: true, productCount: 1 };
const product: CommerceProduct = { id: "product", title: "محصول واقعی", slug: "real", category, status: "DRAFT", skus: [
  { id: "sku-one", code: "SKU-A", currentPriceToman: "125000", currentTaxToman: "0", isActive: true, onHandQuantity: 6, reservedQuantity: 2 },
  { id: "sku-two", code: "SKU-B", currentPriceToman: "95000", currentTaxToman: "0", isActive: true, onHandQuantity: 2, reservedQuantity: 2 },
] };
const render = (items: CommerceProduct[], busy = false) => renderToStaticMarkup(createElement(ProductCatalog, {
  data: { categories: [category], products: items }, busy, onEdit: () => {},
}));

describe("Product catalog interface", () => {
  it("shows real price and stock with one product entry point and both view controls", () => {
    const html = render([product]);
    expect(html).toContain('aria-label="نمای کارت‌های تصویردار"');
    expect(html).toContain('aria-label="نمای لیستی"');
    expect(html).toContain('aria-label="باز کردن مدیریت محصول واقعی"');
    expect(html).toContain("مدیریت محصول");
    expect(html).not.toContain('id="price-sku-one"');
    expect(html).not.toContain('aria-label="ویرایش محتوای محصول واقعی"');
    expect(html).toContain("بدون تصویر");
    expect(html).toContain("۹۵٬۰۰۰");
  });
  it("keeps a genuine empty state separate from loading", () => {
    expect(render([])).toContain("هنوز محصولی ثبت نشده است");
    expect(render([])).not.toContain("در حال دریافت");
  });
  it("does not advertise inactive SKU prices as a purchasable offer", () => {
    const html = render([{ ...product, skus: product.skus.map(sku => ({ ...sku, isActive: false })) }]);
    expect(html).toContain("نوع فروش فعال ندارد");
    expect(html).not.toContain("۹۵٬۰۰۰");
  });
});
