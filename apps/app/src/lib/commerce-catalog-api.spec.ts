import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ apiClient: { GET: vi.fn(), PUT: vi.fn(), POST: vi.fn() } }));

import { apiClient } from "./api";
import { clearPatientRequestCache } from "./patient-request";
import { CommerceRequestError, checkoutCommerceOrder, commerceErrorMessage, createPaymentAttempt, getCommerceReceipt, listCommerceProducts, updateCommerceCart } from "./commerce-catalog-api";

describe("commerce catalog API adapter", () => {
  afterEach(() => { vi.clearAllMocks(); clearPatientRequestCache(); });

  it("loads the public catalog without a bearer token and preserves TOMAN strings", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({ data: { items: [{ id: "11111111-1111-4111-8111-111111111111", title: "محصول", slug: "product", description: null, category: { id: "22222222-2222-4222-8222-222222222222", name: "دسته", slug: "category" }, skus: [{ id: "33333333-3333-4333-8333-333333333333", code: "SKU", title: null, currentPriceToman: "125000", currentTaxToman: "0" }] }], page: 1, pageSize: 24, total: 1 }, response: new Response(null, { status: 200 }) } as never);
    const response = await listCommerceProducts({ query: "محصول" });
    expect(response.items[0]?.skus[0]?.currentPriceToman).toBe("125000");
    expect(apiClient.GET).toHaveBeenCalledWith("/v1/commerce/products", { params: { query: { query: "محصول" } } });
  });

  it("sends a server-authoritative cart quantity and maps failed requests safely", async () => {
    vi.mocked(apiClient.PUT).mockResolvedValue({ error: { code: "COMMERCE_SKU_NOT_FOUND" }, response: new Response(null, { status: 404 }) } as never);
    await expect(updateCommerceCart("access-token", "33333333-3333-4333-8333-333333333333", 2)).rejects.toEqual(new CommerceRequestError(404, "COMMERCE_SKU_NOT_FOUND"));
    expect(apiClient.PUT).toHaveBeenCalledWith("/v1/patients/me/cart", { headers: { authorization: "Bearer access-token" }, body: { skuId: "33333333-3333-4333-8333-333333333333", quantity: 2 } });
    expect(commerceErrorMessage(new CommerceRequestError(404))).toBe("این محصول دیگر در دسترس نیست.");
  });

  it("submits only the shipping selection with an idempotency key; amount is never client input", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({ data: { id: "11111111-1111-4111-8111-111111111111" }, response: new Response(null, { status: 201 }) } as never);
    await checkoutCommerceOrder("access-token", "checkout-key", { shippingMethod: "PICKUP" });
    expect(apiClient.POST).toHaveBeenCalledWith("/v1/patients/me/orders", { headers: { authorization: "Bearer access-token", "idempotency-key": "checkout-key" }, body: { shippingMethod: "PICKUP" } });
  });

  it("maps stable checkout failures to actionable patient messages", () => {
    expect(commerceErrorMessage(new CommerceRequestError(409, "COMMERCE_INVENTORY_INSUFFICIENT"))).toBe("موجودی یک یا چند کالای سبد کافی نیست؛ سبد را بررسی کنید.");
    expect(commerceErrorMessage(new CommerceRequestError(409, "COMMERCE_CART_EMPTY"))).toBe("سبد خرید شما خالی است.");
    expect(commerceErrorMessage(new CommerceRequestError(409, "COMMERCE_SKU_NOT_FOUND"))).toBe("یکی از کالاهای سبد دیگر در دسترس نیست؛ سبد را بررسی کنید.");
    expect(commerceErrorMessage(new CommerceRequestError(409, "SHIPPING_METHOD_UNAVAILABLE"))).toBe("روش ارسال انتخاب‌شده در دسترس نیست.");
    expect(commerceErrorMessage(new CommerceRequestError(409, "IDEMPOTENCY_KEY_REUSED"))).toBe("این درخواست با اطلاعات دیگری قبلاً ثبت شده است؛ صفحه را تازه‌سازی کنید.");
  });

  it("distinguishes an expired session from a forbidden commerce operation", () => {
    expect(commerceErrorMessage(new CommerceRequestError(401))).toBe("نشست شما منقضی شده است؛ دوباره وارد حساب شوید.");
    expect(commerceErrorMessage(new CommerceRequestError(403))).toBe("اجازهٔ انجام این عملیات فروشگاه را ندارید.");
  });

  it("uses owned-order endpoints for payment and receipt without sending provider data", async () => {
    const orderId = "11111111-1111-4111-8111-111111111111";
    vi.mocked(apiClient.POST).mockResolvedValueOnce({ data: { id: "22222222-2222-4222-8222-222222222222", redirectUrl: "https://sadad.shaparak.ir/VPG/Purchase?Token=synthetic" }, response: new Response(null, { status: 201 }) } as never);
    await expect(createPaymentAttempt("access-token", orderId, "attempt-key")).resolves.toMatchObject({ redirectUrl: "https://sadad.shaparak.ir/VPG/Purchase?Token=synthetic" });
    expect(apiClient.POST).toHaveBeenCalledWith("/v1/patients/me/orders/{orderId}/payment-attempts", { headers: { authorization: "Bearer access-token", "idempotency-key": "attempt-key" }, params: { path: { orderId } } });
    vi.mocked(apiClient.POST).mockResolvedValue({ error: { code: "SADAD_GO_LIVE_BLOCKED" }, response: new Response(null, { status: 503 }) } as never);
    await expect(createPaymentAttempt("access-token", orderId, "attempt-key")).rejects.toEqual(new CommerceRequestError(503, "SADAD_GO_LIVE_BLOCKED"));
    vi.mocked(apiClient.GET).mockResolvedValue({ error: { code: "COMMERCE_RECEIPT_NOT_AVAILABLE" }, response: new Response(null, { status: 404 }) } as never);
    await expect(getCommerceReceipt("access-token", orderId)).rejects.toEqual(new CommerceRequestError(404, "COMMERCE_RECEIPT_NOT_AVAILABLE"));
    expect(apiClient.GET).toHaveBeenCalledWith("/v1/patients/me/orders/{orderId}/receipt", { headers: { authorization: "Bearer access-token" }, params: { path: { orderId } } });
  });
});
