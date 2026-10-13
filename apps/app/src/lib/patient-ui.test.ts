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
const cardProps = { product, saved: false, inCart: false, busy: false, authenticated: false, onAdd: () => {}, onFavorite: () => {} };

describe("Store ProductCard presentation contract", () => {
  it("preserves product destination, real price value and guest feedback", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, cardProps));
    expect(html.match(/href="\/store\/products\/synthetic-product"/g)).toHaveLength(2);
    expect(html).toContain('dir="ltr"'); expect(html).toContain("۱۲۵٬۰۰۰");
    expect(html).toContain("برای خرید وارد شوید");
  });
  it("makes pending controls disabled and favorites selected without color alone", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { ...cardProps, saved: true, busy: true, authenticated: true }));
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('aria-pressed="true"'); expect(html).toContain('aria-busy="true"');
    expect(html).toContain("در حال انجام…");
  });
  it("does not invent a purchasable SKU for an empty product", () => {
    expect(renderToStaticMarkup(createElement(ProductCard, { ...cardProps, product: { ...product, skus: [] } }))).toBe("");
  });
});

it("forwards the existing first SKU to cart and wishlist callbacks", () => {
  const additions: string[] = []; const favorites: string[] = [];
  const tree = ProductCard({ ...cardProps, onAdd: id => additions.push(id), onFavorite: id => favorites.push(id) });
  const visit = (node: ReactNode): void => {
    if (!isValidElement<{ children?: ReactNode; onClick?: () => void; "aria-label"?: string }>(node)) return;
    if (node.type === Button) node.props.onClick?.();
    Children.forEach(node.props.children, visit);
  };
  visit(tree);
  expect(additions).toEqual(["synthetic-sku"]); expect(favorites).toEqual(["synthetic-sku"]);
});