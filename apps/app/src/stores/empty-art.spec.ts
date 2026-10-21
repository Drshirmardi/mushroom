import { describe, expect, it } from "vitest";

import { EMPTY_CART_ART, EMPTY_WISHLIST_ART } from "./empty-art";

describe("empty-state test art", () => {
  it("points at the reference SVG artwork", () => {
    for (const art of [EMPTY_CART_ART, EMPTY_WISHLIST_ART]) {
      expect(art).toMatch(/^https:\/\/www\.digikala\.com\/.*\.svg$/);
    }
  });
});
