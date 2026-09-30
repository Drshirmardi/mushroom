import { describe, expect, it } from 'vitest';
import { PaymentCredentialCryptoService } from '../src/modules/commerce/payments/payment-credential-crypto.service';
import { PaymentProviderRegistry } from '../src/modules/commerce/payments/payment-provider.registry';
import { SADAD_ENDPOINTS, SADAD_REDIRECT_PROFILES, SadadPaymentProviderAdapter, buildDormantSadadRedirect, formatSadadLocalDateTime, parseSadadFormCallback, toSadadRial } from '../src/modules/commerce/payments/sadad-payment-provider.adapter';
import type { PaymentProviderPort } from '../src/modules/commerce/payments/payment-provider.port';
import { PaymentVerificationService } from '../src/modules/commerce/payments/payment-verification.service';

const syntheticKey = Buffer.alloc(32, 7).toString('base64');
const crypto = (key = syntheticKey) => new PaymentCredentialCryptoService({ get: (name: string, fallback?: string) => name === 'PAYMENT_CREDENTIAL_ENCRYPTION_KEY' ? key : fallback } as never);

class FakePaymentProvider implements PaymentProviderPort {
  readonly descriptor = { code: 'fake-test-only', displayName: 'Fake test provider', capabilities: { createPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', parseCallback: 'SUPPORTED_WHEN_GO_LIVE_READY', verifyPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', sandbox: 'UNSUPPORTED', inquiry: 'UNSUPPORTED', webhook: 'UNSUPPORTED', refund: 'UNSUPPORTED', partialRefund: 'UNSUPPORTED' } } as const;
  async createPayment(input: { providerOrderId: bigint }) { return { token: `fake-${input.providerOrderId}`, redirectUrl: 'http://127.0.0.1/fake-payment', providerResultCode: '0' }; }
  parseCallback() { return { providerOrderId: 1n, token: 'fake-1', resultCode: '0' }; }
  async verifyPayment() { return { resultCode: '0', providerOrderId: 1n, amount: 100n }; }
}

describe('payment provider contract', () => {
  it('resolves code-owned providers and rejects unknown or unsupported capability', () => {
    const registry = new PaymentProviderRegistry(); const sadad = new SadadPaymentProviderAdapter(registry); const fake = new FakePaymentProvider(); registry.register(fake);
    expect(registry.resolve('sadad')).toBe(sadad); expect(registry.resolve('fake-test-only')).toBe(fake); expect(registry.descriptors().map(({ code }) => code)).toEqual(['sadad', 'fake-test-only']); expect(() => registry.resolve('unknown')).toThrow(/not registered/u); expect(() => registry.require(sadad, 'refund')).toThrow(/not supported/u);
  });
  it('keeps Sadad network operations fail-closed while it is UNCONFIRMED', async () => {
    const registry = new PaymentProviderRegistry(); const sadad = new SadadPaymentProviderAdapter(registry);
    expect(SADAD_ENDPOINTS).toEqual({ paymentRequest: 'https://sadad.shaparak.ir/api/v0/Request/PaymentRequest', verify: 'https://sadad.shaparak.ir/api/v0/Advice/Verify' });
    await expect(sadad.createPayment({ providerOrderId: 1n, commerceAmountToman: 100n, providerAmount: 100n, providerUnit: 'UNCONFIRMED', credential: {} })).rejects.toMatchObject({ response: { code: 'PAYMENT_PROVIDER_CONFIGURATION_INVALID' } });
    expect(() => sadad.parseCallback({ OrderId: '1' })).toThrow(/protocol input or response is invalid/u);
  });
  it('encrypts credential values with a randomized nonce and authenticated decrypt', () => {
    const service = crypto(); const first = service.encrypt({ merchantId: 'synthetic', terminalKey: 'synthetic-key' }); const second = service.encrypt({ merchantId: 'synthetic', terminalKey: 'synthetic-key' });
    expect(first.ciphertext.equals(second.ciphertext)).toBe(false); expect(first.nonce.equals(second.nonce)).toBe(false); expect(service.decrypt({ encryptedPayload: first.ciphertext, encryptionNonce: first.nonce, authenticationTag: first.tag, encryptionKeyVersion: first.keyVersion })).toEqual({ merchantId: 'synthetic', terminalKey: 'synthetic-key' });
    expect(() => service.decrypt({ encryptedPayload: first.ciphertext, encryptionNonce: first.nonce, authenticationTag: Buffer.alloc(first.tag.length), encryptionKeyVersion: first.keyVersion })).toThrow(/cannot be authenticated/u);
  });
  it('fails closed when a master key is absent or malformed', () => {
    expect(() => crypto('').encrypt({ secret: 'synthetic' })).toThrow(/encryption is not configured/u); expect(() => crypto(Buffer.alloc(31).toString('base64')).encrypt({ secret: 'synthetic' })).toThrow(/encryption is not configured/u);
  });
  it('uses the frozen TripleDES request signature layout with synthetic input only', () => {
    const registry = new PaymentProviderRegistry(); const sadad = new SadadPaymentProviderAdapter(registry); const key = Buffer.alloc(24, 3).toString('base64');
    expect(sadad.signData('123', 456n, 789n, key)).toBe(sadad.signData('123', 456n, 789n, key)); expect(sadad.signData('123', 456n, 789n, key)).not.toBe(sadad.signData('123', 456n, 790n, key));
    expect(sadad.signVerifyToken('synthetic-token', key)).toBe(sadad.signVerifyToken('synthetic-token', key)); expect(sadad.signVerifyToken('synthetic-token', key)).not.toBe(sadad.signVerifyToken('other-token', key));
  });
  it('has deterministic dormant RIAL/date/redirect profiles without enabling Sadad', () => {
    expect(toSadadRial(1n)).toBe(10n); expect(() => toSadadRial(922337203685477581n)).toThrow(/protocol input or response is invalid/u); expect(formatSadadLocalDateTime(new Date('2026-01-01T08:30:15.000Z'))).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2}:\d{2} (AM|PM)$/u); expect(Object.keys(SADAD_REDIRECT_PROFILES)).toEqual(['PDF_PURCHASE', 'PHP_VPG_PURCHASE', 'DOTNET_PURCHASE_INDEX']); expect(buildDormantSadadRedirect('PHP_VPG_PURCHASE', 'synthetic token')).toBe('https://sadad.shaparak.ir/VPG/Purchase?Token=synthetic%20token');
  });
  it('parses only allowlisted Form Data and never retains PAN-like fields', () => {
    expect(parseSadadFormCallback({ OrderId: '42', Token: 'synthetic', ResCode: '0', PrimaryAccNo: '603799******0000', CardHolderFullName: 'private' })).toEqual({ providerOrderId: 42n, token: 'synthetic', resultCode: '0' }); expect(() => parseSadadFormCallback({ OrderId: 'not-number', Token: 'synthetic', ResCode: '0' })).toThrow(/protocol input or response is invalid/u);
  });
  it('records -1, 101 and timeout without creating a financial effect', async () => {
    const updates: unknown[] = []; const service = new PaymentVerificationService({} as never); const tx = { paymentAttempt: { updateMany: async (query: unknown) => { updates.push(query); return { count: 1 }; } } };
    await service.recordNonSuccess(tx as never, { attemptId: 'synthetic', resultCode: '-1', verifiedAt: new Date(0) }); await service.recordNonSuccess(tx as never, { attemptId: 'synthetic', resultCode: '101', verifiedAt: new Date(0) }); await service.recordNonSuccess(tx as never, { attemptId: 'synthetic', resultCode: 'TIMEOUT', verifiedAt: new Date(0) });
    expect(updates).toEqual(expect.arrayContaining([expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }), expect.objectContaining({ data: expect.objectContaining({ status: 'EXPIRED' }) }), expect.objectContaining({ data: expect.objectContaining({ status: 'REQUIRES_RECONCILIATION' }) })]));
  });
});
