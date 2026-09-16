import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";
import { apiClient } from "@/lib/api";

export type PaymentProviderConfig = components["schemas"]["PaymentProviderConfigDto"];
export class PaymentProviderApiError extends Error { constructor(public readonly status: number) { super("Payment provider request failed."); } }
const headers = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });
async function result<T>(request: Promise<{ data?: T; response: Response }>) { try { const { data, response } = await withRequestTimeout(request); if (!response.ok || !data) throw new PaymentProviderApiError(response.status); return data; } catch (error) { if (error instanceof PaymentProviderApiError) throw error; throw new PaymentProviderApiError(0); } }
export const listPaymentProviders = (accessToken: string) => result<PaymentProviderConfig[]>(apiClient.GET("/v1/admin/commerce/payment-providers", { headers: headers(accessToken) }));
export const createPaymentProviderRevision = (accessToken: string, providerCode: string, credential: Record<string, string>, idempotencyKey: string) => result<PaymentProviderConfig>(apiClient.POST("/v1/admin/commerce/payment-providers/{providerCode}/config-revisions", { headers: { ...headers(accessToken), "idempotency-key": idempotencyKey }, params: { path: { providerCode } }, body: { credential } }));
