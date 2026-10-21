import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type AdminBillingIntent = components["schemas"]["AdminBillingIntentDto"];
export type BillingIntentPage = components["schemas"]["BillingIntentPageDto"];
export type BillingReconciliationItem = components["schemas"]["BillingReconciliationItemDto"];
export type BillingReconciliationPage = components["schemas"]["BillingReconciliationPageDto"];
export type BillingSummary = components["schemas"]["BillingSummaryDto"];
export type BillingRefund = components["schemas"]["BillingRefundDto"];
export type BillingGatewayAttempt = components["schemas"]["BillingGatewayAttemptDto"];

export type BillingIntentPurpose = "TOPUP" | "ORDER" | "APPOINTMENT";
export type BillingIntentStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "COMPENSATED";

export type BillingIntentsQuery = {
  page?: number;
  pageSize?: number;
  patientId?: string;
  purpose?: BillingIntentPurpose;
  status?: BillingIntentStatus;
};

export class BillingApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super(code ?? "BILLING_REQUEST_FAILED");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

/** The billing endpoints document the idempotency header twice (two casings). */
const idempotentHeader = (key: string) => ({ "idempotency-key": key, "Idempotency-Key": key });

async function result<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    throw new BillingApiError(response.status, code);
  } catch (error) {
    if (error instanceof BillingApiError) throw error;
    throw new BillingApiError(0);
  }
}

export const getBillingSummary = (accessToken: string) =>
  result<BillingSummary>(apiClient.GET("/v1/admin/billing/summary", { headers: authorization(accessToken) }));

export const listBillingIntents = (accessToken: string, query: BillingIntentsQuery = {}) =>
  result<BillingIntentPage>(
    apiClient.GET("/v1/admin/billing/intents", {
      headers: authorization(accessToken),
      params: { query: { page: 1, pageSize: 20, ...query } as never },
    }),
  );

export const getBillingIntent = (accessToken: string, intentId: string) =>
  result<AdminBillingIntent>(
    apiClient.GET("/v1/admin/billing/intents/{id}", {
      headers: authorization(accessToken),
      params: { path: { id: intentId } },
    }),
  );

export const listBillingReconciliation = (accessToken: string, page = 1, pageSize = 20) =>
  result<BillingReconciliationPage>(
    apiClient.GET("/v1/admin/billing/reconciliation", {
      headers: authorization(accessToken),
      params: { query: { page, pageSize } as never },
    }),
  );

export const refundBillingIntent = (accessToken: string, intentId: string, body: { amountRial: string; reason: string }, idempotencyKey: string) =>
  result<BillingRefund>(
    apiClient.POST("/v1/admin/billing/intents/{id}/refunds", {
      headers: authorization(accessToken),
      params: { path: { id: intentId }, header: idempotentHeader(idempotencyKey) },
      body,
    }),
  );

export const completeBillingRefund = (accessToken: string, refundId: string, evidenceReference: string, idempotencyKey: string) =>
  result<BillingRefund>(
    apiClient.POST("/v1/admin/billing/refunds/{id}/complete", {
      headers: authorization(accessToken),
      params: { path: { id: refundId }, header: idempotentHeader(idempotencyKey) },
      body: { evidenceReference },
    }),
  );

export const retryBillingAttempt = (accessToken: string, attemptId: string, idempotencyKey: string) =>
  result<BillingGatewayAttempt>(
    apiClient.POST("/v1/admin/billing/attempts/{id}/retry", {
      headers: authorization(accessToken),
      params: { path: { id: attemptId }, header: idempotentHeader(idempotencyKey) },
    }),
  );

export const resolveBillingAttemptFailed = (accessToken: string, attemptId: string, evidenceReference: string, idempotencyKey: string) =>
  result<BillingGatewayAttempt>(
    apiClient.POST("/v1/admin/billing/attempts/{id}/resolve-failed", {
      headers: authorization(accessToken),
      params: { path: { id: attemptId }, header: idempotentHeader(idempotencyKey) },
      body: { evidenceReference },
    }),
  );

export function billingAdminErrorMessage(error: unknown): string {
  if (!(error instanceof BillingApiError) || error.status === 0) return "ارتباط با سرویس صورتحساب برقرار نشد؛ دوباره تلاش کنید.";
  switch (error.code) {
    case "BILLING_REFUND_EXCEEDS_PAYMENT":
      return "مبلغ بازپرداخت از مبلغ وصول‌شده منهای بازپرداخت‌های قبلی بیشتر است.";
    case "BILLING_STATE_CONFLICT":
      return "وضعیت این پرداخت تغییر کرده است؛ صفحه را تازه‌سازی کنید.";
    case "BILLING_INTENT_NOT_FOUND":
      return "این پرداخت یافت نشد.";
    case "PAYMENT_VERIFICATION_MISMATCH":
      return "مبلغ یا شناسهٔ تراکنش بانکی با تلاش اصلی هم‌خوان نیست.";
    case "IDEMPOTENCY_KEY_REUSED":
      return "این عملیات با کلید تکراری ارسال شده است؛ صفحه را تازه‌سازی کنید.";
    case "REFUND_MANUAL_EVIDENCE_REQUIRED":
      return "برای تکمیل بازپرداخت بانکی، مرجع غیرحساس انتقال لازم است.";
    default:
      break;
  }
  if (error.status === 401) return "نشست شما منقضی شده است؛ دوباره وارد حساب شوید.";
  if (error.status === 403) return "اجازهٔ انجام این عملیات مالی را ندارید.";
  if (error.status === 422) return "اطلاعات واردشده معتبر نیست.";
  return "عملیات صورتحساب انجام نشد؛ دوباره تلاش کنید.";
}
