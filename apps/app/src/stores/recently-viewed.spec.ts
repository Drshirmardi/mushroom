import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  },
});

const { useRecentStore } = await import("./recently-viewed");

beforeEach(() => {
  memory.clear();
  useRecentStore.setState({ items: [] });
});

describe("recently viewed store", () => {
  it("puts the latest view first without duplicates", () => {
    const push = useRecentStore.getState().push;
    push({ productId: "a", title: "A", price: 100 });
    push({ productId: "b", title: "B", price: 200 });
    push({ productId: "a", title: "A", price: 100 });
    const items = useRecentStore.getState().items;
    expect(items.map((item) => item.productId)).toEqual(["a", "b"]);
  });

  it("caps the list at ten items", () => {
    const push = useRecentStore.getState().push;
    for (let index = 0; index < 12; index++) push({ productId: `p${index}`, title: `P${index}`, price: index });
    expect(useRecentStore.getState().items).toHaveLength(10);
    expect(useRecentStore.getState().items[0].productId).toBe("p11");
  });

  it("persists views to local storage", () => {
    useRecentStore.getState().push({ productId: "a", title: "A", price: 100 });
    expect(memory.get("sabz-recently-viewed")).toContain("productId");
  });
});
