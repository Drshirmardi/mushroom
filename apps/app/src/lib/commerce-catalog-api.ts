import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "./api";

export type CommerceProduct = components["schemas"]["PatientCommerceProductDto"];
export type CommerceCart = components["schemas"]["PatientCartDto"];
export type CommerceWishlist = components["schemas"]["PatientWishlistDto"];

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

export function commerceErrorMessage(error: unknown) {
  if (!(error instanceof CommerceRequestError) || error.status === 0) return "سرویس فروشگاه در دسترس نیست؛ دوباره تلاش کنید.";
  if (error.status === 401 || error.status === 403) return "اجازهٔ دسترسی به فروشگاه را ندارید.";
  if (error.status === 404) return "این محصول دیگر در دسترس نیست.";
  if (error.status === 422) return "مقدار واردشده معتبر نیست.";
  return "درخواست فروشگاه انجام نشد؛ دوباره تلاش کنید.";
}
