import { describe, expect, it } from "vitest";
import { cartCount, cartTax, cartTotal, type CartItem } from "./cart";
import { formatPrice } from "../lib/format";

const item = (changes: Partial<CartItem> = {}): CartItem => ({ id: "i", skuId: "s", productId: "p", name: "محصول", price: "125000", tax: "5000", qty: 2, ...changes });

describe("store integer money presentation", () => {
  it("keeps subtotal and the server-provided tax separate", () => {
    expect(cartTotal([item()]).toString()).toBe("250000");
    expect(cartTax([item()]).toString()).toBe("10000");
    expect(cartCount([item()])).toBe(2);
  });
  it("preserves wire prices beyond Number precision", () => {
    expect(cartTotal([item({ price: "9007199254740993", qty: 2 })]).toString()).toBe("18014398509481986");
    expect(formatPrice(BigInt("9007199254740993"))).toBe("۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۳");
  });
  it("supports legacy numeric cache entries and empty carts", () => {
    expect(cartTotal([item({ price: 100, tax: undefined })]).toString()).toBe("200");
    expect(cartTax([item({ tax: undefined })]).toString()).toBe("0");
    expect(cartTotal([]).toString()).toBe("0");
  });
});
