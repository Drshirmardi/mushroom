import { describe, expect, it } from 'vitest';
import { SADAD_ENDPOINTS, SadadPaymentProviderAdapter, SimulatedSadadPaymentProviderAdapter, type SadadTransport } from '../src/modules/commerce/payments/sadad-payment-provider.adapter';
import { PaymentProviderRegistry } from '../src/modules/commerce/payments/payment-provider.registry';

const credential = { merchantId: 'synthetic-merchant', terminalId: '123456', terminalKey: Buffer.alloc(24, 7).toString('base64') };
const returnUrl = 'https://staging.example.test/v1/payments/providers/sadad/callback';

class SimulatedSadadTransport implements SadadTransport {
  readonly calls: Array<{ endpoint: string; body: Record<string, string | number>; timeoutMs: number }> = [];
  constructor(private readonly responses: unknown[]) {}
  async postJson(input: { endpoint: string; body: Record<string, string | number>; timeoutMs: number }) {
    this.calls.push(input);
    const response = this.responses.shift();
    if (response instanceof Error) throw response;
    return response;
  }
}

describe('Sadad payment provider adapter (simulated transport)', () => {
  it('serializes the frozen request, redirect, callback and Verify protocol without contacting Sadad', async () => {
    const transport = new SimulatedSadadTransport([
      { ResCode: '0', Token: 'synthetic-token' },
      { ResCode: '100', OrderId: '42', Amount: '1250000', RetrivalRefNo: 'synthetic-reference', SystemTraceNo: 'synthetic-trace' },
    ]);
    const adapter = new SimulatedSadadPaymentProviderAdapter(new PaymentProviderRegistry(), transport, () => new Date('2026-09-30T08:30:15.000Z'), 4_000);

    await expect(adapter.createPayment({ providerOrderId: 42n, commerceAmountToman: 125_000n, providerAmount: 1_250_000n, providerUnit: 'RIAL', credential, returnUrl, redirectProfile: 'DOTNET_PURCHASE_INDEX' })).resolves.toEqual({ providerResultCode: '0', token: 'synthetic-token', redirectUrl: 'https://sadad.shaparak.ir/Purchase/Index?token=synthetic-token' });
    expect(transport.calls[0]).toMatchObject({ endpoint: SADAD_ENDPOINTS.paymentRequest, timeoutMs: 4_000, body: { MerchantId: credential.merchantId, TerminalId: credential.terminalId, Amount: '1250000', OrderId: '42', ReturnUrl: returnUrl } });
    expect(transport.calls[0]?.body.SignData).toEqual(expect.any(String));
    expect(adapter.parseCallback({ OrderId: '42', Token: 'synthetic-token', ResCode: '0', CardHolderFullName: 'must-not-be-persisted' })).toEqual({ providerOrderId: 42n, token: 'synthetic-token', resultCode: '0' });
    await expect(adapter.verifyPayment({ token: 'synthetic-token', credential })).resolves.toEqual({ resultCode: '100', providerOrderId: 42n, amount: 1_250_000n, referenceId: 'synthetic-reference', traceNumber: 'synthetic-trace' });
    expect(transport.calls[1]).toMatchObject({ endpoint: SADAD_ENDPOINTS.verify, timeoutMs: 4_000, body: { Token: 'synthetic-token' } });
    expect(JSON.stringify(transport.calls.map(({ endpoint, timeoutMs }) => ({ endpoint, timeoutMs })))).not.toContain(credential.terminalKey);
  });

  it('keeps non-success and malformed responses safe and retains the go-live block in the runtime construction', async () => {
    const transport = new SimulatedSadadTransport([{ ResCode: '1015' }, { ResCode: '-1' }, { ResCode: '0', Token: '' }]);
    const adapter = new SimulatedSadadPaymentProviderAdapter(new PaymentProviderRegistry(), transport);
    const input = { providerOrderId: 77n, commerceAmountToman: 1n, providerAmount: 10n, providerUnit: 'RIAL', credential, returnUrl, redirectProfile: 'PDF_PURCHASE' } as const;
    await expect(adapter.createPayment(input)).resolves.toEqual({ providerResultCode: '1015' });
    await expect(adapter.verifyPayment({ token: 'synthetic-token', credential })).resolves.toEqual({ resultCode: '-1' });
    await expect(adapter.createPayment(input)).rejects.toMatchObject({ response: { code: 'PAYMENT_PROVIDER_CONFIGURATION_INVALID' } });
    const runtime = new SadadPaymentProviderAdapter(new PaymentProviderRegistry());
    await expect(runtime.createPayment(input)).rejects.toMatchObject({ response: { code: 'SADAD_GO_LIVE_BLOCKED' } });
  });
});
