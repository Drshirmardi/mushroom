import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";
import { apiBaseUrl, apiClient } from "@/lib/api";

export type PaymentProviderConfig = components["schemas"]["PaymentProviderConfigDto"];
export type GatewayRequest = components["schemas"]["PaymentGatewayRequestDto"];
export type GatewayRequestDetail = components["schemas"]["PaymentGatewayRequestDetailDto"];
export type GatewayRequestsPage = components["schemas"]["PaymentGatewayRequestsPageDto"];
export type GatewayRequestsQuery = { query?: string; status?: 'CREATED' | 'REDIRECT_READY' | 'CALLBACK_RECEIVED' | 'VERIFYING' | 'VERIFIED' | 'FAILED' | 'EXPIRED' | 'REQUIRES_RECONCILIATION'; from?: string; until?: string; page: number; pageSize: number };
export interface SadadCredential { merchantId: string; terminalId: string; terminalKey: string }
export class PaymentProviderApiError extends Error { constructor(public readonly status: number, public readonly code: string | null = null) { super(code ?? "PAYMENT_PROVIDER_REQUEST_FAILED"); } }
const headers = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });
async function result<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>) { try { const { data, error, response } = await withRequestTimeout(request); const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null; if (!response.ok || !data) throw new PaymentProviderApiError(response.status, code); return data; } catch (error) { if (error instanceof PaymentProviderApiError) throw error; throw new PaymentProviderApiError(0); } }
export const listPaymentProviders = (accessToken: string) => result<PaymentProviderConfig[]>(apiClient.GET("/v1/admin/commerce/payment-providers", { headers: headers(accessToken) }));
export const listGatewayRequests = (accessToken: string, providerCode: string, query: GatewayRequestsQuery) => result<GatewayRequestsPage>(apiClient.GET("/v1/admin/commerce/payment-providers/{providerCode}/requests", { headers: headers(accessToken), params: { path: { providerCode }, query } }));
export const getGatewayRequest = (accessToken: string, providerCode: string, source: string, attemptId: string) => result<GatewayRequestDetail>(apiClient.GET("/v1/admin/commerce/payment-providers/{providerCode}/requests/{source}/{attemptId}", { headers: headers(accessToken), params: { path: { providerCode, source, attemptId } } }));
export const createPaymentProviderRevision = (accessToken: string, providerCode: string, credential: SadadCredential, idempotencyKey: string) => result<PaymentProviderConfig>(apiClient.POST("/v1/admin/commerce/payment-providers/{providerCode}/config-revisions", { headers: { ...headers(accessToken), "idempotency-key": idempotencyKey }, params: { path: { providerCode } }, body: { credential } }));
export const updatePaymentProviderConfig = (accessToken: string, providerCode: string, body: components["schemas"]["UpdatePaymentProviderConfigDto"]) => result<PaymentProviderConfig>(apiClient.PATCH("/v1/admin/commerce/payment-providers/{providerCode}", { headers: headers(accessToken), params: { path: { providerCode } }, body }));

export function paymentProviderCallbackUrl(providerCode: string, publicApiUrl = apiBaseUrl): string {
  if (providerCode === "sadad" && typeof window !== "undefined") {
    const configured = window.__MUSHROOM_RUNTIME_CONFIG__?.sadadReturnUrl;
    if (configured) return configured;
  }
  const url = new URL(`/v1/payments/providers/${encodeURIComponent(providerCode)}/callback`, publicApiUrl);
  return url.toString();
}
