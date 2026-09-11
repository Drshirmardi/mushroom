import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type CommerceDiscount = components["schemas"]["CommerceDiscountResponseDto"];
export type CommerceDiscountInput = components["schemas"]["CreateCommerceDiscountDto"];

export class CommerceDiscountApiError extends Error { constructor(public readonly status: number) { super("Commerce discount request failed."); } }

const headers = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });
async function result<T>(request: Promise<{ data?: T; response: Response }>): Promise<T> { try { const { data, response } = await withRequestTimeout(request); if (!response.ok || !data) throw new CommerceDiscountApiError(response.status); return data; } catch (error) { if (error instanceof CommerceDiscountApiError) throw error; throw new CommerceDiscountApiError(0); } }

export const listCommerceDiscounts = (accessToken: string) => result<CommerceDiscount[]>(apiClient.GET("/v1/admin/commerce/discounts", { headers: headers(accessToken) }));
export const createCommerceDiscount = (accessToken: string, body: CommerceDiscountInput) => result<CommerceDiscount>(apiClient.POST("/v1/admin/commerce/discounts", { headers: headers(accessToken), body }));
export const updateCommerceDiscount = (accessToken: string, discountId: string, body: components["schemas"]["UpdateCommerceDiscountDto"]) => result<CommerceDiscount>(apiClient.PATCH("/v1/admin/commerce/discounts/{discountId}", { headers: headers(accessToken), params: { path: { discountId } }, body }));
