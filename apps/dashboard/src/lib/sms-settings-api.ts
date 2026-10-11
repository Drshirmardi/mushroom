import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";
import { apiClient } from "@/lib/api";

export type SmsProvider = components["schemas"]["SmsProviderConfigDto"];
export type OtpPolicy = components["schemas"]["OtpPolicyDto"];
export type SmsAttempt = components["schemas"]["SmsDeliveryAttemptDto"];
export class SmsSettingsApiError extends Error { constructor(public status: number, public code: string | null) { super(code ?? "SMS_SETTINGS_REQUEST_FAILED"); } }
const headers = (token: string) => ({ authorization: `Bearer ${token}` });
async function result<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>) { const { data, error, response } = await withRequestTimeout(request); const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null; if (!response.ok || !data) throw new SmsSettingsApiError(response.status, code); return data; }
export const listSmsProviders = (token: string) => result<SmsProvider[]>(apiClient.GET("/v1/admin/sms/providers", { headers: headers(token) }));
export const saveSmsProvider = (token: string, providerCode: string, config: Record<string, string>, credential?: Record<string, string>) => result<SmsProvider>(apiClient.POST("/v1/admin/sms/providers/{providerCode}/revisions", { headers: { ...headers(token), "idempotency-key": crypto.randomUUID() }, params: { path: { providerCode } }, body: { config, ...(credential ? { credential } : {}) } }));
export const updateSmsProvider = (token: string, providerCode: string, body: components["schemas"]["UpdateSmsProviderStateDto"]) => result<SmsProvider>(apiClient.PATCH("/v1/admin/sms/providers/{providerCode}", { headers: headers(token), params: { path: { providerCode } }, body }));
export const testSmsConnection = (token: string, providerCode: string) => result<unknown>(apiClient.POST("/v1/admin/sms/providers/{providerCode}/test-connection", { headers: headers(token), params: { path: { providerCode } } }));
export const sendTestSms = (token: string, providerCode: string, phone: string) => result<unknown>(apiClient.POST("/v1/admin/sms/providers/{providerCode}/test-message", { headers: headers(token), params: { path: { providerCode } }, body: { phone } }));
export const getOtpPolicy = (token: string) => result<OtpPolicy>(apiClient.GET("/v1/admin/sms/otp-policy", { headers: headers(token) }));
export const updateOtpPolicy = (token: string, body: components["schemas"]["UpdateOtpPolicyDto"]) => result<OtpPolicy>(apiClient.PATCH("/v1/admin/sms/otp-policy", { headers: headers(token), body }));
export const listSmsAttempts = (token: string) => result<SmsAttempt[]>(apiClient.GET("/v1/admin/sms/delivery-attempts", { headers: headers(token) }));
