import { describe, expect, it } from "vitest";

import { TEST_OFFERS } from "./offers";

describe("incredible offers test data", () => {
  it("ships eight placeholder offers with sane test numbers", () => {
    expect(TEST_OFFERS).toHaveLength(8);
    for (const offer of TEST_OFFERS) {
      expect(offer.image).toMatch(/^https:\/\/dkstatics-public\.digikala\.com\//);
      expect(offer.title.length).toBeGreaterThan(0);
      expect(offer.price).toBeGreaterThan(0);
      expect(offer.oldPrice).toBeGreaterThanOrEqual(offer.price);
      expect(offer.discount).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps offer ids unique", () => {
    expect(new Set(TEST_OFFERS.map((offer) => offer.id)).size).toBe(TEST_OFFERS.length);
  });
});
