import { normalizeSadadCallbackUrl } from '../../../config/sadad-callback-url';
import { createCipheriv } from 'node:crypto';
import { Injectable, Optional, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import type { PaymentProviderPort, ProviderCallback, ProviderCreateInput, ProviderCreateResult, ProviderVerifyResult } from './payment-provider.port';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { SadadRuntimeConfigService } from './sadad-runtime-config.service';
import { GatewayTransportError, PaymentGatewayDiagnosticsService } from './payment-gateway-diagnostics.service';

const blocked = () => new ServiceUnavailableException({ code: 'SADAD_GO_LIVE_BLOCKED', message: 'Sadad live transport is disabled for this deployment.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'PAYMENT_PROVIDER_CONFIGURATION_INVALID', message: 'Sadad protocol input or response is invalid.', details: {} });
export const SADAD_MAX_INT64 = 9_223_372_036_854_775_807n;
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
export type SadadJson = Record<string, string | number | bigint>;
export type SadadTransport = { postJson(input: { endpoint: string; body: SadadJson; timeoutMs: number }): Promise<unknown> };

/** Emit bounded bigint values as JSON number tokens without coercing them to imprecise JavaScript numbers. */
export const serializeSadadJson = (body: SadadJson) => {
  const entries = Object.entries(body).map(([key, value]) => {
    if (typeof value === 'bigint') {
      if (value < 0n || value > SADAD_MAX_INT64) throw invalid();
      return `${JSON.stringify(key)}:${value.toString()}`;
    }
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value) || value < 0) throw invalid();
      return `${JSON.stringify(key)}:${value}`;
    }
    return `${JSON.stringify(key)}:${JSON.stringify(value)}`;
  });
  return `{${entries.join(',')}}`;
};

const skipWhitespace = (input: string, cursor: number) => {
  while (/\s/u.test(input[cursor] ?? '')) cursor += 1;
  return cursor;
};

const stringEnd = (input: string, cursor: number) => {
  if (input[cursor] !== '"') throw invalid();
  cursor += 1;
  while (cursor < input.length) {
    if (input[cursor] === '\\') { cursor += 2; continue; }
    if (input[cursor] === '"') return cursor + 1;
    cursor += 1;
  }
  throw invalid();
};

const valueEnd = (input: string, cursor: number) => {
  if (input[cursor] === '"') return stringEnd(input, cursor);
  if (input[cursor] !== '{' && input[cursor] !== '[') {
    while (cursor < input.length && !/[\s,}\]]/u.test(input[cursor]!)) cursor += 1;
    return cursor;
  }
  let depth = 0;
  while (cursor < input.length) {
    if (input[cursor] === '"') { cursor = stringEnd(input, cursor); continue; }
    if (input[cursor] === '{' || input[cursor] === '[') depth += 1;
    if (input[cursor] === '}' || input[cursor] === ']') { depth -= 1; if (depth === 0) return cursor + 1; }
    cursor += 1;
  }
  throw invalid();
};

/** Native JSON parsing loses JSON integer precision; retain top-level financial literals verbatim before matching. */
const losslessFinancialIntegers = (input: string) => {
  const values = new Map<string, string>(); let cursor = skipWhitespace(input, 0);
  if (input[cursor] !== '{') throw invalid();
  cursor = skipWhitespace(input, cursor + 1);
  while (input[cursor] !== '}') {
    const keyStart = cursor; const keyEnd = stringEnd(input, cursor); const key = JSON.parse(input.slice(keyStart, keyEnd)) as string;
    cursor = skipWhitespace(input, keyEnd); if (input[cursor] !== ':') throw invalid();
    cursor = skipWhitespace(input, cursor + 1);
    const numeric = input.slice(cursor).match(/^(?:0|[1-9]\d*)/u);
    if ((key === 'Amount' || key === 'OrderId') && numeric) {
      const end = skipWhitespace(input, cursor + numeric[0].length);
      if (input[end] !== ',' && input[end] !== '}') throw invalid();
      values.set(key, numeric[0]); cursor = end;
    } else cursor = skipWhitespace(input, valueEnd(input, cursor));
    if (input[cursor] === ',') cursor = skipWhitespace(input, cursor + 1);
    else if (input[cursor] !== '}') throw invalid();
  }
  if (skipWhitespace(input, cursor + 1) !== input.length) throw invalid();
  return values;
};

export const parseSadadResponseJson = (input: string) => {
  let parsed: unknown;
  try { parsed = JSON.parse(input); } catch { throw invalid(); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw invalid();
  const response = parsed as Record<string, unknown>;
  for (const [field, value] of losslessFinancialIntegers(input)) response[field] = value;
  return response;
};

/** Fail-closed transport used whenever the deployment has not explicitly selected live mode. */
export class BlockedSadadTransport implements SadadTransport {
  async postJson(): Promise<unknown> { throw blocked(); }
}

/** Bounded server-to-server transport selected only by the validated live deployment mode. */
export class FetchSadadTransport implements SadadTransport {
  async postJson(input: { endpoint: string; body: SadadJson; timeoutMs: number }): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await fetch(input.endpoint, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8', accept: 'application/json' }, body: serializeSadadJson(input.body), signal: controller.signal });
      if (!response.ok) throw new GatewayTransportError('HTTP', response.status);
      const body = await response.text();
      try { return parseSadadResponseJson(body); } catch { throw new GatewayTransportError('INVALID_RESPONSE', response.status); }
    } catch (error) {
      if (error instanceof GatewayTransportError) throw error;
      throw new GatewayTransportError(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK');
    } finally { clearTimeout(timeout); }
  }
}

export const toSadadRial = (commerceAmountToman: bigint) => {
  if (commerceAmountToman <= 0n || commerceAmountToman > SADAD_MAX_INT64 / 10n) throw invalid();
  return commerceAmountToman * 10n;
};

const positiveInt64 = (value: bigint) => {
  if (value <= 0n || value > SADAD_MAX_INT64) throw invalid();
  return value;
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

const resultCodeField = (input: Record<string, unknown>, field: string) => {
  const value = stringField(input, field)!;
  if (!/^-?\d{1,31}$/u.test(value)) throw invalid();
  return value;
};

const integerField = (input: Record<string, unknown>, field: string, optional = false) => {
  if (typeof input[field] === 'number' && !Number.isSafeInteger(input[field])) throw invalid();
  const value = stringField(input, field, optional);
  if (value === undefined) return undefined;
  if (!/^\d+$/u.test(value)) throw invalid();
  return positiveInt64(BigInt(value));
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
    return normalizeSadadCallbackUrl(value);
  } catch { throw invalid(); }
};

const redirectProfile = (value: string | undefined): SadadRedirectProfile => {
  if (!value || !(value in SADAD_REDIRECT_PROFILES)) throw invalid();
  return value as SadadRedirectProfile;
};

export const parseSadadFormCallback = (input: Record<string, unknown>): ProviderCallback => {
  // Live VPG forms use lowercase token; retain the documented Token spelling too.
  if (input.token !== undefined && input.Token !== undefined && input.token !== input.Token) throw invalid();
  const values = { OrderId: input.OrderId, Token: input.Token ?? input.token, ResCode: input.ResCode };
  if (Object.values(values).some((value) => typeof value !== 'string' || value.length === 0 || value.length > CALLBACK_MAX_FIELD_LENGTH) || !/^\d+$/u.test(values.OrderId as string)) throw invalid();
  return { providerOrderId: positiveInt64(BigInt(values.OrderId as string)), token: values.Token as string, resultCode: resultCodeField(values, 'ResCode') };
};

export const buildSadadRedirect = (profile: SadadRedirectProfile, token: string) => {
  if (!token || token.length > CALLBACK_MAX_FIELD_LENGTH) throw invalid();
  return SADAD_REDIRECT_PROFILES[profile].replace('{token}', encodeURIComponent(token));
};

export const SADAD_DESCRIPTOR = {
  code: 'sadad', displayName: 'Sadad', capabilities: {
    createPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', parseCallback: 'SUPPORTED_WHEN_GO_LIVE_READY', verifyPayment: 'SUPPORTED_WHEN_GO_LIVE_READY',
    sandbox: 'UNSUPPORTED', inquiry: 'UNSUPPORTED', webhook: 'UNSUPPORTED', refund: 'UNSUPPORTED', partialRefund: 'UNSUPPORTED',
  },
} as const;

/** Complete protocol adapter; deployment mode chooses the blocked or live transport at application startup. */
@Injectable()
export class SadadPaymentProviderAdapter implements PaymentProviderPort {
  readonly descriptor = SADAD_DESCRIPTOR;
  protected transport: SadadTransport = new BlockedSadadTransport();
  protected now: () => Date = () => new Date();
  protected timeoutMs = DEFAULT_TIMEOUT_MS;
  constructor(registry: PaymentProviderRegistry, @Optional() runtime?: SadadRuntimeConfigService, @Optional() private readonly diagnostics?: PaymentGatewayDiagnosticsService) {
    registry.register(this);
    if (runtime?.live) {
      this.transport = new FetchSadadTransport();
      this.timeoutMs = runtime.timeoutMs;
    }
  }

  async createPayment(input: ProviderCreateInput): Promise<ProviderCreateResult> {
    const started = Date.now();
    try {
      const result = await this.requestPayment(input);
      await this.diagnostics?.record(input.providerOrderId, 'REQUEST', started, result.providerResultCode);
      return result;
    } catch (error) { await this.diagnostics?.record(input.providerOrderId, 'REQUEST', started, undefined, error); throw error; }
  }

  private async requestPayment(input: ProviderCreateInput): Promise<ProviderCreateResult> {
    const secret = credential(input.credential); const amount = input.amountRial === undefined ? toSadadRial(input.commerceAmountToman ?? 0n) : positiveInt64(input.amountRial); const providerOrderId = positiveInt64(input.providerOrderId);
    if (input.amountRial !== undefined && input.commerceAmountToman !== undefined && toSadadRial(input.commerceAmountToman) !== amount) throw invalid();
    if (input.providerUnit !== 'RIAL' || input.providerAmount !== amount) throw invalid();
    const result = responseRecord(await this.transport.postJson({ endpoint: SADAD_ENDPOINTS.paymentRequest, timeoutMs: this.timeoutMs, body: { MerchantId: secret.merchantId, TerminalId: secret.terminalId, Amount: amount, OrderId: providerOrderId, LocalDateTime: formatSadadLocalDateTime(this.now()), ReturnUrl: returnUrl(input.returnUrl), SignData: this.signData(secret.terminalId, providerOrderId, amount, secret.terminalKey) } }));
    const providerResultCode = resultCodeField(result, 'ResCode');
    if (providerResultCode !== '0') return { providerResultCode };
    const token = stringField(result, 'Token');
    if (!token) throw invalid();
    return { providerResultCode, token, redirectUrl: buildSadadRedirect(redirectProfile(input.redirectProfile), token) };
  }

  parseCallback(input: unknown): ProviderCallback { return parseSadadFormCallback(responseRecord(input)); }

  async verifyPayment(input: { token: string; credential: Record<string, string>; providerOrderId?: bigint }): Promise<ProviderVerifyResult> {
    const started = Date.now();
    try {
      const result = await this.requestVerification(input);
      if (input.providerOrderId !== undefined) await this.diagnostics?.record(input.providerOrderId, 'VERIFY', started, result.resultCode);
      return result;
    } catch (error) { if (input.providerOrderId !== undefined) await this.diagnostics?.record(input.providerOrderId, 'VERIFY', started, undefined, error); throw error; }
  }

  private async requestVerification(input: { token: string; credential: Record<string, string> }): Promise<ProviderVerifyResult> {
    if (!input.token || input.token.length > CALLBACK_MAX_FIELD_LENGTH) throw invalid();
    const secret = credential(input.credential);
    const result = responseRecord(await this.transport.postJson({ endpoint: SADAD_ENDPOINTS.verify, timeoutMs: this.timeoutMs, body: { Token: input.token, SignData: this.signVerifyToken(input.token, secret.terminalKey) } }));
    const resultCode = resultCodeField(result, 'ResCode');
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
