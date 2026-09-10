import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ apiClient: { GET: vi.fn(), PUT: vi.fn() } }));

import { apiClient } from "./api";
import { CommerceRequestError, commerceErrorMessage, listCommerceProducts, updateCommerceCart } from "./commerce-catalog-api";

describe("commerce catalog API adapter", () => {
  afterEach(() => vi.clearAllMocks());

  it("sends the patient bearer token and preserves TOMAN strings from the generated contract", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({ data: { items: [{ id: "11111111-1111-4111-8111-111111111111", title: "محصول", slug: "product", description: null, category: { id: "22222222-2222-4222-8222-222222222222", name: "دسته", slug: "category" }, skus: [{ id: "33333333-3333-4333-8333-333333333333", code: "SKU", title: null, currentPriceToman: "125000", currentTaxToman: "0" }] }], page: 1, pageSize: 24, total: 1 }, response: new Response(null, { status: 200 }) } as never);
    const response = await listCommerceProducts("access-token", { query: "محصول" });
    expect(response.items[0]?.skus[0]?.currentPriceToman).toBe("125000");
    expect(apiClient.GET).toHaveBeenCalledWith("/v1/commerce/products", { headers: { authorization: "Bearer access-token" }, params: { query: { query: "محصول" } } });
  });

  it("sends a server-authoritative cart quantity and maps failed requests safely", async () => {
    vi.mocked(apiClient.PUT).mockResolvedValue({ error: { code: "COMMERCE_SKU_NOT_FOUND" }, response: new Response(null, { status: 404 }) } as never);
    await expect(updateCommerceCart("access-token", "33333333-3333-4333-8333-333333333333", 2)).rejects.toEqual(new CommerceRequestError(404, "COMMERCE_SKU_NOT_FOUND"));
    expect(apiClient.PUT).toHaveBeenCalledWith("/v1/patients/me/cart", { headers: { authorization: "Bearer access-token" }, body: { skuId: "33333333-3333-4333-8333-333333333333", quantity: 2 } });
    expect(commerceErrorMessage(new CommerceRequestError(404))).toBe("این محصول دیگر در دسترس نیست.");
  });
});
