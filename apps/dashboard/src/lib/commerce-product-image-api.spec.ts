import { createApiClient } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";
import { createProductImageApi, ProductImageApiError } from "./commerce-product-image-api";

const id = "00000000-0000-4000-8000-000000000001";
describe("product image generated API integration", () => {
  it("preserves nullable metadata and the exact opaque quoted ETag", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("null", { headers: { "content-type": "application/json", etag: '"none"' } }));
    const api = createProductImageApi(createApiClient({ baseUrl: "https://api.test", fetch }), async () => "fresh");
    await expect(api.metadata(id)).resolves.toEqual({ image: null, etag: '"none"' });
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.url).toBe(`https://api.test/v1/admin/commerce/products/${id}/image`);
    expect(request.headers.get("authorization")).toBe("Bearer fresh");
    expect(request.cache).toBe("no-store");
  });
  it("fails closed when ETag is not exposed", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("null", { headers: { "content-type": "application/json" } }));
    const api = createProductImageApi(createApiClient({ baseUrl: "https://api.test", fetch }), async () => "fresh");
    await expect(api.metadata(id)).rejects.toMatchObject({ code: "IMAGE_CONTRACT_UNAVAILABLE" });
  });
  it("reads protected bytes through the authorized client with an abort signal", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("bytes", { headers: { "content-type": "image/webp" } }));
    const api = createProductImageApi(createApiClient({ baseUrl: "https://api.test", fetch }), async () => "fresh");
    const blob = await api.preview(id, new AbortController().signal);
    expect(await blob.text()).toBe("bytes");
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.url).toBe(`https://api.test/v1/admin/commerce/products/${id}/image/content`);
    expect(request.headers.get("authorization")).toBe("Bearer fresh");
  });
  it("removes with generated mutation headers and accepts only 204", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(new Response(null, { status: 204, headers: { etag: '"none"' } })).mockResolvedValueOnce(new Response(JSON.stringify({ code: "COMMERCE_IMAGE_REVISION_CONFLICT" }), { status: 412, headers: { "content-type": "application/json" } }));
    const api = createProductImageApi(createApiClient({ baseUrl: "https://api.test", fetch }), async () => "fresh");
    await api.remove(id, { key: "delete-1", etag: '"opaque-version"' });
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.method).toBe("DELETE");
    expect(request.headers.get("if-match")).toBe('"opaque-version"');
    expect(request.headers.get("idempotency-key")).toBe("delete-1");
    await expect(api.remove(id, { key: "delete-2", etag: '"opaque-version"' })).rejects.toMatchObject({ status: 412, code: "COMMERCE_IMAGE_REVISION_CONFLICT" });
  });
  it("does not request protected content without a valid session", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const api = createProductImageApi(createApiClient({ baseUrl: "https://api.test", fetch }), async () => null);
    await expect(api.preview(id)).rejects.toEqual(expect.any(ProductImageApiError));
    expect(fetch).not.toHaveBeenCalled();
  });
});
