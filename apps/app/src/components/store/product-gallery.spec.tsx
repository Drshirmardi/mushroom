import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductGallery } from "./product-gallery";

describe("Product gallery selection", () => {
  it("exposes a selectable thumbnail for every official and buyer image", () => {
    const html = renderToStaticMarkup(createElement(ProductGallery, {
      official: ["/first.jpg", "/second.jpg"], buyer: ["/buyer.jpg"], title: "محصول",
    }));
    for (const number of ["۱", "۲", "۳"]) expect(html).toContain(`aria-label="نمایش تصویر ${number} محصول"`);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2);
    expect(html).toContain("خریدار");
    expect(html).toContain("رسمی");
  });

  it("renders the neutral fallback inside the gallery layout when no photos exist", () => {
    const html = renderToStaticMarkup(createElement(ProductGallery, { official: [], buyer: [], title: "محصول" }));
    expect(html).toContain("store-gallery__slide");
    expect(html).toContain("data:image/svg+xml,");
    expect(html).not.toContain("store-gallery__counter");
    expect(html).not.toContain("store-mosaic");
  });

  it("marks single-photo rails for elastic feedback without changing scroll behavior", () => {
    const single = renderToStaticMarkup(createElement(ProductGallery, { official: ["/only.jpg"], buyer: [], title: "محصول" }));
    expect(single).toContain("store-gallery__strip--single");
    expect(single).not.toContain("store-gallery__counter");
    const multi = renderToStaticMarkup(createElement(ProductGallery, { official: ["/first.jpg", "/second.jpg"], buyer: [], title: "محصول" }));
    expect(multi).not.toContain("store-gallery__strip--single");
    expect(multi).toContain("store-gallery__counter");
  });
});
