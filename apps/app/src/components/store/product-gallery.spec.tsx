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

  it("renders nothing when no photos exist", () => {
    expect(renderToStaticMarkup(createElement(ProductGallery, { official: [], buyer: [], title: "محصول" }))).toBe("");
  });
});
