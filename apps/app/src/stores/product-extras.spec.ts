import { describe, expect, it } from "vitest";

import { productExtras, setProductExtrasOverride } from "./product-extras";

describe("product test extras", () => {
  it("returns placeholder extras for any product", () => {
    const extras = productExtras("any-id");
    expect(extras.rating.average).toBeGreaterThan(0);
    expect(extras.seller.name.length).toBeGreaterThan(0);
  });

  it("applies test overrides per product", () => {
    setProductExtrasOverride("p1", { reviewsCount: 3 });
    expect(productExtras("p1").reviewsCount).toBe(3);
    expect(productExtras("p2").reviewsCount).not.toBe(3);
  });

  it("ships placeholder specs and reviews for layout", () => {
    const extras = productExtras("any-id");
    expect(extras.specs.length).toBeGreaterThan(0);
    expect(extras.reviews.length).toBeGreaterThan(0);
    expect(extras.reviews[0].rating).toBeGreaterThanOrEqual(1);
    expect(extras.questions.length).toBeGreaterThan(0);
    expect(extras.guarantees.length).toBeGreaterThan(0);
    expect(extras.brand.length).toBeGreaterThan(0);
  });
});
