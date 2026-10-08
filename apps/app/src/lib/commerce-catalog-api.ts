import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "./api";

export type CommerceProduct = components["schemas"]["PatientCommerceProductDto"];
export type CommerceCart = components["schemas"]["PatientCartDto"];
export type CommerceWishlist = components["schemas"]["PatientWishlistDto"];
export type CommerceAddress = components["schemas"]["CommerceAddressDto"];
export type CommerceShippingOption = components["schemas"]["CommerceShippingOptionDto"];
export type CommerceOrder = components["schemas"]["CommerceOrderDto"];
export type CommerceReceipt = components["schemas"]["PatientCommerceReceiptDto"];
export type PaymentAttempt = components["schemas"]["PaymentAttemptDto"];

export class CommerceRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null) {
    super(code ?? "COMMERCE_REQUEST_FAILED");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function expectData<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    throw new CommerceRequestError(response.status, code);
  } catch (error) {
    if (error instanceof CommerceRequestError) throw error;
    throw new CommerceRequestError(0);
  }
}

export const listCommerceProducts = (query?: { page?: number; pageSize?: number; query?: string; categoryId?: string }) =>
  expectData<components["schemas"]["PatientCommerceProductPageDto"]>(apiClient.GET("/v1/commerce/products", { params: { query } }));

export const getCommerceProduct = (productId: string) =>
  expectData<CommerceProduct>(apiClient.GET("/v1/commerce/products/{productId}", { params: { path: { productId } } }));

export const getCommerceCart = (accessToken: string) =>
  expectData<CommerceCart>(apiClient.GET("/v1/patients/me/cart", { headers: authorization(accessToken) }));

export const updateCommerceCart = (accessToken: string, skuId: string, quantity: number) =>
  expectData<CommerceCart>(apiClient.PUT("/v1/patients/me/cart", { headers: authorization(accessToken), body: { skuId, quantity } }));

export const getCommerceWishlist = (accessToken: string) =>
  expectData<CommerceWishlist>(apiClient.GET("/v1/patients/me/wishlist", { headers: authorization(accessToken) }));

export const updateCommerceWishlist = (accessToken: string, skuId: string, saved: boolean) =>
  expectData<CommerceWishlist>(apiClient.PUT("/v1/patients/me/wishlist", { headers: authorization(accessToken), body: { skuId, saved } }));

export const getCommerceAddresses = (accessToken: string) =>
  expectData<CommerceAddress[]>(apiClient.GET("/v1/patients/me/commerce/addresses", { headers: authorization(accessToken) }));

export const createCommerceAddress = (accessToken: string, body: components["schemas"]["CreateCommerceAddressDto"]) =>
  expectData<CommerceAddress>(apiClient.POST("/v1/patients/me/commerce/addresses", { headers: authorization(accessToken), body }));

export const getCommerceShippingOptions = (accessToken: string) =>
  expectData<CommerceShippingOption[]>(apiClient.GET("/v1/patients/me/commerce/shipping-options", { headers: authorization(accessToken) }));

export const checkoutCommerceOrder = (accessToken: string, idempotencyKey: string, body: components["schemas"]["CheckoutCommerceOrderDto"]) =>
  expectData<CommerceOrder>(apiClient.POST("/v1/patients/me/orders", { headers: { ...authorization(accessToken), "idempotency-key": idempotencyKey }, body }));

export const getCommerceOrders = (accessToken: string) =>
  expectData<CommerceOrder[]>(apiClient.GET("/v1/patients/me/orders", { headers: authorization(accessToken) }));

export const getCommerceOrder = (accessToken: string, orderId: string) =>
  expectData<CommerceOrder>(apiClient.GET("/v1/patients/me/orders/{orderId}", { headers: authorization(accessToken), params: { path: { orderId } } }));

export const getCommerceReceipt = (accessToken: string, orderId: string) =>
  expectData<CommerceReceipt>(apiClient.GET("/v1/patients/me/orders/{orderId}/receipt", { headers: authorization(accessToken), params: { path: { orderId } } }));

export const createPaymentAttempt = (accessToken: string, orderId: string, idempotencyKey: string) =>
  expectData<PaymentAttempt>(apiClient.POST("/v1/patients/me/orders/{orderId}/payment-attempts", { headers: { ...authorization(accessToken), "idempotency-key": idempotencyKey }, params: { path: { orderId } } }));

export const getPaymentAttempt = (accessToken: string, attemptId: string) =>
  expectData<PaymentAttempt>(apiClient.GET("/v1/patients/me/payment-attempts/{attemptId}", { headers: authorization(accessToken), params: { path: { attemptId } } }));

export function commerceErrorMessage(error: unknown) {
  if (!(error instanceof CommerceRequestError) || error.status === 0) return "سرویس فروشگاه در دسترس نیست؛ دوباره تلاش کنید.";
  if (error.code === "COMMERCE_INVENTORY_INSUFFICIENT") return "موجودی یک یا چند کالای سبد کافی نیست؛ سبد را بررسی کنید.";
  if (error.code === "COMMERCE_CART_EMPTY") return "سبد خرید شما خالی است.";
  if (error.code === "COMMERCE_SKU_NOT_FOUND") return "یکی از کالاهای سبد دیگر در دسترس نیست؛ سبد را بررسی کنید.";
  if (error.code === "SHIPPING_METHOD_UNAVAILABLE") return "روش ارسال انتخاب‌شده در دسترس نیست.";
  if (error.code === "IDEMPOTENCY_KEY_REUSED") return "این درخواست با اطلاعات دیگری قبلاً ثبت شده است؛ صفحه را تازه‌سازی کنید.";
  if (error.status === 401) return "نشست شما منقضی شده است؛ دوباره وارد حساب شوید.";
  if (error.status === 403) return "اجازهٔ انجام این عملیات فروشگاه را ندارید.";
  if (error.status === 404) return "این محصول دیگر در دسترس نیست.";
  if (error.status === 422) return "مقدار واردشده معتبر نیست.";
  return "درخواست فروشگاه انجام نشد؛ دوباره تلاش کنید.";
}
