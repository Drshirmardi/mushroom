import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Children, createElement, isValidElement, type ReactNode } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

describe("Patient primitives", () => {
  it("defaults to a non-submitting button", () => {
    expect(renderToStaticMarkup(createElement(Button, {}, "افزودن"))).toContain('type="button"');
  });
  it("busy disables repeated activation and announces pending state", () => {
    const html = renderToStaticMarkup(createElement(Button, { busy: true }, "در حال انجام…"));
    expect(html).toContain('disabled=""'); expect(html).toContain('aria-busy="true"');
  });
  it("preserves input identity, direction and label association", () => {
    const html = renderToStaticMarkup(createElement(Input, { id: "search", name: "product-search", dir: "auto", disabled: true }));
    expect(html).toContain('id="search"'); expect(html).toContain('dir="auto"'); expect(html).toContain('name="product-search"'); expect(html).toContain('disabled=""');
  });
});

import { ProductCard } from "../components/store/product-card";
import type { CommerceProduct } from "./commerce-catalog-api";

const product: CommerceProduct = {
  id: "synthetic-product", title: "محصول آزمایشی Test", slug: "synthetic-product",
  category: { id: "synthetic-category", name: "دستهٔ آزمایشی", slug: "synthetic-category" },
  skus: [{ id: "synthetic-sku", code: "TEST-1", currentPriceToman: "125000", currentTaxToman: "0" }],
};
const cardProps = { product, saved: false, inCart: false, busy: false, onFavorite: () => {} };

describe("Store ProductCard presentation contract", () => {
  it("preserves product destination, real price value and test imagery", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, cardProps));
    expect(html.match(/href="\/store\/products\/synthetic-product"/g)).toHaveLength(2);
    expect(html).toContain('dir="ltr"'); expect(html).toContain("۱۲۵٬۰۰۰");
    expect(html).toContain("dkstatics-public.digikala.com");
    expect(html).not.toContain("افزودن به سبد");
  });
  it("makes pending controls disabled and favorites selected without color alone", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { ...cardProps, saved: true, busy: true }));
    expect(html.match(/disabled=""/g)).toHaveLength(1);
    expect(html).toContain('aria-pressed="true"'); expect(html).toContain('aria-busy="true"');
  });
  it("does not invent a purchasable SKU for an empty product", () => {
    expect(renderToStaticMarkup(createElement(ProductCard, { ...cardProps, product: { ...product, skus: [] } }))).toBe("");
  });
});

it("exposes a labeled favorite control bound to the product", () => {
  const html = renderToStaticMarkup(createElement(ProductCard, { ...cardProps, saved: true }));
  expect(html).toContain("حذف از علاقه‌مندی‌ها: محصول آزمایشی Test");
  expect(html).toContain('aria-pressed="true"');
  expect(html).not.toContain("افزودن به سبد");
});
import { CartItem, ProductPrice, QuantityControl, StoreState } from "../components/store/store-ui";

describe("Store shared presentation controls", () => {
  it("isolates Persian prices from surrounding RTL text", () => {
    const html = renderToStaticMarkup(createElement(ProductPrice, { amount: 125000 }));
    expect(html).toContain('<bdi dir="ltr">۱۲۵٬۰۰۰</bdi>');
    expect(html).toContain("تومان");
    expect(html).toContain("<svg");
  });
  it("disables quantity controls at the existing limits and while pending", () => {
    const props = { label: "آزمایشی", onChange: () => {} };
    expect(renderToStaticMarkup(createElement(QuantityControl, { ...props, value: 1 })).match(/disabled=""/g)).toHaveLength(1);
    expect(renderToStaticMarkup(createElement(QuantityControl, { ...props, value: 100 })).match(/disabled=""/g)).toHaveLength(1);
    const busy = renderToStaticMarkup(createElement(QuantityControl, { ...props, value: 2, busy: true }));
    expect(busy.match(/disabled=""/g)).toHaveLength(2);
    expect(busy).toContain('aria-busy="true"');
  });
  it("forwards zero for removal without changing the cart API contract", () => {
    const values: number[] = [];
    const tree = QuantityControl({ value: 1, min: 0, label: "آزمایشی", onChange: value => values.push(value) });
    const visit = (node: ReactNode): void => {
      if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node)) return;
      if (node.type === Button) node.props.onClick?.();
      Children.forEach(node.props.children, visit);
    };
    visit(tree);
    expect(values).toEqual([0, 2]);
    expect(renderToStaticMarkup(tree)).toContain("حذف آزمایشی");
  });
  it("preserves cart product links and announces pending updates", () => {
    const html = renderToStaticMarkup(createElement(CartItem, { item: { name: "آزمایشی", productId: "synthetic-product", price: 125000, qty: 1 }, busy: true, removing: false, onChange: () => {}, onUndo: () => {} }));
    expect(html).toContain('href="/store/products/synthetic-product"');
    expect(html).toContain("در حال به‌روزرسانی…");
    expect(html).toContain('aria-live="polite"');
  });
  it("covers a pending removal with an undo affordance", () => {
    const html = renderToStaticMarkup(createElement(CartItem, { item: { name: "آزمایشی", productId: "synthetic-product", price: 125000, qty: 1 }, busy: false, removing: true, onChange: () => {}, onUndo: () => {} }));
    expect(html).toContain("کالای موردنظر شما حذف شد");
    expect(html).toContain("انصراف");
    expect(html).toContain('role="alert"');
  });
  it("exposes recovery and pending states without fabricated data", () => {
    expect(renderToStaticMarkup(createElement(StoreState, { title: "خطا", error: true, action: "تلاش دوباره", onAction: () => {} }))).toContain('role="alert"');
    expect(renderToStaticMarkup(createElement(StoreState, { title: "دریافت…", pending: true }))).toContain('role="status"');
  });
  it("uses the saved SKU price", () => {
    const sku = { ...product.skus[0], id: "saved-sku", currentPriceToman: "225000" };
    expect(renderToStaticMarkup(createElement(ProductCard, { ...cardProps, skuOverride: sku }))).toContain("۲۲۵٬۰۰۰");
  });
});
