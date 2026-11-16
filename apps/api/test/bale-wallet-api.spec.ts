import { describe, expect, it, vi } from 'vitest';
import { BaleWalletApi, parseBalePreCheckout, parseBaleSuccessfulPayment } from '../src/modules/commerce/payments/bale-wallet-api';

const botToken = '123456:synthetic-bot-token';
const reply = (result: unknown, ok = true) => ({ ok, result });
const jsonResponse = (value: unknown) => ({ ok: true, json: async () => value }) as Response;

describe('Bale wallet protocol (no real network access)', () => {
  it('creates a RIAL invoice without conversion and returns the exact invoice string', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(reply('invoice-param-opaque')));
    const client = new BaleWalletApi(botToken, fetcher);
    const token = await client.createInvoiceLink({
      providerToken: 'WALLET-TEST-1111111111111111', amountRial: 120000n,
      payload: 'billing:attempt-1', title: 'پرداخت دکتر شیرمردی', description: 'پرداخت خدمت',
    });
    expect(token).toBe('invoice-param-opaque');
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://tapi.bale.ai/bot123456:synthetic-bot-token/createInvoiceLink');
    expect(JSON.parse(options.body)).toEqual({
      provider_token: 'WALLET-TEST-1111111111111111',
      title: 'پرداخت دکتر شیرمردی', description: 'پرداخت خدمت', payload: 'billing:attempt-1',
      prices: [{ label: 'پرداخت دکتر شیرمردی', amount: 120000 }],
    });
  });

  it('refuses zero, unsafe amounts and payloads over 128 UTF-8 bytes before invoking the bot', async () => {
    const fetcher = vi.fn();
    const client = new BaleWalletApi(botToken, fetcher);
    const input = { providerToken: 'wallet-token', amountRial: 1n, payload: 'billing:1', title: 'خدمت', description: 'شرح' };
    await expect(client.createInvoiceLink({ ...input, amountRial: 0n })).rejects.toThrow();
    await expect(client.createInvoiceLink({ ...input, amountRial: BigInt(Number.MAX_SAFE_INTEGER) + 1n })).rejects.toThrow();
    await expect(client.createInvoiceLink({ ...input, payload: 'س'.repeat(65) })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects malformed provider responses without interpreting them as paid', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(reply({ url: 'wrong shape' })));
    const client = new BaleWalletApi(botToken, fetcher);
    await expect(client.createInvoiceLink({ providerToken: 'wallet', amountRial: 1n, payload: 'p', title: 't', description: 'd' })).rejects.toThrow();
  });

  it('answers pre-checkout with the exact transaction id and explicit decision', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(reply(true)));
    const client = new BaleWalletApi(botToken, fetcher);
    await expect(client.answerPreCheckoutQuery('pre-001', true)).resolves.toBeUndefined();
    const [, opts] = fetcher.mock.calls[0]!;
    expect(JSON.parse(opts.body)).toEqual({ pre_checkout_query_id: 'pre-001', ok: true });
  });

  it('accepts paid inquiry only when id, userID and amount are valid', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(reply({ id: 'pre-001', status: 'paid', userID: 456789, amount: 120000, createdAt: 10 })));
    const result = await new BaleWalletApi(botToken, fetcher).inquireTransaction('pre-001');
    expect(result).toEqual({ id: 'pre-001', status: 'paid', providerUserId: '456789', amountRial: 120000n });
    const [, opts] = fetcher.mock.calls[0]!;
    expect(JSON.parse(opts.body)).toEqual({ transaction_id: 'pre-001' });
  });

  it('rejects inquiry with a different transaction id or an unsafe amount', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(jsonResponse(reply({ id: 'different', status: 'paid', userID: 456789, amount: 1 })))
      .mockResolvedValueOnce(jsonResponse(reply({ id: 'pre-001', status: 'paid', userID: 456789, amount: Number.MAX_SAFE_INTEGER + 1 })));
    const client = new BaleWalletApi(botToken, fetcher);
    await expect(client.inquireTransaction('pre-001')).rejects.toThrow();
    await expect(client.inquireTransaction('pre-001')).rejects.toThrow();
  });

  it('validates pre-checkout and successful payment evidence but never settles on a browser hint', () => {
    expect(parseBalePreCheckout({ id: 'pre-001', from: { id: 456789 }, invoice_payload: 'billing:attempt-1', currency: 'IRR', total_amount: 120000 }))
      .toEqual({ currency: 'IRR', transactionId: 'pre-001', providerUserId: '456789', payload: 'billing:attempt-1', amountRial: 120000n });
    expect(parseBaleSuccessfulPayment({
      currency: 'IRR', total_amount: 120000, invoice_payload: 'billing:attempt-1',
      telegram_payment_charge_id: 'pre-001', provider_payment_charge_id: 'receipt-1',
    })).toEqual({ transactionId: 'pre-001', payload: 'billing:attempt-1', amountRial: 120000n, reference: 'receipt-1' });
    expect(() => parseBalePreCheckout({ id: 'pre-001', from: { id: 1 }, invoice_payload: 'p', currency: 'INVALID', total_amount: 120000 })).toThrow();
    expect(() => parseBaleSuccessfulPayment({ currency: 'IRR', total_amount: 120000, invoice_payload: 'p' })).toThrow();
  });
});
