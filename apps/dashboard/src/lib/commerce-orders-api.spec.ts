import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() } }));
import { apiClient } from "@/lib/api";
import { loadCommerceOperationsSummary, reconcilePaymentAttempt } from "./commerce-orders-api";

describe("commerce order dashboard API", () => {
  afterEach(() => vi.clearAllMocks());
  it("derives operational counts from persisted order and reconciliation sources, not revenue", async () => {
    vi.mocked(apiClient.GET).mockResolvedValueOnce({ data: [{ status: "FULFILLMENT_PENDING" }, { status: "SHIPPED" }, { status: "REFUND_PENDING" }], response: new Response(null, { status: 200 }) } as never).mockResolvedValueOnce({ data: [{ id: "attempt" }], response: new Response(null, { status: 200 }) } as never);
    await expect(loadCommerceOperationsSummary("token")).resolves.toEqual({ fulfillmentPending: 1, shipped: 1, refundPending: 1, reconciliationRequired: 1 });
  });
  it("requires an administrator evidence value to resolve reconciliation", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({ data: { id: "attempt", status: "FAILED" }, response: new Response(null, { status: 200 }) } as never);
    await reconcilePaymentAttempt("token", "attempt", "FAILED", "bank-review-42");
    expect(apiClient.POST).toHaveBeenCalledWith("/v1/admin/commerce/orders/payment-attempts/{attemptId}/reconcile", expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer token" }), params: { path: { attemptId: "attempt" } }, body: { resolution: "FAILED", evidenceReference: "bank-review-42" } }));
  });
});
