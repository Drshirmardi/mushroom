/**
 * Server-only Bale wallet protocol. No invoice closure or browser callback is proof of payment.
 * https://docs.bale.ai/#createinvoicelink
 * https://docs.bale.ai/#inquiretransaction
 */
import { UnprocessableEntityException, ServiceUnavailableException } from '@nestjs/common';

const malformed = () => new UnprocessableEntityException({
  code: 'BALE_WALLET_PROTOCOL_INVALID', message: 'Bale payment input or response is invalid.', details: {},
});
const unavailable = () => new ServiceUnavailableException({
  code: 'BALE_WALLET_UNAVAILABLE', message: 'Bale wallet service is temporarily unavailable.', details: {},
});

export const BALE_TEST_WALLET_TOKEN = 'WALLET-TEST-1111111111111111';

export type BaleTransactionStatus = 'pending' | 'paid' | 'failed' | 'rejected';
export type BaleTransaction = {
  id: string;
  status: BaleTransactionStatus;
  providerUserId: string;
  amountRial: bigint;
};
export type BalePreCheckout = { currency: string; transactionId: string; providerUserId: string; payload: string; amountRial: bigint };
export type BaleSuccessfulPayment = { transactionId: string; payload: string; amountRial: bigint; reference: string };

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw malformed();
  return value as Record<string, unknown>;
};
const safeAmount = (value: unknown): bigint => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw malformed();
  return BigInt(value);
};
const bounded = (value: unknown, max = 128): string => {
  if (typeof value !== 'string' || !value.length || Buffer.byteLength(value, 'utf8') > max) throw malformed();
  return value;
};
const userId = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw malformed();
  return String(value);
};

export function parseBalePreCheckout(input: unknown): BalePreCheckout {
  const item = record(input);
  return {
    currency: bounded(item.currency, 3),
    transactionId: bounded(item.id),
    providerUserId: userId(record(item.from).id),
    payload: bounded(item.invoice_payload),
    amountRial: safeAmount(item.total_amount),
  };
}

export function parseBaleSuccessfulPayment(input: unknown): BaleSuccessfulPayment {
  const item = record(input);
  if (item.currency !== 'IRR') throw malformed();
  return {
    transactionId: bounded(item.telegram_payment_charge_id),
    payload: bounded(item.invoice_payload),
    amountRial: safeAmount(item.total_amount),
    reference: bounded(item.provider_payment_charge_id),
  };
}

export class BaleWalletApi {
  constructor(private readonly botToken: string, private readonly fetcher: typeof fetch = fetch) {
    if (!/^[0-9]+:[A-Za-z0-9_-]{8,}$/u.test(botToken)) throw unavailable();
  }

  private async call(method: 'createInvoiceLink' | 'answerPreCheckoutQuery' | 'inquireTransaction', body: Record<string, unknown>): Promise<unknown> {
    // Never log the request URL: it contains the bot token.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await this.fetcher(`https://tapi.bale.ai/bot${this.botToken}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8', accept: 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw unavailable();
      const data = record(await response.json());
      if (data.ok !== true) throw unavailable();
      return data.result;
    } catch {
      throw unavailable();
    } finally {
      clearTimeout(timeout);
    }
  }

  async createInvoiceLink(input: {
    providerToken: string; amountRial: bigint; payload: string; title: string; description: string;
  }): Promise<string> {
    const providerToken = bounded(input.providerToken, 4096);
    const title = bounded(input.title, 128);
    const description = bounded(input.description, 1024);
    const payload = bounded(input.payload, 128);
    if ([...title].length > 32 || [...description].length > 255 ||
        input.amountRial <= 0n || input.amountRial > BigInt(Number.MAX_SAFE_INTEGER)) throw malformed();
    const result = await this.call('createInvoiceLink', {
      provider_token: providerToken, title, description, payload,
      prices: [{ label: title, amount: Number(input.amountRial) }],
    });
    return bounded(result, 4096);
  }

  async answerPreCheckoutQuery(transactionId: string, ok: boolean, errorMessage?: string): Promise<void> {
    const id = bounded(transactionId);
    if (typeof ok !== 'boolean' || (!ok && !errorMessage)) throw malformed();
    const result = await this.call('answerPreCheckoutQuery', {
      pre_checkout_query_id: id, ok,
      ...(!ok ? { error_message: bounded(errorMessage, 255) } : {}),
    });
    if (result !== true) throw unavailable();
  }

  async inquireTransaction(transactionId: string): Promise<BaleTransaction> {
    const id = bounded(transactionId);
    const data = record(await this.call('inquireTransaction', { transaction_id: id }));
    if (data.id !== id || !['pending', 'paid', 'failed', 'rejected'].includes(String(data.status))) throw malformed();
    return {
      id, status: data.status as BaleTransactionStatus,
      providerUserId: userId(data.userID), amountRial: safeAmount(data.amount),
    };
  }
}
