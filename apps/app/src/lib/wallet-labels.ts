/**
 * Persian presentation labels for wallet / billing states.
 *
 * Kept pure and centralized so every surface (wallet, store, appointments,
 * result page) names the same state the same way.
 */

const PURPOSE_LABELS: Record<string, string> = {
  TOPUP: "شارژ کیف پول",
  ORDER: "پرداخت سفارش",
  APPOINTMENT: "پرداخت نوبت",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  EXPIRED: "منقضی‌شده",
  CANCELLED: "لغوشده",
  COMPENSATED: "جبران‌شده",
};

const METHOD_LABELS: Record<string, string> = {
  WALLET: "کیف پول",
  GATEWAY: "درگاه بانکی",
  FREE: "رایگان",
};

const TRANSACTION_KIND_LABELS: Record<string, string> = {
  TOPUP: "شارژ کیف پول",
  PAYMENT: "پرداخت از کیف پول",
  REFUND: "بازگشت وجه به کیف پول",
  ADMIN_CREDIT: "افزایش توسط مدیریت",
  ADMIN_DEBIT: "کاهش توسط مدیریت",
  LATE_PAYMENT_CREDIT: "جبران واریز دیرهنگام",
};

const ATTEMPT_STATUS_LABELS: Record<string, string> = {
  CREATED: "تلاش ایجاد شد",
  REDIRECT_READY: "در انتظار بازگشت از درگاه",
  CALLBACK_RECEIVED: "بازگشت از درگاه دریافت شد",
  VERIFYING: "در حال بررسی پرداخت",
  VERIFIED: "پرداخت تأیید شد",
  FAILED: "پرداخت ناموفق بود",
  REQUIRES_RECONCILIATION: "نیازمند بررسی",
};

export type TransactionDirection = "credit" | "debit" | "none";

export const billingPurposeLabel = (purpose: string): string => PURPOSE_LABELS[purpose] ?? "پرداخت";
export const billingStatusLabel = (status: string): string => STATUS_LABELS[status] ?? status;
export const billingMethodLabel = (method: string | null | undefined): string => (method ? METHOD_LABELS[method] ?? method : "—");
export const walletKindLabel = (kind: string): string => TRANSACTION_KIND_LABELS[kind] ?? "گردش مالی";
export const attemptStatusLabel = (status: string): string => ATTEMPT_STATUS_LABELS[status] ?? status;

/** Direction of a signed ledger delta; `none` is a no-op administrative record. */
export function transactionDirection(deltaRial: string): TransactionDirection {
  const value = BigInt(deltaRial);
  if (value > BigInt(0)) return "credit";
  if (value < BigInt(0)) return "debit";
  return "none";
}

/** Whether an intent status still permits a payment attempt or cancellation. */
export const isPendingStatus = (status: string) => status === "PENDING";

/** Whether the intent has an ambiguous bank outcome that must not be shown as success or failure. */
export function isAmbiguousAttempt(status: string): boolean {
  return status === "REQUIRES_RECONCILIATION" || status === "CALLBACK_RECEIVED" || status === "VERIFYING";
}

export type IntentResultView = "paid" | "pending" | "ambiguous" | "failed" | "closed" | "compensated";

/** Structural shape of the fields the result view reads, so this stays a pure helper. */
type ResultIntent = { status: string; attempts?: Array<{ status: string }> | null };

/**
 * Resolve the single authoritative view of an intent for the result page. An
 * unknown or in-flight state is explicitly *not* success or failure.
 */
export function intentResultView(intent: ResultIntent): IntentResultView {
  if (intent.status === "PAID") return "paid";
  if (intent.status === "COMPENSATED") return "compensated";
  if (intent.status === "CANCELLED" || intent.status === "EXPIRED") return "closed";
  const attempts = intent.attempts ?? [];
  if (attempts.some((attempt) => isAmbiguousAttempt(attempt.status))) return "ambiguous";
  if (attempts.some((attempt) => attempt.status === "FAILED")) return "failed";
  return "pending";
}
