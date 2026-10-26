import { describe, expect, it } from "vitest";

import { NAV } from "./nav";

describe("dashboard operational navigation", () => {
  it("contains no fabricated counters and does not expose deferred mock routes", () => {
    const routes = NAV.map((item) => item.href);
    expect(routes).toContain("/audit");
    expect(routes).not.toEqual(expect.arrayContaining([
      "/store-marketing", "/automation", "/bot-center", "/bot-flows",
      "/bot-assessment", "/bot-knowledge", "/bot-conversations",
      "/bot-campaigns", "/bot-analytics",
    ]));
    expect(NAV.every((item) => !("badge" in item))).toBe(true);
  });
});
