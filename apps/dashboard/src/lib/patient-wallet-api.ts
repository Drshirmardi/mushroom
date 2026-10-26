import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type AdminWalletSummary = components["schemas"]["WalletSummaryDto"];
export type AdminWalletTransaction = components["schemas"]["WalletTransactionDto"];
export type AdminWalletTransactionPage = components["schemas"]["WalletTransactionPageDto"];
export type AdminWalletAdjustment = components["schemas"]["WalletAdjustmentDto"];
export type AdminWalletAdjustmentResult = components["schemas"]["WalletAdjustmentResultDto"];
export type AdminWalletStatus = components["schemas"]["WalletStatusDto"];
export type AdminWalletStatusResult = components["schemas"]["WalletStatusResultDto"];
export type BillingIntent = components["schemas"]["BillingIntentDto"];
export type DoctorService = components["schemas"]["DoctorServiceResponseDto"];

export class WalletApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super(code ?? "WALLET_REQUEST_FAILED");
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
    throw new WalletApiError(response.status, code);
  } catch (error) {
    if (error instanceof WalletApiError) throw error;
    throw new WalletApiError(0);
  }
}

export const getAdminWallet = (accessToken: string, patientId: string) =>
  result<AdminWalletSummary>(
    apiClient.GET("/v1/admin/patients/{patientId}/wallet", { headers: authorization(accessToken), params: { path: { patientId } } }),
  );

export const listAdminWalletTransactions = (accessToken: string, patientId: string, page = 1, pageSize = 20) =>
  result<AdminWalletTransactionPage>(
    apiClient.GET("/v1/admin/patients/{patientId}/wallet/transactions", {
      headers: authorization(accessToken),
      params: { path: { patientId }, query: { page, pageSize } as never },
    }),
  );

export const adjustAdminWallet = (accessToken: string, patientId: string, body: AdminWalletAdjustment, idempotencyKey: string) =>
  result<AdminWalletAdjustmentResult>(
    apiClient.POST("/v1/admin/patients/{patientId}/wallet/adjustments", {
      headers: authorization(accessToken),
      params: { path: { patientId }, header: idempotentHeader(idempotencyKey) },
      body,
    }),
  );

export const setAdminWalletStatus = (accessToken: string, patientId: string, body: AdminWalletStatus, idempotencyKey: string) =>
  result<AdminWalletStatusResult>(
    apiClient.POST("/v1/admin/patients/{patientId}/wallet/status", {
      headers: authorization(accessToken),
      params: { path: { patientId }, header: idempotentHeader(idempotencyKey) },
      body,
    }),
  );

export const createAdminAppointmentIntent = (accessToken: string, patientId: string, body: components["schemas"]["BillingAppointmentIntentDto"], idempotencyKey: string) =>
  result<BillingIntent>(
    apiClient.POST("/v1/admin/patients/{patientId}/wallet/appointment-intents", {
      headers: authorization(accessToken),
      params: { path: { patientId }, header: idempotentHeader(idempotencyKey) },
      body,
    }),
  );

export const listDoctorServicesForBooking = (accessToken: string) =>
  result<components["schemas"]["DoctorServicePageResponseDto"]>(
    apiClient.GET("/v1/admin/doctor-services", {
      headers: authorization(accessToken),
      params: { query: { page: 1, pageSize: 50 } as never },
    }),
  );

export function walletAdminErrorMessage(error: unknown): string {
  if (!(error instanceof WalletApiError) || error.status === 0) return "ارتباط با سرویس کیف پول برقرار نشد؛ دوباره تلاش کنید.";
  switch (error.code) {
    case "WALLET_INSUFFICIENT_FUNDS":
      return "موجودی قابل استفاده کافی نیست؛ کاهش بیش از موجودی مجاز نیست.";
    case "WALLET_FROZEN":
      return "کیف پول بیمار مسدود است و قابل خرج نیست.";
    case "WALLET_VERSION_CONFLICT":
      return "موجودی کیف پول در فاصلهٔ نمایش و ثبت تغییر کرد؛ تازه‌سازی کنید و دوباره تصمیم بگیرید.";
    case "IDEMPOTENCY_KEY_REUSED":
      return "این عملیات با کلید تکراری ارسال شده است؛ صفحه را تازه‌سازی کنید.";
    case "BOOKING_INELIGIBLE":
      return "شرایط رزرو این بیمار برای این نوبت برقرار نیست.";
    case "APPOINTMENT_SLOT_UNAVAILABLE":
      return "این زمان برای خدمت انتخاب‌شده در دسترس نیست.";
    case "APPOINTMENT_SLOT_CONFLICT":
      return "این زمان با نوبت یا رزرو موقت دیگری تداخل دارد.";
    case "BILLING_STATE_CONFLICT":
      return "وضعیت این پرداخت تغییر کرده است؛ صفحه را تازه‌سازی کنید.";
    default:
      break;
  }
  if (error.status === 401) return "نشست شما منقضی شده است؛ دوباره وارد حساب شوید.";
  if (error.status === 403) return "اجازهٔ انجام این عملیات مالی را ندارید.";
  if (error.status === 404) return "بیمار یا کیف پول پیدا نشد.";
  if (error.status === 422) return "اطلاعات واردشده معتبر نیست.";
  return "عملیات کیف پول انجام نشد؛ دوباره تلاش کنید.";
}
