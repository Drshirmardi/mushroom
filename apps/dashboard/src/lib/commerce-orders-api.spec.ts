import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() } }));
import { apiClient } from "@/lib/api";
import { CommerceOrdersApiError, commerceOrdersErrorMessage, loadCommerceOperationsSummary, reconcilePaymentAttempt, requestBillingOrderRefund, transitionCommerceOrder } from "./commerce-orders-api";

describe("commerce order dashboard API", () => {
  afterEach(() => vi.clearAllMocks());
  it("preserves the supplied command key and converts order refunds from TOMAN to exact IRR", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({ data: { id: 'refund', status: 'MANUAL_REQUIRED' }, response: new Response(null, { status: 201 }) } as never);
    await requestBillingOrderRefund('token', 'intent', '9007199254740993', 'Customer request', 'stable-command');
    expect(apiClient.POST).toHaveBeenCalledWith('/v1/admin/billing/intents/{id}/refunds', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer token' }), params: expect.objectContaining({ header: expect.objectContaining({ 'idempotency-key': 'stable-command' }) }), body: { amountRial: '90071992547409930', reason: 'Customer request' } }));
    vi.mocked(apiClient.PATCH).mockResolvedValue({ data: { id: 'order' }, response: new Response(null, { status: 200 }) } as never);
    await transitionCommerceOrder('token', 'order', 'SHIPPED', 'stable-command');
    expect(apiClient.PATCH).toHaveBeenCalledWith('/v1/admin/commerce/orders/{orderId}/fulfillment', expect.objectContaining({ headers: expect.objectContaining({ 'idempotency-key': 'stable-command' }), body: { status: 'SHIPPED' } }));
  });
  it("derives operational counts from persisted order and reconciliation sources, not revenue", async () => {
    vi.mocked(apiClient.GET).mockResolvedValueOnce({ data: [{ status: "FULFILLMENT_PENDING" }, { status: "SHIPPED" }, { status: "REFUND_PENDING" }], response: new Response(null, { status: 200 }) } as never).mockResolvedValueOnce({ data: [{ id: "attempt" }], response: new Response(null, { status: 200 }) } as never);
    await expect(loadCommerceOperationsSummary("token")).resolves.toEqual({ fulfillmentPending: 1, shipped: 1, refundPending: 1, reconciliationRequired: 1 });
  });
  it("requires an administrator evidence value to resolve reconciliation", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({ data: { id: "attempt", status: "FAILED" }, response: new Response(null, { status: 200 }) } as never);
    await reconcilePaymentAttempt("token", "attempt", "FAILED", "bank-review-42");
    expect(apiClient.POST).toHaveBeenCalledWith("/v1/admin/commerce/orders/payment-attempts/{attemptId}/reconcile", expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer token" }), params: { path: { attemptId: "attempt" } }, body: { resolution: "FAILED", evidenceReference: "bank-review-42" } }));
  });
  it("preserves structured status and code without exposing a raw server payload", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({ error: { code: "COMMERCE_ORDER_TRANSITION_INVALID", message: "internal" }, response: new Response(null, { status: 409 }) } as never);
    await expect(loadCommerceOperationsSummary("token")).rejects.toEqual(new CommerceOrdersApiError(409, "COMMERCE_ORDER_TRANSITION_INVALID"));
    expect(commerceOrdersErrorMessage(new CommerceOrdersApiError(409, "COMMERCE_ORDER_TRANSITION_INVALID"))).toBe("این تغییر وضعیت دیگر مجاز نیست؛ فهرست سفارش‌ها تازه شد.");
    expect(commerceOrdersErrorMessage(new CommerceOrdersApiError(403, "FORBIDDEN"))).toBe("اجازهٔ انجام این عملیات را ندارید.");
    expect(commerceOrdersErrorMessage(new CommerceOrdersApiError(0))).toBe("ارتباط با سرویس سفارش‌ها برقرار نشد؛ دوباره تلاش کنید.");
  });
});
