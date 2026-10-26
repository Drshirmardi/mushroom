import { describe, expect, it } from "vitest";

import {
  billingMethodLabel,
  billingPurposeLabel,
  billingStatusLabel,
  intentResultView,
  isAmbiguousAttempt,
  isPendingStatus,
  transactionDirection,
  walletKindLabel,
} from "./wallet-labels";

describe("wallet presentation labels", () => {
  it("names each billing purpose, status and method in Persian", () => {
    expect(billingPurposeLabel("TOPUP")).toBe("شارژ کیف پول");
    expect(billingPurposeLabel("ORDER")).toBe("پرداخت سفارش");
    expect(billingPurposeLabel("APPOINTMENT")).toBe("پرداخت نوبت");
    expect(billingPurposeLabel("SOMETHING_NEW")).toBe("پرداخت");
    expect(billingStatusLabel("PENDING")).toBe("در انتظار پرداخت");
    expect(billingStatusLabel("PAID")).toBe("پرداخت‌شده");
    expect(billingMethodLabel("WALLET")).toBe("کیف پول");
    expect(billingMethodLabel("GATEWAY")).toBe("درگاه بانکی");
    expect(billingMethodLabel("FREE")).toBe("رایگان");
    expect(billingMethodLabel(null)).toBe("—");
  });

  it("names ledger transaction kinds", () => {
    expect(walletKindLabel("TOPUP")).toBe("شارژ کیف پول");
    expect(walletKindLabel("PAYMENT")).toBe("پرداخت از کیف پول");
    expect(walletKindLabel("ADMIN_CREDIT")).toBe("افزایش توسط مدیریت");
    expect(walletKindLabel("ADMIN_DEBIT")).toBe("کاهش توسط مدیریت");
    expect(walletKindLabel("REFUND")).toBe("بازگشت وجه به کیف پول");
    expect(walletKindLabel("UNKNOWN")).toBe("گردش مالی");
  });

  it("derives credit, debit and no-op direction from the signed IRR delta", () => {
    expect(transactionDirection("125000")).toBe("credit");
    expect(transactionDirection("-125000")).toBe("debit");
    expect(transactionDirection("0")).toBe("none");
  });

  it("flags pending and ambiguous states", () => {
    expect(isPendingStatus("PENDING")).toBe(true);
    expect(isPendingStatus("PAID")).toBe(false);
    expect(isAmbiguousAttempt("REQUIRES_RECONCILIATION")).toBe(true);
    expect(isAmbiguousAttempt("VERIFYING")).toBe(true);
    expect(isAmbiguousAttempt("CALLBACK_RECEIVED")).toBe(true);
    expect(isAmbiguousAttempt("FAILED")).toBe(false);
    expect(isAmbiguousAttempt("VERIFIED")).toBe(false);
  });

  it("resolves the authoritative result view and never assumes success from an unknown state", () => {
    expect(intentResultView({ status: "PAID" })).toBe("paid");
    expect(intentResultView({ status: "COMPENSATED" })).toBe("compensated");
    expect(intentResultView({ status: "CANCELLED" })).toBe("closed");
    expect(intentResultView({ status: "EXPIRED" })).toBe("closed");
    expect(intentResultView({ status: "PENDING" })).toBe("pending");
    expect(intentResultView({ status: "PENDING", attempts: [{ status: "FAILED" }] })).toBe("failed");
    expect(intentResultView({ status: "PENDING", attempts: [{ status: "REQUIRES_RECONCILIATION" }] })).toBe("ambiguous");
    expect(intentResultView({ status: "PENDING", attempts: [{ status: "REDIRECT_READY" }] })).toBe("pending");
    expect(intentResultView({ status: "SOMETHING_ELSE" })).toBe("pending");
  });
});
