import { createApiClient } from "@sabz-zendegi/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BillingApiError, completeBillingRefund, getBillingIntent, getBillingSummary, listBillingIntents, listBillingReconciliation, refundBillingIntent, resolveBillingAttemptFailed, retryBillingAttempt } from "./billing-admin-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test", apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }) }));

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const INTENT = "33333333-3333-4333-8333-333333333333";

describe("billing admin API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("reads the billing summary", async () => {
    fetchMock.mockResolvedValueOnce(response({ currency: "IRR", asOf: "2026-10-16T10:00:00.000Z", walletLiabilityRial: "0", gatewayReceivedRial: "0", topupReceivedRial: "0", orderPaidRial: "0", appointmentPaidRial: "0", refundedRial: "0", administrativeCreditRial: "0", administrativeDebitRial: "0", ledgerMismatchCount: 0, source: "live" }));
    await getBillingSummary("token");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname, request.headers.get("authorization")]).toEqual(["GET", "/v1/admin/billing/summary", "Bearer token"]);
  });

  it("lists intents with purpose/status/patient filters", async () => {
    fetchMock.mockResolvedValueOnce(response({ page: 1, pageSize: 20, total: 0, items: [] }));
    await listBillingIntents("token", { purpose: "ORDER", status: "PAID", patientId: "p1" });
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    const url = new URL(request.url);
    expect(url.pathname).toBe("/v1/admin/billing/intents");
    expect(url.searchParams.get("purpose")).toBe("ORDER");
    expect(url.searchParams.get("status")).toBe("PAID");
    expect(url.searchParams.get("patientId")).toBe("p1");
  });

  it("loads a single intent detail", async () => {
    fetchMock.mockResolvedValueOnce(response({ id: INTENT, purpose: "ORDER", status: "PAID", amountRial: "1250000", patientId: "p1" }));
    await getBillingIntent("token", INTENT);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).pathname).toBe(`/v1/admin/billing/intents/${INTENT}`);
  });

  it("lists reconciliation attempts", async () => {
    fetchMock.mockResolvedValueOnce(response({ page: 1, pageSize: 50, total: 0, items: [] }));
    await listBillingReconciliation("token", 1, 50);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).pathname).toBe("/v1/admin/billing/reconciliation");
  });

  it("creates a refund from an integer RIAL amount with a reason", async () => {
    fetchMock.mockResolvedValueOnce(response({ id: "r1", status: "COMPLETED", amountRial: "1250000", completedAt: null }, 201));
    await refundBillingIntent("token", INTENT, { amountRial: "1250000", reason: "لغو سفارش" }, "refund-key");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname, request.headers.get("idempotency-key")]).toEqual(["POST", `/v1/admin/billing/intents/${INTENT}/refunds`, "refund-key"]);
    await expect(request.json()).resolves.toEqual({ amountRial: "1250000", reason: "لغو سفارش" });
  });

  it("completes a manual gateway refund with an evidence reference", async () => {
    fetchMock.mockResolvedValueOnce(response({ id: "r1", status: "COMPLETED", amountRial: "1250000", completedAt: "2026-10-16T10:00:00.000Z" }, 201));
    await completeBillingRefund("token", "r1", "transfer-reference-123", "complete-key");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname]).toEqual(["POST", "/v1/admin/billing/refunds/r1/complete"]);
    await expect(request.json()).resolves.toEqual({ evidenceReference: "transfer-reference-123" });
  });

  it("retries an attempt Verify and resolves a failed attempt with evidence", async () => {
    fetchMock.mockResolvedValueOnce(response({ id: "a1", intentId: INTENT, status: "VERIFIED", amountRial: "1250000", currency: "IRR", redirectUrl: null }, 201));
    await retryBillingAttempt("token", "a1", "retry-key");
    const retry = fetchMock.mock.calls[0]?.[0] as Request;
    expect([retry.method, new URL(retry.url).pathname]).toEqual(["POST", "/v1/admin/billing/attempts/a1/retry"]);

    fetchMock.mockResolvedValueOnce(response({ id: "a1", intentId: INTENT, status: "FAILED", amountRial: "1250000", currency: "IRR", redirectUrl: null }, 201));
    await resolveBillingAttemptFailed("token", "a1", "review-notes", "resolve-key");
    const resolve = fetchMock.mock.calls[1]?.[0] as Request;
    expect([resolve.method, new URL(resolve.url).pathname]).toEqual(["POST", "/v1/admin/billing/attempts/a1/resolve-failed"]);
    await expect(resolve.json()).resolves.toEqual({ evidenceReference: "review-notes" });
  });

  it("preserves the stable backend error code", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "BILLING_REFUND_EXCEEDS_PAYMENT", message: "exceeds", details: {} }, 409));
    const error = await refundBillingIntent("token", INTENT, { amountRial: "1", reason: "x" }, "k").catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(BillingApiError);
    expect(error).toMatchObject({ status: 409, code: "BILLING_REFUND_EXCEEDS_PAYMENT" });
  });
});
