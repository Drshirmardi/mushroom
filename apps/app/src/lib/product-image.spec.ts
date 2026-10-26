import { describe, expect, it } from "vitest";

import { apiBaseUrl } from "./api";
import { PRODUCT_IMAGE_FALLBACK, productImageAlt, productImageUrl, type ProductImageMeta } from "./product-image";

type ImageDto = Exclude<ProductImageMeta, null | undefined>;
const image = (overrides: Partial<ImageDto> = {}): ImageDto => ({
  id: "11111111-1111-4000-8000-000000000001",
  contentPath: "/v1/commerce/products/product-1/images/11111111-1111-4000-8000-000000000001",
  mimeType: "image/webp",
  sizeBytes: 1200,
  width: 800,
  height: 600,
  altText: "عکس محصول",
  ...overrides,
});

describe("customer product image resolution (frozen media contract)", () => {
  it("resolves contentPath against the configured API origin", () => {
    expect(productImageUrl({ id: "product-1", image: image() })).toBe(
      `${apiBaseUrl}/v1/commerce/products/product-1/images/11111111-1111-4000-8000-000000000001`,
    );
  });

  it("returns null when the product carries no image", () => {
    expect(productImageUrl({ id: "product-1", image: null })).toBeNull();
    expect(productImageUrl({ id: "product-1", image: undefined })).toBeNull();
    expect(productImageUrl({ id: "product-1" })).toBeNull();
    expect(productImageUrl(null)).toBeNull();
    expect(productImageUrl(undefined)).toBeNull();
  });

  it("never emits Digikala, test-mapping or storage URLs", () => {
    expect(productImageUrl({ id: "x", image: image() })).not.toMatch(/digikala|dkstatics|test|localhost:9000|r2/i);
    expect(PRODUCT_IMAGE_FALLBACK.startsWith("data:image/svg+xml,")).toBe(true);
    expect(PRODUCT_IMAGE_FALLBACK).not.toMatch(/https:\/\//);
  });

  it("replacement changes identity through a new contentPath", () => {
    const first = productImageUrl({ id: "p", image: image({ id: "aaa", contentPath: "/v1/commerce/products/p/images/aaa" }) });
    const second = productImageUrl({ id: "p", image: image({ id: "bbb", contentPath: "/v1/commerce/products/p/images/bbb" }) });
    expect(first).not.toBe(second);
  });

  it("prefers metadata alt text and falls back to the product title", () => {
    expect(productImageAlt(image(), "عنوان")).toBe("عکس محصول");
    expect(productImageAlt(image({ altText: "   " }), "عنوان")).toBe("عنوان");
    expect(productImageAlt(null, "عنوان")).toBe("عنوان");
  });
});
