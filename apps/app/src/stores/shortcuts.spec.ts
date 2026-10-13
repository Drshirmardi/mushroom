import { describe, expect, it } from "vitest";

import { TEST_SHORTCUTS } from "./shortcuts";

describe("store shortcuts test data", () => {
  it("ships eight shortcuts with images, labels and targets", () => {
    expect(TEST_SHORTCUTS).toHaveLength(8);
    for (const shortcut of TEST_SHORTCUTS) {
      expect(shortcut.image).toMatch(/^https:\/\//);
      expect(shortcut.label.length).toBeGreaterThan(0);
      expect(shortcut.target.length).toBeGreaterThan(0);
    }
  });

  it("keeps shortcut ids unique", () => {
    expect(new Set(TEST_SHORTCUTS.map((shortcut) => shortcut.id)).size).toBe(TEST_SHORTCUTS.length);
  });
});
