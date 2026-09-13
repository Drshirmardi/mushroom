import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";
import { apiClient } from "@/lib/api";
export type CommerceRevenue = components["schemas"]["CommerceRevenueDto"];
export class CommerceRevenueApiError extends Error { constructor(public readonly status: number) { super("Commerce revenue request failed."); } }
export async function getCommerceRevenue(accessToken: string, query: { from?: string; to?: string; granularity?: "DAY" | "MONTH" } = {}): Promise<CommerceRevenue> { try { const { data, response } = await withRequestTimeout(apiClient.GET("/v1/admin/commerce/revenue", { headers: { authorization: `Bearer ${accessToken}` }, params: { query } })); if (!response.ok || !data) throw new CommerceRevenueApiError(response.status); return data; } catch (error) { if (error instanceof CommerceRevenueApiError) throw error; throw new CommerceRevenueApiError(0); } }
