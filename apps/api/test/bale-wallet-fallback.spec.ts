import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { BillingGatewayService } from '../src/modules/billing/billing-gateway.service';

function makeService(status: string, baleTransactionId: string | null) {
  const intent = {
    id: 'intent-1', clinicId: 'clinic-1', purpose: 'TOPUP',
    status: 'PENDING', expiresAt: null, amountRial: 100000n, orderId: null,
  };
  const active = {
    status, baleTransactionId,
    revision: { config: { providerCode: 'bale_wallet' } },
  };
  const prisma = {
    paymentProviderConfig: { findFirst: vi.fn().mockResolvedValue({ id: 'sadad-config' }) },
    billingGatewayAttempt: { findFirst: vi.fn().mockResolvedValue(active) },
  };
  const billing = { owned: vi.fn().mockResolvedValue(intent) };
  const wallet = {
    patient: vi.fn().mockResolvedValue({ id: 'patient-1' }),
    summary: vi.fn().mockResolvedValue({ frozen: false, balanceRial: '0' }),
  };
  const runtime = { live: true, settings: vi.fn().mockReturnValue({}) };
  const bale = { available: vi.fn().mockResolvedValue(false) };
  const service = new BillingGatewayService(
    prisma as never, billing as never, {} as never, {} as never,
    {} as never, {} as never, runtime as never, wallet as never, bale as never, new ConfigService(),
  );
  return service;
}

describe('Sadad fallback for native Bale invoices', () => {
  it.each(['CREATED', 'REDIRECT_READY', 'REQUIRES_RECONCILIATION'])(
    'permits bank fallback while Bale %s has no approved transaction',
    async status => {
      const methods = await makeService(status, null).methods('patient-user', 'intent-1', 'session-1');
      expect(methods.find(m => m.code === 'GATEWAY')?.available).toBe(true);
    },
  );

  it.each(['VERIFYING', 'REQUIRES_RECONCILIATION'])(
    'blocks bank fallback after Bale %s is bound to a transaction',
    async status => {
      const methods = await makeService(status, 'bale-transaction-1').methods('patient-user', 'intent-1', 'session-1');
      expect(methods.find(m => m.code === 'GATEWAY')?.available).toBe(false);
    },
  );
});
