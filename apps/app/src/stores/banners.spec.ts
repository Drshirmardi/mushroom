import { describe, expect, it } from "vitest";

import { useBannerStore } from "./banners";

describe("banner store", () => {
  it("starts empty and is populated by the store banner API", () => {
    expect(useBannerStore.getState().slides).toEqual([]);
  });

  it("replaces slides for API-provided banners", () => {
    useBannerStore.getState().setSlides([{ id: "x", image: "https://example.com/x.jpg", alt: "تست" }]);
    expect(useBannerStore.getState().slides).toHaveLength(1);
    useBannerStore.getState().setSlides([]);
  });
});
