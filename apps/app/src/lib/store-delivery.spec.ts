import { afterEach, describe, expect, it, vi } from "vitest";
import { readStoredDelivery, resolveDeliveryAddress, storeDelivery } from "./store-delivery";

afterEach(() => vi.unstubAllGlobals());
const addresses = [{ id: "home", isDefault: true }, { id: "work", isDefault: false }];

describe("shared storefront and checkout delivery preference", () => {
  it("restores the selected work address instead of the server default", () => {
    expect(resolveDeliveryAddress(addresses, undefined, "work")?.id).toBe("work");
  });
  it("preserves a current valid pick during a refresh", () => {
    expect(resolveDeliveryAddress(addresses, "work", "home")?.id).toBe("work");
  });
  it("ignores deleted or foreign preferences and uses only the returned list", () => {
    expect(resolveDeliveryAddress(addresses, "foreign", "deleted")?.id).toBe("home");
    expect(resolveDeliveryAddress(addresses, "deleted", "work")?.id).toBe("work");
    expect(resolveDeliveryAddress(addresses.slice(1), undefined, null)?.id).toBe("work");
    expect(resolveDeliveryAddress([], undefined, "work")).toBeUndefined();
  });
  it("scopes persisted preferences to the authenticated user", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
    storeDelivery("patient-a", "work");
    expect(readStoredDelivery("patient-a")).toBe("work");
    expect(readStoredDelivery("patient-b")).toBeNull();
    storeDelivery(null, "home");
    expect(readStoredDelivery(null)).toBeNull();
    expect(values.size).toBe(1);
  });
  it("allows selection to continue when optional browser storage is blocked", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } } });
    expect(readStoredDelivery("patient")).toBeNull();
    expect(() => storeDelivery("patient", "work")).not.toThrow();
    expect(resolveDeliveryAddress(addresses, undefined, readStoredDelivery("patient"))?.id).toBe("work");
  });
});
