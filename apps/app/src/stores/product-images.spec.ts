import { describe, expect, it } from "vitest";

import { productGalleryImages, productTestImage, resolveProductImage, useProductImageStore } from "./product-images";

describe("product test images", () => {
  it("maps a product id to a stable test image", () => {
    expect(productTestImage("product-1")).toBe(productTestImage("product-1"));
    expect(productTestImage("product-1")).toMatch(/^https:\/\/dkstatics-public\.digikala\.com\//);
  });

  it("spreads products across the image pool", () => {
    const seen = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map(productTestImage));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("prefers a registered real image over the test image", () => {
    useProductImageStore.getState().setImageOverride("product-1", "https://example.com/real.jpg");
    const { overrides } = useProductImageStore.getState();
    expect(resolveProductImage("product-1", overrides)).toBe("https://example.com/real.jpg");
    expect(resolveProductImage("product-2", overrides)).toBe(productTestImage("product-2"));
    useProductImageStore.getState().clearOverrides();
    expect(useProductImageStore.getState().overrides).toEqual({});
  });

  it("returns distinct deterministic gallery images starting with the card image", () => {
    const gallery = productGalleryImages("product-1", 3);
    expect(gallery).toHaveLength(3);
    expect(new Set(gallery).size).toBe(3);
    expect(gallery[0]).toBe(productTestImage("product-1"));
    expect(productGalleryImages("product-1", 3)).toEqual(gallery);
  });
});
