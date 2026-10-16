import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "./api";

export type WalletSummary = components["schemas"]["WalletSummaryDto"];
export type WalletTransaction = components["schemas"]["WalletTransactionDto"];
export type WalletTransactionPage = components["schemas"]["WalletTransactionPageDto"];
export type BillingIntent = components["schemas"]["BillingIntentDto"];
export type BillingPaymentMethod = components["schemas"]["BillingPaymentMethodDto"];
export type BillingGatewayAttempt = components["schemas"]["BillingGatewayAttemptDto"];

export class WalletRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super(code ?? "WALLET_REQUEST_FAILED");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

/**
 * The billing endpoints document the idempotency header twice (two casings).
 * `Headers` normalizes casing, so the transport emits a single header.
 */
const idempotentHeader = (key: string) => ({ "idempotency-key": key, "Idempotency-Key": key });

async function expectData<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    throw new WalletRequestError(response.status, code);
  } catch (error) {
    if (error instanceof WalletRequestError) throw error;
    throw new WalletRequestError(0);
  }
}

export const getWalletSummary = (accessToken: string) =>
  expectData<WalletSummary>(apiClient.GET("/v1/patients/me/wallet", { headers: authorization(accessToken) }));

export const listWalletTransactions = (accessToken: string, page = 1, pageSize = 20) =>
  expectData<WalletTransactionPage>(
    apiClient.GET("/v1/patients/me/wallet/transactions", {
      headers: authorization(accessToken),
      params: { query: { page, pageSize } as unknown as Record<string, never> },
    }),
  );

export const createTopupIntent = (accessToken: string, amountToman: bigint, idempotencyKey: string) =>
  expectData<BillingIntent>(
    apiClient.POST("/v1/patients/me/wallet/topups", {
      headers: authorization(accessToken),
      params: { header: idempotentHeader(idempotencyKey) },
      body: { amountToman: amountToman.toString() },
    }),
  );

export const createOrderIntent = (accessToken: string, orderId: string, idempotencyKey: string) =>
  expectData<BillingIntent>(
    apiClient.POST("/v1/patients/me/billing/order-intents", {
      headers: authorization(accessToken),
      params: { header: idempotentHeader(idempotencyKey) },
      body: { orderId },
    }),
  );

export const createAppointmentIntent = (
  accessToken: string,
  body: { doctorServiceId: string; startsAt: string },
  idempotencyKey: string,
) =>
  expectData<BillingIntent>(
    apiClient.POST("/v1/patients/me/billing/appointment-intents", {
      headers: authorization(accessToken),
      params: { header: idempotentHeader(idempotencyKey) },
      body,
    }),
  );

export const getBillingIntent = (accessToken: string, intentId: string) =>
  expectData<BillingIntent>(
    apiClient.GET("/v1/patients/me/billing/intents/{id}", {
      headers: authorization(accessToken),
      params: { path: { id: intentId } },
    }),
  );

export const cancelBillingIntent = (accessToken: string, intentId: string, idempotencyKey: string) =>
  expectData<BillingIntent>(
    apiClient.POST("/v1/patients/me/billing/intents/{id}/cancel", {
      headers: authorization(accessToken),
      params: { path: { id: intentId }, header: idempotentHeader(idempotencyKey) },
    }),
  );

export const payWithWallet = (accessToken: string, intentId: string, idempotencyKey: string) =>
  expectData<BillingIntent>(
    apiClient.POST("/v1/patients/me/billing/intents/{id}/wallet-payment", {
      headers: authorization(accessToken),
      params: { path: { id: intentId }, header: idempotentHeader(idempotencyKey) },
    }),
  );

export const createGatewayAttempt = (accessToken: string, intentId: string, idempotencyKey: string) =>
  expectData<BillingGatewayAttempt>(
    apiClient.POST("/v1/patients/me/billing/intents/{id}/gateway-attempts", {
      headers: authorization(accessToken),
      params: { path: { id: intentId }, header: idempotentHeader(idempotencyKey) },
    }),
  );

/** Whether an intent can still be paid, cancelled or watched for a result. */
export const isIntentPending = (intent: BillingIntent) => intent.status === "PENDING";

/** Whether the intent already reached a terminal, settled state. */
export const isIntentPaid = (intent: BillingIntent) => intent.status === "PAID" || intent.status === "COMPENSATED";

/** Whether the intent ended without creating its target and cannot be paid. */
export const isIntentClosed = (intent: BillingIntent) => ["CANCELLED", "EXPIRED"].includes(intent.status);

/** The wallet method advertised by the server for this intent, if any. */
export const walletMethod = (intent: BillingIntent): BillingPaymentMethod | null =>
  intent.methods?.find((method) => method.code === "WALLET") ?? null;

/** The gateway method advertised by the server for this intent, if any. */
export const gatewayMethod = (intent: BillingIntent): BillingPaymentMethod | null =>
  intent.methods?.find((method) => method.code === "GATEWAY") ?? null;

export function walletErrorMessage(error: unknown): string {
  if (!(error instanceof WalletRequestError) || error.status === 0) return "سرویس کیف پول در دسترس نیست؛ دوباره تلاش کنید.";
  switch (error.code) {
    case "WALLET_INSUFFICIENT_FUNDS":
      return "موجودی کیف پول کافی نیست؛ مبلغ کمتری انتخاب کنید یا کیف پول را شارژ کنید.";
    case "WALLET_FROZEN":
      return "کیف پول شما موقتاً برای خرج مسدود شده است؛ با پشتیبانی تماس بگیرید.";
    case "WALLET_VERSION_CONFLICT":
      return "موجودی کیف پول تغییر کرده است؛ صفحه را تازه‌سازی کنید و دوباره تصمیم بگیرید.";
    case "BILLING_STATE_CONFLICT":
      return "وضعیت این پرداخت تغییر کرده است؛ صفحه را تازه‌سازی کنید.";
    case "BILLING_PAYMENT_PENDING":
      return "یک پرداخت بانکی برای این مورد در جریان است؛ تا مشخص‌شدن نتیجهٔ آن پرداخت دیگری امکان‌پذیر نیست.";
    case "BILLING_HOLD_EXPIRED":
      return "مهلت رزرو این مورد به پایان رسیده است؛ لطفاً دوباره زمان یا خرید را آغاز کنید.";
    case "BILLING_INTENT_NOT_FOUND":
      return "این پرداخت یافت نشد یا در دسترس نیست.";
    case "APPOINTMENT_PAYMENT_REQUIRED":
      return "برای ثبت این نوبت، ابتدا پرداخت کامل لازم است.";
    case "IDEMPOTENCY_KEY_REUSED":
      return "این درخواست با اطلاعات دیگری قبلاً ثبت شده است؛ صفحه را تازه‌سازی کنید.";
    case "SADAD_GO_LIVE_BLOCKED":
      return "درگاه پرداخت بانکی هنوز فعال نیست؛ از روش کیف پول استفاده کنید یا بعداً تلاش کنید.";
    case "BILLING_RATE_LIMITED":
      return "تعداد درخواست‌ها زیاد بوده است؛ چند لحظه صبر کنید و دوباره تلاش کنید.";
    default:
      break;
  }
  if (error.status === 401) return "نشست شما منقضی شده است؛ دوباره وارد حساب شوید.";
  if (error.status === 403) return "اجازهٔ انجام این عملیات مالی را ندارید.";
  if (error.status === 422) return "مقدار واردشده معتبر نیست.";
  return "درخواست کیف پول انجام نشد؛ دوباره تلاش کنید.";
}
