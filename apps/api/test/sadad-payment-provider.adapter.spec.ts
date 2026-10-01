import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { FetchSadadTransport, SADAD_ENDPOINTS, SADAD_MAX_INT64, SadadPaymentProviderAdapter, SimulatedSadadPaymentProviderAdapter, serializeSadadJson, type SadadJson, type SadadTransport } from '../src/modules/commerce/payments/sadad-payment-provider.adapter';
import { PaymentProviderRegistry } from '../src/modules/commerce/payments/payment-provider.registry';

const credential = { merchantId: 'synthetic-merchant', terminalId: '123456', terminalKey: Buffer.alloc(24, 7).toString('base64') };
const returnUrl = 'https://staging.example.test/v1/payments/providers/sadad/callback';

class SimulatedSadadTransport implements SadadTransport {
  readonly calls: Array<{ endpoint: string; body: SadadJson; timeoutMs: number }> = [];
  constructor(private readonly responses: unknown[]) {}
  async postJson(input: { endpoint: string; body: SadadJson; timeoutMs: number }) {
    this.calls.push(input);
    const response = this.responses.shift();
    if (response instanceof Error) throw response;
    return response;
  }
}

const localSadadTransport = async (responseBody: string) => {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    let body = ''; request.setEncoding('utf8'); request.on('data', (chunk: string) => { body += chunk; });
    request.on('end', () => { requests.push(body); response.writeHead(200, { 'content-type': 'application/json' }); response.end(responseBody); });
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('local Sadad test server has no TCP port');
  return {
    endpoint: `http://127.0.0.1:${address.port}/sadad`, requests,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
};

describe('Sadad payment provider adapter (simulated transport)', () => {
  it('serializes the frozen request, redirect, callback and Verify protocol without contacting Sadad', async () => {
    const transport = new SimulatedSadadTransport([
      { ResCode: '0', Token: 'synthetic-token' },
      { ResCode: '100', OrderId: '42', Amount: '1250000', RetrivalRefNo: 'synthetic-reference', SystemTraceNo: 'synthetic-trace' },
    ]);
    const adapter = new SimulatedSadadPaymentProviderAdapter(new PaymentProviderRegistry(), transport, () => new Date('2026-09-30T08:30:15.000Z'), 4_000);

    await expect(adapter.createPayment({ providerOrderId: 42n, commerceAmountToman: 125_000n, providerAmount: 1_250_000n, providerUnit: 'RIAL', credential, returnUrl, redirectProfile: 'DOTNET_PURCHASE_INDEX' })).resolves.toEqual({ providerResultCode: '0', token: 'synthetic-token', redirectUrl: 'https://sadad.shaparak.ir/Purchase/Index?token=synthetic-token' });
    expect(transport.calls[0]).toMatchObject({ endpoint: SADAD_ENDPOINTS.paymentRequest, timeoutMs: 4_000, body: { MerchantId: credential.merchantId, TerminalId: credential.terminalId, Amount: 1_250_000n, OrderId: 42n, ReturnUrl: returnUrl } });
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

  it('emits bounded financial values as unquoted JSON numbers and preserves an int64 Verify response through the local transport boundary', async () => {
    const local = await localSadadTransport('{"ResCode":"100","OrderId":9223372036854775807,"Amount":9007199254740993}');
    try {
      const transport = new FetchSadadTransport();
      const normalResponse = await transport.postJson({ endpoint: local.endpoint, timeoutMs: 4_000, body: { MerchantId: 'm', TerminalId: 't', Amount: 1_250_000n, OrderId: 42n } });
      const boundaryResponse = await transport.postJson({ endpoint: local.endpoint, timeoutMs: 4_000, body: { MerchantId: 'm', TerminalId: 't', Amount: SADAD_MAX_INT64, OrderId: SADAD_MAX_INT64 } });

      expect(local.requests).toEqual([
        '{"MerchantId":"m","TerminalId":"t","Amount":1250000,"OrderId":42}',
        '{"MerchantId":"m","TerminalId":"t","Amount":9223372036854775807,"OrderId":9223372036854775807}',
      ]);
      expect(JSON.stringify(local.requests)).not.toContain('"Amount":"');
      expect(normalResponse).toMatchObject({ OrderId: '9223372036854775807', Amount: '9007199254740993' });
      expect(boundaryResponse).toMatchObject({ OrderId: '9223372036854775807', Amount: '9007199254740993' });

      const verificationTransport = new SimulatedSadadTransport([boundaryResponse]);
      const adapter = new SimulatedSadadPaymentProviderAdapter(new PaymentProviderRegistry(), verificationTransport);
      await expect(adapter.verifyPayment({ token: 'synthetic-token', credential })).resolves.toMatchObject({ providerOrderId: SADAD_MAX_INT64, amount: 9_007_199_254_740_993n });
    } finally { await local.close(); }
  });

  it('rejects unsafe numeric coercion and out-of-range integer serialization before any fetch', () => {
    expect(() => serializeSadadJson({ Amount: SADAD_MAX_INT64 + 1n, OrderId: 1n })).toThrow();
    expect(() => serializeSadadJson({ Amount: Number.MAX_SAFE_INTEGER + 1, OrderId: 1n })).toThrow();
  });
});
