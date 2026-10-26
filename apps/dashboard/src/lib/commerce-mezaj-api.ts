import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";
import { apiClient } from "./api";
export type MezajCollection = components["schemas"]["CommerceMezajCollectionDto"];
export type MezajVersionPage = components["schemas"]["CommerceMezajVersionPageDto"];
export type MezajSave = components["schemas"]["SaveCommerceMezajDto"];
export type MezajProductPage = components["schemas"]["CommercePageResponseDto"];
export class MezajConfigError extends Error { constructor(public status: number) { super("Mezaj configuration request failed"); } }
async function data<T>(request: Promise<{ data?: T; response: Response }>): Promise<T> {
  try { const r = await withRequestTimeout(request); if (r.response.ok && r.data) return r.data; throw new MezajConfigError(r.response.status); }
  catch (e) { if (e instanceof MezajConfigError) throw e; throw new MezajConfigError(0); }
}
const headers = (token: string) => ({ authorization: `Bearer ${token}` });
export const getMezajCollections = (token: string) => data<MezajCollection[]>(apiClient.GET("/v1/admin/commerce/mezaj/collections", { headers: headers(token), cache: "no-store" }));
export const getMezajVersions = (token: string, page: number) => data<MezajVersionPage>(apiClient.GET("/v1/admin/commerce/mezaj/assessment-versions", { headers: headers(token), params: { query: { page } } }));
export const saveMezajCollection = (token: string, pair: Pick<MezajCollection, "primary" | "secondary">, body: MezajSave) => data<MezajCollection>(apiClient.PUT("/v1/admin/commerce/mezaj/collections/{primary}/{secondary}", { headers: headers(token), params: { path: pair }, body }));
export const searchMezajProducts = (token: string, query: string, page: number) => data<MezajProductPage>(apiClient.GET("/v1/admin/commerce/products", { headers: headers(token), params: { query: { status: "ACTIVE", query: query || undefined, page, pageSize: 20 } } }));
