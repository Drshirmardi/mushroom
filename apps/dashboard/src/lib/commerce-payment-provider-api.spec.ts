import { createApiClient } from "@sabz-zendegi/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPaymentProviderRevision, paymentProviderCallbackUrl, PaymentProviderApiError, updatePaymentProviderConfig } from "./commerce-payment-provider-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test", apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }) }));

const response = (body: unknown, status = 201) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("payment provider API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("sends all three Sadad credential fields as a write-only revision", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "sadad", displayName: "سداد", configured: true, enabled: false, isDefault: false, providerUnit: "UNCONFIRMED", goLiveReady: false, activeRevisionNumber: 1, capabilities: {}, updatedAt: null }));
    await createPaymentProviderRevision("token", "sadad", { merchantId: "merchant", terminalId: "terminal", terminalKey: "base64-key" }, "revision-key");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname, request.headers.get("idempotency-key")]).toEqual(["POST", "/v1/admin/commerce/payment-providers/sadad/config-revisions", "revision-key"]);
    await expect(request.json()).resolves.toEqual({ credential: { merchantId: "merchant", terminalId: "terminal", terminalKey: "base64-key" } });
  });

  it("preserves the stable backend error code", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "PAYMENT_PROVIDER_CONFIGURATION_INVALID", message: "invalid", details: {} }, 409));
    const error = await createPaymentProviderRevision("token", "sadad", { merchantId: "merchant", terminalId: "terminal", terminalKey: "bad" }, "revision-key").catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(PaymentProviderApiError);
    expect(error).toMatchObject({ status: 409, code: "PAYMENT_PROVIDER_CONFIGURATION_INVALID" });
  });

  it("updates adapter state through the authorized provider endpoint", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "sadad", displayName: "سداد", configured: true, enabled: false, isDefault: false, providerUnit: "UNCONFIRMED", goLiveReady: false, activeRevisionNumber: 1, capabilities: {}, updatedAt: null }, 200));
    await updatePaymentProviderConfig("token", "sadad", { enabled: false });
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname, request.headers.get("authorization")]).toEqual(["PATCH", "/v1/admin/commerce/payment-providers/sadad", "Bearer token"]);
    await expect(request.json()).resolves.toEqual({ enabled: false });
  });

  it("builds the provider callback from the public API origin", () => {
    expect(paymentProviderCallbackUrl("sadad", "https://dev-api.roxco.ir")).toBe("https://dev-api.roxco.ir/v1/payments/providers/sadad/callback");
    expect(paymentProviderCallbackUrl("sadad", "https://staging-api.roxco.ir/base/")).toBe("https://staging-api.roxco.ir/v1/payments/providers/sadad/callback");
  });
});
