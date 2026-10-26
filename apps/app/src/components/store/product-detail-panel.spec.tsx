import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductDetailPanel } from "./product-detail-panel";

describe("Product detail panel", () => {
  it("keeps the gallery outside the detail sheet and exposes a keyboard control", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailPanel, {
      gallery: createElement("div", { className: "test-gallery" }, "photo"),
      children: createElement("p", {}, "details"),
    }));
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="جزئیات محصول و تصاویر"');
    expect(html).toContain('aria-expanded="false"');
    expect(html.indexOf("test-gallery")).toBeLessThan(html.indexOf('<section'));
    expect(html).toContain('type="button"');
    expect(html).toContain("details</p></section>");
  });

  it("labels the collapsed handle and shows a directional chevron affordance", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailPanel, {
      gallery: createElement("div", {}, "photo"),
      children: createElement("p", {}, "details"),
    }));
    expect(html).toContain("مشخصات و توضیحات");
    expect(html).toContain("store-detail__handle-chevron");
    expect(html).toContain('data-expanded="false"');
    expect(html).not.toContain("برگشت به تصویر");
  });
});
