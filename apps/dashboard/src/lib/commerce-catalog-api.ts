import { createApiClient, type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

type ApiClient = ReturnType<typeof createApiClient>;

export type CommerceCategory = components["schemas"]["CommerceCategoryResponseDto"];
export type CommerceProduct = components["schemas"]["CommerceProductResponseDto"];
export type CommerceSku = components["schemas"]["CommerceSkuResponseDto"];
export type CommerceCatalogData = { categories: CommerceCategory[]; products: CommerceProduct[] };
export type CommerceCourierShippingRate = components["schemas"]["CommerceCourierShippingRateDto"];
export type CommerceCatalogState =
  | { status: "ready"; data: CommerceCatalogData }
  | { status: "unauthorized" }
  | { status: "unavailable" }
  | { status: "error" };

export class CommerceCatalogApiError extends Error {
  constructor(public readonly status: number) {
    super("Commerce catalog request failed.");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function dataOrThrow<T>(request: Promise<{ data?: T; response: Response }>): Promise<T> {
  try {
    const { data, response } = await withRequestTimeout(request);
    if (!response.ok || !data) throw new CommerceCatalogApiError(response.status);
    return data;
  } catch (error) {
    if (error instanceof CommerceCatalogApiError) throw error;
    throw new CommerceCatalogApiError(0);
  }
}

export async function loadCommerceCatalog(client: ApiClient, accessToken: string): Promise<CommerceCatalogState> {
  try {
    const headers = authorization(accessToken);
    const [categories, products] = await Promise.all([
      dataOrThrow<CommerceCategory[]>(client.GET("/v1/admin/commerce/categories", { headers })),
      dataOrThrow<components["schemas"]["CommercePageResponseDto"]>(client.GET("/v1/admin/commerce/products", { headers, params: { query: { page: 1, pageSize: 100 } } })),
    ]);
    return { status: "ready", data: { categories, products: products.items } };
  } catch (error) {
    const status = error instanceof CommerceCatalogApiError ? error.status : 0;
    if (status === 401 || status === 403) return { status: "unauthorized" };
    if (status === 0 || status === 503 || status === 504) return { status: "unavailable" };
    return { status: "error" };
  }
}

export const createCommerceCategory = (accessToken: string, body: components["schemas"]["CreateCommerceCategoryDto"]) =>
  dataOrThrow<CommerceCategory>(apiClient.POST("/v1/admin/commerce/categories", { headers: authorization(accessToken), body }));
export const updateCommerceCategory = (accessToken: string, categoryId: string, body: components["schemas"]["UpdateCommerceCategoryDto"]) =>
  dataOrThrow<CommerceCategory>(apiClient.PATCH("/v1/admin/commerce/categories/{categoryId}", { headers: authorization(accessToken), params: { path: { categoryId } }, body }));
export const createCommerceProduct = (accessToken: string, body: components["schemas"]["CreateCommerceProductDto"]) =>
  dataOrThrow<CommerceProduct>(apiClient.POST("/v1/admin/commerce/products", { headers: authorization(accessToken), body }));
export const updateCommerceProduct = (accessToken: string, productId: string, body: components["schemas"]["UpdateCommerceProductDto"]) =>
  dataOrThrow<CommerceProduct>(apiClient.PATCH("/v1/admin/commerce/products/{productId}", { headers: authorization(accessToken), params: { path: { productId } }, body }));
export const createCommerceSku = (accessToken: string, productId: string, body: components["schemas"]["CreateCommerceSkuDto"]) =>
  dataOrThrow<CommerceSku>(apiClient.POST("/v1/admin/commerce/products/{productId}/skus", { headers: authorization(accessToken), params: { path: { productId } }, body }));
export const updateCommerceSku = (accessToken: string, skuId: string, body: components["schemas"]["UpdateCommerceSkuDto"]) =>
  dataOrThrow<CommerceSku>(apiClient.PATCH("/v1/admin/commerce/skus/{skuId}", { headers: authorization(accessToken), params: { path: { skuId } }, body }));
export const updateCommerceInventory = (accessToken: string, skuId: string, onHandQuantity: number) =>
  dataOrThrow<{ skuId: string; onHandQuantity: number; reservedQuantity: number }>(apiClient.PATCH("/v1/admin/commerce/skus/{skuId}/inventory", { headers: authorization(accessToken), params: { path: { skuId } }, body: { onHandQuantity } }));

export const getCommerceCourierShippingRate = (accessToken: string) =>
  dataOrThrow<CommerceCourierShippingRate>(apiClient.GET("/v1/admin/commerce/shipping-rates/courier", { headers: authorization(accessToken) }));

export const updateCommerceCourierShippingRate = (accessToken: string, body: components["schemas"]["UpdateCourierShippingRateDto"]) =>
  dataOrThrow<CommerceCourierShippingRate>(apiClient.PATCH("/v1/admin/commerce/shipping-rates/courier", { headers: authorization(accessToken), body }));
