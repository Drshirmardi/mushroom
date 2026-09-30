import { createCipheriv } from 'node:crypto';
import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import type { PaymentProviderPort, ProviderCallback, ProviderCreateInput, ProviderCreateResult, ProviderVerifyResult } from './payment-provider.port';
import { PaymentProviderRegistry } from './payment-provider.registry';

const blocked = () => new ServiceUnavailableException({ code: 'SADAD_GO_LIVE_BLOCKED', message: 'Sadad is configured for review only until merchant acceptance is complete.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'PAYMENT_PROVIDER_CONFIGURATION_INVALID', message: 'Sadad protocol input or response is invalid.', details: {} });
const MAX_INT64 = 9_223_372_036_854_775_807n;
const CALLBACK_MAX_FIELD_LENGTH = 512;
const DEFAULT_TIMEOUT_MS = 5_000;

/** Only the server-to-server endpoints confirmed by the frozen contract. */
export const SADAD_ENDPOINTS = {
  paymentRequest: 'https://sadad.shaparak.ir/api/v0/Request/PaymentRequest',
  verify: 'https://sadad.shaparak.ir/api/v0/Advice/Verify',
} as const;

export const SADAD_REDIRECT_PROFILES = {
  PDF_PURCHASE: 'https://sadad.shaparak.ir/Purchase',
  PHP_VPG_PURCHASE: 'https://sadad.shaparak.ir/VPG/Purchase?Token={token}',
  DOTNET_PURCHASE_INDEX: 'https://sadad.shaparak.ir/Purchase/Index?token={token}',
} as const;

export type SadadRedirectProfile = keyof typeof SADAD_REDIRECT_PROFILES;
export type SadadJson = Record<string, string | number>;
export type SadadTransport = { postJson(input: { endpoint: string; body: SadadJson; timeoutMs: number }): Promise<unknown> };

/** Runtime uses this until F12-T13 accepts merchant evidence; env values cannot turn it into a live connection. */
export class BlockedSadadTransport implements SadadTransport {
  async postJson(): Promise<unknown> { throw blocked(); }
}

/** Network implementation exists for the accepted protocol, but is never registered as the runtime transport here. */
export class FetchSadadTransport implements SadadTransport {
  async postJson(input: { endpoint: string; body: SadadJson; timeoutMs: number }): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await fetch(input.endpoint, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8', accept: 'application/json' }, body: JSON.stringify(input.body), signal: controller.signal });
      if (!response.ok) throw invalid();
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw invalid();
      return payload;
    } finally { clearTimeout(timeout); }
  }
}

export const toSadadRial = (commerceAmountToman: bigint) => {
  if (commerceAmountToman <= 0n || commerceAmountToman > MAX_INT64 / 10n) throw invalid();
  return commerceAmountToman * 10n;
};

export const formatSadadLocalDateTime = (instant: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const month = value('month'); const day = value('day'); const year = value('year'); const hour = value('hour'); const minute = value('minute'); const second = value('second'); const dayPeriod = value('dayPeriod');
  if (!month || !day || !year || !hour || !minute || !second || !dayPeriod) throw invalid();
  return `${month}/${day}/${year} ${hour}:${minute}:${second} ${dayPeriod}`;
};

const stringField = (input: Record<string, unknown>, field: string, optional = false) => {
  const value = input[field];
  if (value === undefined && optional) return undefined;
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).length === 0 || String(value).length > CALLBACK_MAX_FIELD_LENGTH) throw invalid();
  return String(value);
};

const integerField = (input: Record<string, unknown>, field: string, optional = false) => {
  const value = stringField(input, field, optional);
  if (value === undefined) return undefined;
  if (!/^\d+$/u.test(value)) throw invalid();
  return BigInt(value);
};

const responseRecord = (input: unknown) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid();
  return input as Record<string, unknown>;
};

const credential = (input: Record<string, string>) => {
  const merchantId = input.merchantId?.trim(); const terminalId = input.terminalId?.trim(); const terminalKey = input.terminalKey?.trim();
  if (!merchantId || !terminalId || !terminalKey || merchantId.length > 128 || terminalId.length > 128 || terminalKey.length > 4096) throw invalid();
  return { merchantId, terminalId, terminalKey };
};

const returnUrl = (value: string | undefined) => {
  if (!value) throw invalid();
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.pathname !== '/v1/payments/providers/sadad/callback' || url.search || url.hash) throw invalid();
    return url.toString();
  } catch { throw invalid(); }
};

const redirectProfile = (value: string | undefined): SadadRedirectProfile => {
  if (!value || !(value in SADAD_REDIRECT_PROFILES)) throw invalid();
  return value as SadadRedirectProfile;
};

export const parseSadadFormCallback = (input: Record<string, unknown>): ProviderCallback => {
  const allowed = ['OrderId', 'Token', 'ResCode'] as const;
  const values = Object.fromEntries(allowed.map((field) => [field, input[field]]));
  if (Object.values(values).some((value) => typeof value !== 'string' || value.length === 0 || value.length > CALLBACK_MAX_FIELD_LENGTH) || !/^\d+$/u.test(values.OrderId as string)) throw invalid();
  return { providerOrderId: BigInt(values.OrderId as string), token: values.Token as string, resultCode: values.ResCode as string };
};

export const buildDormantSadadRedirect = (profile: SadadRedirectProfile, token: string) => {
  if (!token || token.length > CALLBACK_MAX_FIELD_LENGTH) throw invalid();
  return SADAD_REDIRECT_PROFILES[profile].replace('{token}', encodeURIComponent(token));
};

export const SADAD_DESCRIPTOR = {
  code: 'sadad', displayName: 'Sadad', capabilities: {
    createPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', parseCallback: 'SUPPORTED_WHEN_GO_LIVE_READY', verifyPayment: 'SUPPORTED_WHEN_GO_LIVE_READY',
    sandbox: 'UNSUPPORTED', inquiry: 'UNSUPPORTED', webhook: 'UNSUPPORTED', refund: 'UNSUPPORTED', partialRefund: 'UNSUPPORTED',
  },
} as const;

/** Complete protocol adapter; production stays fail-closed while simulated tests inject a transport explicitly. */
@Injectable()
export class SadadPaymentProviderAdapter implements PaymentProviderPort {
  readonly descriptor = SADAD_DESCRIPTOR;
  protected transport: SadadTransport = new BlockedSadadTransport();
  protected now: () => Date = () => new Date();
  protected timeoutMs = DEFAULT_TIMEOUT_MS;
  constructor(registry: PaymentProviderRegistry) { registry.register(this); }

  async createPayment(input: ProviderCreateInput): Promise<ProviderCreateResult> {
    const secret = credential(input.credential); const amount = toSadadRial(input.commerceAmountToman);
    if (input.providerUnit !== 'RIAL' || input.providerAmount !== amount) throw invalid();
    const result = responseRecord(await this.transport.postJson({ endpoint: SADAD_ENDPOINTS.paymentRequest, timeoutMs: this.timeoutMs, body: { MerchantId: secret.merchantId, TerminalId: secret.terminalId, Amount: amount.toString(), OrderId: input.providerOrderId.toString(), LocalDateTime: formatSadadLocalDateTime(this.now()), ReturnUrl: returnUrl(input.returnUrl), SignData: this.signData(secret.terminalId, input.providerOrderId, amount, secret.terminalKey) } }));
    const providerResultCode = stringField(result, 'ResCode')!;
    if (providerResultCode !== '0') return { providerResultCode };
    const token = stringField(result, 'Token');
    if (!token) throw invalid();
    return { providerResultCode, token, redirectUrl: buildDormantSadadRedirect(redirectProfile(input.redirectProfile), token) };
  }

  parseCallback(input: unknown): ProviderCallback { return parseSadadFormCallback(responseRecord(input)); }

  async verifyPayment(input: { token: string; credential: Record<string, string> }): Promise<ProviderVerifyResult> {
    if (!input.token || input.token.length > CALLBACK_MAX_FIELD_LENGTH) throw invalid();
    const secret = credential(input.credential);
    const result = responseRecord(await this.transport.postJson({ endpoint: SADAD_ENDPOINTS.verify, timeoutMs: this.timeoutMs, body: { Token: input.token, SignData: this.signVerifyToken(input.token, secret.terminalKey) } }));
    const resultCode = stringField(result, 'ResCode')!;
    if (resultCode !== '0' && resultCode !== '100') return { resultCode };
    const providerOrderId = integerField(result, 'OrderId'); const amount = integerField(result, 'Amount');
    if (providerOrderId === undefined || amount === undefined || amount <= 0n) throw invalid();
    return { resultCode, providerOrderId, amount, referenceId: stringField(result, 'RetrivalRefNo', true), traceNumber: stringField(result, 'SystemTraceNo', true) };
  }

  signData(terminalId: string, providerOrderId: bigint, amount: bigint, terminalKeyBase64: string) { const key = Buffer.from(terminalKeyBase64, 'base64'); if (key.length !== 24) throw invalid(); const cipher = createCipheriv('des-ede3', key, null); return Buffer.concat([cipher.update(`${terminalId};${providerOrderId.toString()};${amount.toString()}`, 'utf8'), cipher.final()]).toString('base64'); }
  signVerifyToken(token: string, terminalKeyBase64: string) { const key = Buffer.from(terminalKeyBase64, 'base64'); if (key.length !== 24) throw invalid(); const cipher = createCipheriv('des-ede3', key, null); return Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]).toString('base64'); }
}

/** Test-only construction path: it never participates in Nest runtime wiring or provider enablement. */
export class SimulatedSadadPaymentProviderAdapter extends SadadPaymentProviderAdapter {
  constructor(registry: PaymentProviderRegistry, transport: SadadTransport, now: () => Date = () => new Date(), timeoutMs = DEFAULT_TIMEOUT_MS) {
    super(registry);
    this.transport = transport;
    this.now = now;
    this.timeoutMs = timeoutMs;
  }
}
