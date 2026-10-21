import { createApiClient } from "@sabz-zendegi/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommerceCatalogApiError, createCommerceCategory, createCommerceProduct, createCommerceSku, loadCommerceCatalog, updateCommerceCategory, updateCommerceCourierShippingRate, updateCommerceInventory, updateCommerceProduct, updateCommerceSku } from "./commerce-catalog-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }) }));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const category = { id: "00000000-0000-4000-8000-000000000001", name: "مکمل", slug: "supplements", isActive: true, productCount: 0 };
const product = { id: "00000000-0000-4000-8000-000000000002", title: "محصول", slug: "product", description: null, status: "DRAFT" as const, category, skus: [] };

describe("commerce catalog dashboard API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("loads the real category and paginated product sources with bearer authentication", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(json([category])).mockResolvedValueOnce(json({ items: [product], page: 1, pageSize: 100, total: 1 }));
    await expect(loadCommerceCatalog(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token")).resolves.toMatchObject({ status: "ready", data: { categories: [category], products: [product] } });
    const requests = fetch.mock.calls.map(([request]) => request as Request);
    expect(requests.map((request) => request.url)).toEqual(["https://api.example.test/v1/admin/commerce/categories", "https://api.example.test/v1/admin/commerce/products?page=1&pageSize=100"]);
    expect(requests.every((request) => request.headers.get("authorization") === "Bearer token")).toBe(true);
  });

  it("keeps empty, forbidden, and unavailable results distinct", async () => {
    const empty = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(json([])).mockResolvedValueOnce(json({ items: [], page: 1, pageSize: 100, total: 0 }));
    await expect(loadCommerceCatalog(createApiClient({ baseUrl: "https://api.example.test", fetch: empty }), "token")).resolves.toMatchObject({ status: "ready", data: { products: [] } });
    const forbidden = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(json({ code: "FORBIDDEN" }, 403)).mockResolvedValueOnce(json({ code: "FORBIDDEN" }, 403));
    await expect(loadCommerceCatalog(createApiClient({ baseUrl: "https://api.example.test", fetch: forbidden }), "token")).resolves.toEqual({ status: "unauthorized" });
    const unavailable = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("offline"));
    await expect(loadCommerceCatalog(createApiClient({ baseUrl: "https://api.example.test", fetch: unavailable }), "token")).resolves.toEqual({ status: "unavailable" });
  });

  it("requests later server pages instead of hiding products beyond the first hundred", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(json([category])).mockResolvedValueOnce(json({ items: [product], page: 2, pageSize: 100, total: 130 }));
    await expect(loadCommerceCatalog(createApiClient({ baseUrl: "https://api.example.test", fetch }), "token", 2)).resolves.toMatchObject({ status: "ready", data: { pagination: { page: 2, pageSize: 100, total: 130 } } });
    expect((fetch.mock.calls[1][0] as Request).url).toContain("page=2&pageSize=100");
  });

  it("uses generated bodies for catalog, SKU price, lifecycle, and inventory mutations", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(product)));
    await createCommerceCategory("token", { name: "مکمل", slug: "supplements" });
    await updateCommerceCategory("token", category.id, { isActive: false });
    await createCommerceProduct("token", { categoryId: category.id, title: "محصول", slug: "product" });
    await updateCommerceProduct("token", product.id, { status: "ACTIVE" });
    await createCommerceSku("token", product.id, { code: "SKU-1", currentPriceToman: 125000, currentTaxToman: 0, initialOnHandQuantity: 4 });
    await updateCommerceSku("token", "sku-1", { currentPriceToman: 130000 });
    await updateCommerceInventory("token", "sku-1", 8);
    await updateCommerceCourierShippingRate("token", { amountToman: 25000, isActive: true });
    const requests = fetchMock.mock.calls.map(([request]) => request as Request);
    expect(requests.map((request) => [request.method, new URL(request.url).pathname])).toEqual([["POST", "/v1/admin/commerce/categories"], ["PATCH", `/v1/admin/commerce/categories/${category.id}`], ["POST", "/v1/admin/commerce/products"], ["PATCH", `/v1/admin/commerce/products/${product.id}`], ["POST", `/v1/admin/commerce/products/${product.id}/skus`], ["PATCH", "/v1/admin/commerce/skus/sku-1"], ["PATCH", "/v1/admin/commerce/skus/sku-1/inventory"], ["PATCH", "/v1/admin/commerce/shipping-rates/courier"]]);
    expect(requests.every((request) => request.headers.get("authorization") === "Bearer token")).toBe(true);
    await expect(requests[4]?.json()).resolves.toMatchObject({ currentPriceToman: 125000, currentTaxToman: 0 });
    await expect(requests[6]?.json()).resolves.toEqual({ onHandQuantity: 8 });
    await expect(requests[7]?.json()).resolves.toEqual({ amountToman: 25000, isActive: true });
  });

  it("preserves a mutation failure for truthful UI handling", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "FORBIDDEN" }, 403));
    await expect(createCommerceCategory("token", { name: "مکمل", slug: "supplements" })).rejects.toEqual(expect.objectContaining<Partial<CommerceCatalogApiError>>({ status: 403 }));
  });
});
