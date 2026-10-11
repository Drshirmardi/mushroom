import { describe, expect, it, vi } from 'vitest';
import { PaymentAttemptService } from '../src/modules/commerce/payments/payment-attempt.service';
import type { PaymentProviderPort } from '../src/modules/commerce/payments/payment-provider.port';
import { SadadRuntimeConfigService } from '../src/modules/commerce/payments/sadad-runtime-config.service';

const liveValues = {
  SADAD_TRANSPORT_MODE: 'live', SADAD_REQUEST_TIMEOUT_MS: 4000,
  PUBLIC_API_URL: 'https://dev-api.example.test/',
  SADAD_RETURN_URL: 'https://dev-api.example.test/v1/payments/providers/sadad/callback',
  SADAD_RESULT_URL: 'https://dev-app.example.test/store/order-success', SADAD_REDIRECT_PROFILE: 'PHP_VPG_PURCHASE',
};
const runtime = (values: Record<string, unknown>) => new SadadRuntimeConfigService({ get: (key: string, fallback?: unknown) => values[key] ?? fallback, getOrThrow: (key: string) => { if (!(key in values)) throw new Error(`missing ${key}`); return values[key]; } } as never);
const provider: PaymentProviderPort = {
  descriptor: { code: 'sadad', displayName: 'Sadad', capabilities: { createPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', parseCallback: 'SUPPORTED_WHEN_GO_LIVE_READY', verifyPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', sandbox: 'UNSUPPORTED', inquiry: 'UNSUPPORTED', webhook: 'UNSUPPORTED', refund: 'UNSUPPORTED', partialRefund: 'UNSUPPORTED' } },
  async createPayment() { return { providerResultCode: '0', token: 'provider-token', redirectUrl: 'https://sadad.shaparak.ir/VPG/Purchase?Token=provider-token' }; },
  parseCallback() { return { providerOrderId: 42n, token: 'provider-token', resultCode: '0' }; },
  async verifyPayment() { return { resultCode: '0', providerOrderId: 42n, amount: 1_000n }; },
};

const attempt = { id: 'attempt-id', orderId: 'order-id', providerOrderId: 42n, status: 'REDIRECT_READY', commerceAmountToman: 100n, providerAmount: 1_000n, providerUnit: 'RIAL', providerToken: 'provider-token' };
const revision = { id: 'revision-id', goLiveReady: true, providerUnit: 'RIAL', credentialVersion: { encryptedPayload: Buffer.from('cipher'), encryptionNonce: Buffer.from('nonce'), authenticationTag: Buffer.from('tag'), encryptionKeyVersion: 'v1' } };

function service(overrides: { config?: unknown; callbackAttempts?: unknown[] } = {}) {
  const callbackAttempts = [...(overrides.callbackAttempts ?? [])];
  const prisma = {
    patientProfile: { findUnique: vi.fn().mockResolvedValue({ id: 'patient-id' }) },
    commerceOrder: { findFirst: vi.fn().mockResolvedValue({ id: 'order-id', clinicId: 'clinic-id', totalAmountToman: 100n }) },
    paymentProviderConfig: { findFirst: vi.fn().mockResolvedValue(overrides.config === undefined ? { providerCode: 'sadad', activeRevision: revision } : overrides.config) },
    paymentAttempt: { findFirst: vi.fn().mockResolvedValue({ ...attempt, providerConfigRevision: { config: { providerCode: 'sadad' } } }), findUnique: vi.fn().mockImplementation(async () => callbackAttempts.shift()), findUniqueOrThrow: vi.fn().mockImplementation(async () => callbackAttempts.shift()) },
  };
  const orchestration = { createAttempt: vi.fn().mockResolvedValue(attempt), processCallback: vi.fn().mockResolvedValue(attempt), verifyAttempt: vi.fn().mockResolvedValue({}), retryTimedOutVerify: vi.fn().mockResolvedValue({}) };
  const crypto = { decrypt: vi.fn().mockReturnValue({ merchantId: 'm', terminalId: 't', terminalKey: 'k' }) };
  const registry = { resolve: vi.fn().mockReturnValue(provider) };
  return { instance: new PaymentAttemptService(prisma as never, registry as never, orchestration as never, crypto as never, runtime(liveValues)), orchestration, crypto };
}

describe('Sadad live runtime wiring', () => {
  it('requires an explicit live deployment and exposes only validated operational settings', () => {
    expect(() => runtime({ SADAD_TRANSPORT_MODE: 'disabled' }).settings()).toThrowError(expect.objectContaining({ response: expect.objectContaining({ code: 'SADAD_GO_LIVE_BLOCKED' }) }));
    expect(runtime(liveValues).settings()).toEqual({ returnUrl: liveValues.SADAD_RETURN_URL, resultUrl: liveValues.SADAD_RESULT_URL, redirectProfile: liveValues.SADAD_REDIRECT_PROFILE, timeoutMs: 4000 });
    expect(() => runtime({ ...liveValues, SADAD_RETURN_URL: 'https://wrong.example.test/v1/payments/providers/sadad/callback' }).settings()).toThrowError(expect.objectContaining({ response: expect.objectContaining({ code: 'SADAD_GO_LIVE_BLOCKED' }) }));
  });

  it('creates a real provider-bound attempt only from an enabled/default ready configuration', async () => {
    const active = service();
    await expect(active.instance.createForOrder('user-id', 'order-id', 'idempotency-key')).resolves.toMatchObject({ id: 'attempt-id', redirectUrl: 'https://sadad.shaparak.ir/VPG/Purchase?Token=provider-token' });
    expect(active.orchestration.createAttempt).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'patient-id', orderId: 'order-id', providerConfigRevisionId: 'revision-id', providerAmount: 1_000n, providerUnit: 'RIAL', returnUrl: liveValues.SADAD_RETURN_URL, redirectProfile: liveValues.SADAD_REDIRECT_PROFILE, requestTimeoutMs: 4_000 }));
    const inactive = service({ config: null });
    await expect(inactive.instance.createForOrder('user-id', 'order-id', 'idempotency-key')).rejects.toMatchObject({ response: { code: 'SADAD_GO_LIVE_BLOCKED' } });
  });

  it('verifies a previously created callback even after administrative disablement', async () => {
    const verifying = { ...attempt, status: 'VERIFYING', providerConfigRevision: { config: { providerCode: 'sadad', enabled: false }, credentialVersion: revision.credentialVersion } };
    const verified = { ...verifying, status: 'VERIFIED' };
    const active = service({ callbackAttempts: [verifying, verified] });
    await expect(active.instance.processSadadCallback({ OrderId: '42', Token: 'provider-token', ResCode: '0' })).resolves.toEqual({ redirectUrl: 'https://dev-app.example.test/store/order-success?orderId=order-id', status: 'VERIFIED' });
    expect(active.orchestration.processCallback).toHaveBeenCalledWith({ providerOrderId: 42n, token: 'provider-token', resultCode: '0' });
    expect(active.orchestration.verifyAttempt).toHaveBeenCalledWith(expect.objectContaining({ attemptId: 'attempt-id', providerUnit: 'RIAL' }));
    expect(active.crypto.decrypt).toHaveBeenCalledOnce();
  });

  it('retries Verify on the same attempt after an ambiguous timeout callback replay', async () => {
    const timedOut = { ...attempt, status: 'REQUIRES_RECONCILIATION', providerResultCode: 'TIMEOUT', providerConfigRevision: { config: { providerCode: 'sadad', enabled: false }, credentialVersion: revision.credentialVersion } };
    const verified = { ...timedOut, status: 'VERIFIED' };
    const active = service({ callbackAttempts: [timedOut, verified] });
    await active.instance.processSadadCallback({ OrderId: '42', Token: 'provider-token', ResCode: '0' });
    expect(active.orchestration.retryTimedOutVerify).toHaveBeenCalledWith(expect.objectContaining({ attemptId: 'attempt-id', providerUnit: 'RIAL' }));
    expect(active.orchestration.verifyAttempt).not.toHaveBeenCalled();
  });
});
