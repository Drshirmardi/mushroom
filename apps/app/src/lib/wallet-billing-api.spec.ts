import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ apiClient: { GET: vi.fn(), POST: vi.fn() } }));

import { apiClient } from "./api";
import {
  WalletRequestError,
  cancelBillingIntent,
  createAppointmentIntent,
  createGatewayAttempt,
  createOrderIntent,
  createTopupIntent,
  getBillingIntent,
  getWalletSummary,
  listWalletTransactions,
  payWithWallet,
  walletErrorMessage,
} from "./wallet-billing-api";

const response = (status = 200) => new Response(null, { status });

describe("wallet billing API adapter", () => {
  afterEach(() => vi.clearAllMocks());

  it("reads the patient wallet summary with the bearer token and keeps IRR strings intact", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({
      data: { patientId: "p1", currency: "IRR", balanceRial: "1250000", version: 3, frozen: false, asOf: "2026-10-16T00:00:00.000Z" },
      response: response(),
    } as never);
    const summary = await getWalletSummary("access-token");
    expect(summary.balanceRial).toBe("1250000");
    expect(apiClient.GET).toHaveBeenCalledWith("/v1/patients/me/wallet", { headers: { authorization: "Bearer access-token" } });
  });

  it("paginates the transaction list and never sends a non-integer amount", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({ data: { page: 2, pageSize: 20, total: 1, items: [] }, response: response() } as never);
    await listWalletTransactions("access-token", 2, 20);
    expect(apiClient.GET).toHaveBeenCalledWith("/v1/patients/me/wallet/transactions", {
      headers: { authorization: "Bearer access-token" },
      params: { query: { page: 2, pageSize: 20 } },
    });
  });

  it("creates a top-up intent from an integer TOMAN amount with a stable idempotency key", async () => {
    vi.mocked(apiClient.POST).mockResolvedValue({ data: { id: "intent-1", purpose: "TOPUP", status: "PENDING", amountRial: "500000", currency: "IRR" }, response: response(201) } as never);
    const intent = await createTopupIntent("access-token", BigInt(50000), "topup-key");
    expect(intent.amountRial).toBe("500000");
    expect(apiClient.POST).toHaveBeenCalledWith("/v1/patients/me/wallet/topups", {
      headers: { authorization: "Bearer access-token" },
      params: { header: { "idempotency-key": "topup-key", "Idempotency-Key": "topup-key" } },
      body: { amountToman: "50000" },
    });
  });

  it("creates order and appointment intents bound to their server-owned targets", async () => {
    const orderId = "11111111-1111-4111-8111-111111111111";
    vi.mocked(apiClient.POST).mockResolvedValue({ data: { id: "intent-2", purpose: "ORDER", status: "PENDING", amountRial: "100" }, response: response(201) } as never);
    await createOrderIntent("access-token", orderId, "order-key");
    expect(apiClient.POST).toHaveBeenCalledWith("/v1/patients/me/billing/order-intents", {
      headers: { authorization: "Bearer access-token" },
      params: { header: { "idempotency-key": "order-key", "Idempotency-Key": "order-key" } },
      body: { orderId },
    });
    vi.mocked(apiClient.POST).mockResolvedValue({ data: { id: "intent-3", purpose: "APPOINTMENT", status: "PENDING", amountRial: "9000" }, response: response(201) } as never);
    await createAppointmentIntent("access-token", { doctorServiceId: "service-1", startsAt: "2026-11-01T08:00:00.000Z" }, "appt-key");
    expect(apiClient.POST).toHaveBeenCalledWith("/v1/patients/me/billing/appointment-intents", {
      headers: { authorization: "Bearer access-token" },
      params: { header: { "idempotency-key": "appt-key", "Idempotency-Key": "appt-key" } },
      body: { doctorServiceId: "service-1", startsAt: "2026-11-01T08:00:00.000Z" },
    });
  });

  it("loads, cancels, pays with the wallet and opens the gateway for an owned intent", async () => {
    vi.mocked(apiClient.GET).mockResolvedValue({ data: { id: "intent-1", purpose: "TOPUP", status: "PENDING", amountRial: "500000", methods: [] }, response: response() } as never);
    await getBillingIntent("access-token", "intent-1");
    expect(apiClient.GET).toHaveBeenCalledWith("/v1/patients/me/billing/intents/{id}", {
      headers: { authorization: "Bearer access-token" },
      params: { path: { id: "intent-1" } },
    });

    vi.mocked(apiClient.POST).mockResolvedValue({ data: { id: "intent-1", status: "CANCELLED" }, response: response(201) } as never);
    await cancelBillingIntent("access-token", "intent-1", "cancel-key");
    expect(apiClient.POST).toHaveBeenCalledWith("/v1/patients/me/billing/intents/{id}/cancel", {
      headers: { authorization: "Bearer access-token" },
      params: { path: { id: "intent-1" }, header: { "idempotency-key": "cancel-key", "Idempotency-Key": "cancel-key" } },
    });

    vi.mocked(apiClient.POST).mockResolvedValue({ data: { id: "intent-1", status: "PAID", method: "WALLET" }, response: response(201) } as never);
    await payWithWallet("access-token", "intent-1", "pay-key");
    expect(apiClient.POST).toHaveBeenCalledWith("/v1/patients/me/billing/intents/{id}/wallet-payment", {
      headers: { authorization: "Bearer access-token" },
      params: { path: { id: "intent-1" }, header: { "idempotency-key": "pay-key", "Idempotency-Key": "pay-key" } },
    });

    vi.mocked(apiClient.POST).mockResolvedValue({ data: { id: "attempt-1", intentId: "intent-1", status: "REDIRECT_READY", amountRial: "500000", currency: "IRR", redirectUrl: "https://sadad.shaparak.ir/VPG/Purchase?Token=x" }, response: response(201) } as never);
    await createGatewayAttempt("access-token", "intent-1", "attempt-key");
    expect(apiClient.POST).toHaveBeenCalledWith("/v1/patients/me/billing/intents/{id}/gateway-attempts", {
      headers: { authorization: "Bearer access-token" },
      params: { path: { id: "intent-1" }, header: { "idempotency-key": "attempt-key", "Idempotency-Key": "attempt-key" } },
    });
  });

  it("maps stable billing error codes to actionable patient messages", () => {
    expect(walletErrorMessage(new WalletRequestError(409, "WALLET_INSUFFICIENT_FUNDS"))).toContain("موجودی کیف پول کافی نیست");
    expect(walletErrorMessage(new WalletRequestError(409, "WALLET_FROZEN"))).toContain("مسدود");
    expect(walletErrorMessage(new WalletRequestError(409, "WALLET_VERSION_CONFLICT"))).toContain("تغییر کرده");
    expect(walletErrorMessage(new WalletRequestError(409, "BILLING_STATE_CONFLICT"))).toContain("تغییر کرده");
    expect(walletErrorMessage(new WalletRequestError(409, "BILLING_PAYMENT_PENDING"))).toContain("در جریان");
    expect(walletErrorMessage(new WalletRequestError(409, "BILLING_HOLD_EXPIRED"))).toContain("مهلت");
    expect(walletErrorMessage(new WalletRequestError(409, "APPOINTMENT_PAYMENT_REQUIRED"))).toContain("پرداخت کامل");
    expect(walletErrorMessage(new WalletRequestError(409, "IDEMPOTENCY_KEY_REUSED"))).toContain("قبلاً ثبت شده");
    expect(walletErrorMessage(new WalletRequestError(503, "SADAD_GO_LIVE_BLOCKED"))).toContain("درگاه");
    expect(walletErrorMessage(new WalletRequestError(401))).toContain("نشست");
    expect(walletErrorMessage(new WalletRequestError(403))).toContain("اجازه");
    expect(walletErrorMessage(new WalletRequestError(0))).toContain("در دسترس نیست");
  });
});
