import { describe, expect, it } from 'vitest';
import { PaymentCredentialRetentionService } from '../src/modules/commerce/payments/payment-credential-retention.service';

describe('payment credential retention', () => {
  it('crypto-shreds only retired credentials after 90 days and only with terminal dependencies', async () => {
    const updates: unknown[] = [];
    const tx = { paymentProviderCredentialVersion: { findMany: async (query: unknown) => { expect(query).toMatchObject({ where: { status: 'RETIRED', revisions: { every: { activeForConfigs: { none: {} }, paymentAttempts: { every: { status: { in: ['VERIFIED', 'FAILED', 'EXPIRED', 'CANCELLED'] } } } } } } }); return [{ id: 'synthetic-id' }]; }, updateMany: async (query: unknown) => { updates.push(query); return { count: 1 }; } } };
    const now = new Date('2026-09-11T00:00:00.000Z');
    const service = new PaymentCredentialRetentionService({ $transaction: async (fn: (value: typeof tx) => Promise<number>) => fn(tx) } as never, { now: () => now } as never);
    expect(await service.shredDue()).toBe(1);
    expect(updates).toEqual([{ where: { id: 'synthetic-id', status: 'RETIRED' }, data: { status: 'CRYPTO_SHREDDED', encryptedPayload: null, encryptionNonce: null, authenticationTag: null, encryptionKeyVersion: null, cryptoShreddedAt: now } }]);
  });
});
