import { afterEach, describe, expect, it, vi } from 'vitest';
import { GatewayTransportError, PaymentGatewayDiagnosticsService } from '../src/modules/commerce/payments/payment-gateway-diagnostics.service';
import { FetchSadadTransport } from '../src/modules/commerce/payments/sadad-payment-provider.adapter';

const attemptId = 'ed135196-6d4a-42aa-82da-eb2f108e3cf2';
function fixture(billing: boolean) {
  const prisma = {
    billingGatewayAttempt: { findUnique: vi.fn().mockResolvedValue(billing ? { id: attemptId } : null) },
    paymentAttempt: { findUnique: vi.fn().mockResolvedValue({ id: attemptId }) },
    auditEvent: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
  return { prisma, service: new PaymentGatewayDiagnosticsService(prisma as never) };
}

describe('secret-free payment diagnostics (verification deferred until owner review)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('persists the exact provider rejection without accepting raw error messages or credentials', async () => {
    const { service, prisma } = fixture(true);
    await service.record(42n, 'REQUEST', Date.now(), '112');
    const success = prisma.auditEvent.create.mock.calls[0][0].data;
    expect(success.metadata).toMatchObject({ source: 'BILLING', resultCode: '112', outcome: 'REJECTED' });
    await service.record(42n, 'VERIFY', Date.now(), undefined, new Error('secret-terminal-key-and-token'));
    const error = prisma.auditEvent.create.mock.calls[1][0].data;
    expect(error.metadata).toMatchObject({ outcome: 'ERROR', errorKind: 'PROTOCOL_OR_CONFIGURATION', resultCode: null });
    expect(JSON.stringify(error)).not.toContain('secret-terminal-key-and-token');
  });

  it('links legacy browser callbacks while preserving their untrusted outcome', async () => {
    const { service, prisma } = fixture(false);
    await service.record(42n, 'CALLBACK', Date.now(), '0');
    expect(prisma.auditEvent.create.mock.calls[0][0].data).toMatchObject({ subjectId: attemptId, metadata: { source: 'COMMERCE', stage: 'CALLBACK', outcome: 'RECEIVED' } });
  });

  it('records HTTP errors using only their safe classification', async () => {
    const { service, prisma } = fixture(true);
    await service.record(42n, 'REQUEST', Date.now(), undefined, new GatewayTransportError('HTTP', 503));
    expect(prisma.auditEvent.create.mock.calls[0][0].data.metadata).toMatchObject({ httpStatus: 503, errorKind: 'HTTP' });
  });

  it('never fetches audit events when the scoped attempt is absent', async () => {
    const { service, prisma } = fixture(true);
    await expect(service.detail('00000000-0000-4000-8000-000000000001', 'sadad', 'BILLING', attemptId)).rejects.toMatchObject({ status: 404 });
    expect(prisma.auditEvent.findMany).not.toHaveBeenCalled();
  });

  it('does not expose the HTTP response body through transport exceptions', async () => {
    const text = vi.fn().mockResolvedValue('sensitive-bank-response');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503, text } as unknown as Response);
    await expect(new FetchSadadTransport().postJson({ endpoint: 'https://example.invalid', body: {}, timeoutMs: 1000 })).rejects.toMatchObject({ kind: 'HTTP', httpStatus: 503, message: 'Payment transport failed' });
    expect(text).not.toHaveBeenCalled();
  });
});
