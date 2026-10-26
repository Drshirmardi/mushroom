import { createApiClient } from "@sabz-zendegi/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { adjustAdminWallet, createAdminAppointmentIntent, getAdminWallet, listAdminWalletTransactions, setAdminWalletStatus, WalletApiError } from "./patient-wallet-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test", apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }) }));

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const PATIENT = "11111111-1111-4111-8111-111111111111";

describe("patient wallet API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("reads the patient wallet summary with the bearer token", async () => {
    fetchMock.mockResolvedValueOnce(response({ patientId: PATIENT, currency: "IRR", balanceRial: "1250000", version: 3, frozen: false, asOf: "2026-10-16T10:00:00.000Z" }));
    const summary = await getAdminWallet("token", PATIENT);
    expect(summary.balanceRial).toBe("1250000");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname, request.headers.get("authorization")]).toEqual(["GET", `/v1/admin/patients/${PATIENT}/wallet`, "Bearer token"]);
  });

  it("paginates the admin transaction list with actor/reason projection", async () => {
    fetchMock.mockResolvedValueOnce(response({ page: 1, pageSize: 20, total: 1, items: [] }));
    await listAdminWalletTransactions("token", PATIENT, 1, 20);
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).pathname).toBe(`/v1/admin/patients/${PATIENT}/wallet/transactions`);
    expect(new URL(request.url).searchParams.get("page")).toBe("1");
    expect(new URL(request.url).searchParams.get("pageSize")).toBe("20");
  });

  it("submits a versioned adjustment with a stable idempotency key", async () => {
    fetchMock.mockResolvedValueOnce(response({ patientId: PATIENT, currency: "IRR", beforeRial: "0", balanceRial: "500000", deltaRial: "500000", version: 4, journalId: null }, 201));
    await adjustAdminWallet("token", PATIENT, { type: "CREDIT", amountToman: "50000", expectedVersion: 3, reason: "شارژ دستی" }, "adj-key");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname, request.headers.get("idempotency-key")]).toEqual(["POST", `/v1/admin/patients/${PATIENT}/wallet/adjustments`, "adj-key"]);
    await expect(request.json()).resolves.toEqual({ type: "CREDIT", amountToman: "50000", expectedVersion: 3, reason: "شارژ دستی" });
  });

  it("freezes and unfreezes the wallet through the status endpoint", async () => {
    fetchMock.mockResolvedValueOnce(response({ frozen: true, version: 4 }, 201));
    await setAdminWalletStatus("token", PATIENT, { frozen: true, reason: "بررسی", expectedVersion: 3 }, "status-key");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname]).toEqual(["POST", `/v1/admin/patients/${PATIENT}/wallet/status`]);
    await expect(request.json()).resolves.toEqual({ frozen: true, reason: "بررسی", expectedVersion: 3 });
  });

  it("creates an appointment intent for the patient", async () => {
    fetchMock.mockResolvedValueOnce(response({ id: "intent-1", purpose: "APPOINTMENT", status: "PENDING", amountRial: "9000" }, 201));
    await createAdminAppointmentIntent("token", PATIENT, { doctorServiceId: "svc-1", startsAt: "2026-11-01T08:00:00.000Z" }, "appt-key");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect([request.method, new URL(request.url).pathname]).toEqual(["POST", `/v1/admin/patients/${PATIENT}/wallet/appointment-intents`]);
    await expect(request.json()).resolves.toEqual({ doctorServiceId: "svc-1", startsAt: "2026-11-01T08:00:00.000Z" });
  });

  it("preserves the stable backend error code", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "WALLET_VERSION_CONFLICT", message: "conflict", details: {} }, 409));
    const error = await adjustAdminWallet("token", PATIENT, { type: "DEBIT", amountToman: "1", expectedVersion: 1, reason: "x" }, "k").catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(WalletApiError);
    expect(error).toMatchObject({ status: 409, code: "WALLET_VERSION_CONFLICT" });
  });
});
