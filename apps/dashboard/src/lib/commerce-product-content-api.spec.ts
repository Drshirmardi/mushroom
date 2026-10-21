import { createApiClient } from "@sabz-zendegi/api-client";
import { describe, expect, it, vi } from "vitest";

import {
  ProductContentApiError,
  createProductContentApi,
  productContentErrorMessage,
} from "./commerce-product-content-api";

const productId = "00000000-0000-4000-8000-000000000001";
const content = {
  brand: "برند",
  manufacturer: null,
  shortDescription: null,
  description: "توضیح",
  ingredients: null,
  usageInstructions: null,
  warnings: null,
  contraindications: null,
  contentRevision: 3,
  status: "PENDING_APPROVAL",
  provenance: { sourceKind: "PACKAGING", sourceReference: "بسته‌بندی ۱۴۰۴" },
  approvedContentRevision: null,
  contentApprovedAt: null,
  contentApprovedByUserId: null,
};

function setup(responder: (url: string, init: { method?: string; body?: unknown }) => Response) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => responder(String(input), { method: init?.method, body: init?.body }));
  const api = createProductContentApi(createApiClient({ baseUrl: "https://api.test", fetch }));
  return { api, fetch };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("product content generated API integration", () => {
  it("loads current content with the authorized GET route", async () => {
    const { api, fetch } = setup(() => json(content));
    await expect(api.load(productId, "session-token")).resolves.toEqual(content);
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.url).toBe(`https://api.test/v1/admin/commerce/products/${productId}/content`);
    expect(request.headers.get("authorization")).toBe("Bearer session-token");
  });

  it("saves with expected revision in the body and no repurposed media headers", async () => {
    const { api, fetch } = setup(() => json({ ...content, contentRevision: 4 }));
    const body = { fields: { brand: "برند تازه" }, provenance: null, expectedContentRevision: 3 };
    await api.save(productId, "session-token", body);
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.method).toBe("PATCH");
    expect(request.headers.get("if-match")).toBeNull();
    expect(request.headers.get("idempotency-key")).toBeNull();
    expect(await request.json()).toEqual(body);
  });

  it("approves only the expected revision through the dedicated action", async () => {
    const { api, fetch } = setup(() => json({ ...content, status: "APPROVED", approvedContentRevision: 3 }));
    await api.approve(productId, "session-token", 3);
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`https://api.test/v1/admin/commerce/products/${productId}/content/approve`);
    expect(await request.json()).toEqual({ expectedContentRevision: 3 });
  });

  it("surfaces revision conflicts with the stable server code", async () => {
    const { api } = setup(() => json({ code: "COMMERCE_CONTENT_REVISION_CONFLICT" }, 409));
    await expect(api.approve(productId, "session-token", 2)).rejects.toMatchObject({
      status: 409,
      code: "COMMERCE_CONTENT_REVISION_CONFLICT",
    });
    expect(productContentErrorMessage(409, "COMMERCE_CONTENT_REVISION_CONFLICT")).toContain("نسخهٔ");
  });

  it("maps denial, validation and outage states to Persian messages", async () => {
    const { api } = setup(() => json({ code: "FORBIDDEN" }, 403));
    await expect(api.save(productId, "session-token", { fields: {}, expectedContentRevision: 1 })).rejects.toMatchObject({ status: 403 });
    expect(productContentErrorMessage(403)).toContain("اجازه");
    expect(productContentErrorMessage(422, "COMMERCE_CONTENT_SOURCE_REQUIRED")).toContain("منبع");
    expect(productContentErrorMessage(0)).toContain("دسترس نیست");
    await expect(api.load(productId, "session-token")).rejects.toBeInstanceOf(ProductContentApiError);
  });
});
