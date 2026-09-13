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

export const listCommerceProducts = (accessToken: string, query?: { page?: number; pageSize?: number; query?: string; categoryId?: string }) =>
  expectData<components["schemas"]["PatientCommerceProductPageDto"]>(apiClient.GET("/v1/commerce/products", { headers: authorization(accessToken), params: { query } }));

export const getCommerceProduct = (accessToken: string, productId: string) =>
  expectData<CommerceProduct>(apiClient.GET("/v1/commerce/products/{productId}", { headers: authorization(accessToken), params: { path: { productId } } }));

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
  if (error.status === 401 || error.status === 403) return "اجازهٔ دسترسی به فروشگاه را ندارید.";
  if (error.status === 404) return "این محصول دیگر در دسترس نیست.";
  if (error.status === 422) return "مقدار واردشده معتبر نیست.";
  return "درخواست فروشگاه انجام نشد؛ دوباره تلاش کنید.";
}
