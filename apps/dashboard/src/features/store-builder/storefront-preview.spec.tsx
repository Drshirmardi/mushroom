import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CommerceCatalogData, CommerceProduct } from "../../lib/commerce-catalog-api";
import type { AdminBanner } from "../../lib/content-banners-api";

vi.mock("../../components/auth/dashboard-session-gate", () => ({ getDashboardAccessToken: async () => "test-token" }));

import { StorefrontPreview } from "./storefront-preview";

const category = { id: "category", name: "سلامت", slug: "health", isActive: true, productCount: 2 };
const products: CommerceProduct[] = [
  { id: "product-one", title: "عسل طبیعی", slug: "honey", status: "ACTIVE", category, skus: [
    { id: "sku-one", code: "H-1", currentPriceToman: "125000", currentTaxToman: "0", isActive: true, onHandQuantity: 10, reservedQuantity: 2 },
  ] },
  { id: "product-two", title: "دمنوش آرامش", slug: "tea", status: "DRAFT", category, skus: [] },
  { id: "product-three", title: "محصول آرشیو", slug: "archived", status: "ARCHIVED", category, skus: [] },
];
const catalog: CommerceCatalogData = { categories: [category], products };
const banners: AdminBanner[] = [
  { etag: '"'+"a".repeat(64)+'"', id: "banner-one", clinicId: "clinic", title: "بنر بهار", destinationUrl: "/store", publicationStatus: "PUBLISHED", publishedAt: "2026-01-01T00:00:00.000Z", mediaObjectKey: "content/banner-one/banner.jpg", mediaContentType: "image/jpeg", mediaSizeBytes: 1000, createdAt: "", updatedAt: "", contentPath: "/v1/content/banners/banner-one/image" },
  { etag: '"'+"b".repeat(64)+'"', id: "banner-two", clinicId: "clinic", title: "بنر پیش‌نویس", destinationUrl: null, publicationStatus: "DRAFT", publishedAt: null, mediaObjectKey: null, mediaContentType: null, mediaSizeBytes: null, createdAt: "", updatedAt: "", contentPath: null },
];
const render = () => renderToStaticMarkup(createElement(StorefrontPreview, { catalog, banners }));

describe("Storefront preview", () => {
  it("shows price, stock and status for each visible product", () => {
    const html = render();
    expect(html).toContain("عسل طبیعی");
    expect(html).toContain("۱۲۵٬۰۰۰");
    expect(html).toContain("۸ عدد موجود");
    expect(html).toContain("فعال");
    expect(html).not.toContain("دمنوش آرامش");
    expect(html).not.toContain("بدون فروش");
  });

  it("excludes archived products from the storefront", () => {
    expect(render()).not.toContain("محصول آرشیو");
  });

  it("only features published banners with media", () => {
    const html = render();
    expect(html).toContain('aria-label="بنر بهار"');
    expect(html).not.toContain("بنر پیش‌نویس");
  });

  it("renders an honest empty banner state", () => {
    const html = renderToStaticMarkup(createElement(StorefrontPreview, { catalog, banners: [] }));
    expect(html).toContain("هنوز بنر منتشرشده‌ای وجود ندارد");
  });
  it("distinguishes unknown banners from a confirmed empty list", () => {
    const html = renderToStaticMarkup(createElement(StorefrontPreview, { catalog, banners: null }));
    expect(html).toContain("بنرها هنوز دریافت نشده‌اند"); expect(html).not.toContain("هنوز بنر منتشرشده‌ای وجود ندارد");
  });
  it("excludes inactive categories and products without an active SKU", () => {
    const hidden = { ...products[0]!, title: "Hidden category", category: { ...category, isActive: false } };
    const disabled = { ...products[0]!, title: "Disabled SKU", skus: products[0]!.skus.map(sku => ({ ...sku, isActive: false })) };
    const html = renderToStaticMarkup(createElement(StorefrontPreview, { catalog: { categories: [category], products: [hidden, disabled] }, banners: [] }));
    expect(html).not.toContain("Hidden category"); expect(html).not.toContain("Disabled SKU");
  });
  it("uses the active SKU for price and stock when an inactive SKU is first", () => {
    const active = products[0]!.skus[0]!;
    const product = { ...products[0]!, skus: [{ ...active, id: 'inactive', isActive: false, currentPriceToman: '999', onHandQuantity: 0 }, active] };
    const html = renderToStaticMarkup(createElement(StorefrontPreview, { catalog: { categories: [category], products: [product] }, banners: [] }));
    expect(html).toContain('۱۲۵٬۰۰۰'); expect(html).toContain('۸ عدد موجود'); expect(html).not.toContain('ناموجود');
  });
});
