import { createCipheriv } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { PaymentProviderPort, ProviderCallback, ProviderCreateInput, ProviderCreateResult, ProviderVerifyResult } from './payment-provider.port';
import { PaymentProviderRegistry } from './payment-provider.registry';

const blocked = () => new ServiceUnavailableException({ code: 'SADAD_GO_LIVE_BLOCKED', message: 'Sadad is configured for review only until merchant acceptance is complete.', details: {} });
const MAX_INT64 = 9_223_372_036_854_775_807n;
const CALLBACK_MAX_FIELD_LENGTH = 512;

/** Only the server-to-server endpoints confirmed by the frozen contract. No transport is enabled here. */
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

export const toSadadRial = (commerceAmountToman: bigint) => {
  if (commerceAmountToman <= 0n || commerceAmountToman > MAX_INT64 / 10n) throw blocked();
  return commerceAmountToman * 10n;
};

export const formatSadadLocalDateTime = (instant: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const month = value('month'); const day = value('day'); const year = value('year'); const hour = value('hour'); const minute = value('minute'); const second = value('second'); const dayPeriod = value('dayPeriod');
  if (!month || !day || !year || !hour || !minute || !second || !dayPeriod) throw blocked();
  return `${month}/${day}/${year} ${hour}:${minute}:${second} ${dayPeriod}`;
};

export const parseSadadFormCallback = (input: Record<string, unknown>): ProviderCallback => {
  const allowed = ['OrderId', 'Token', 'ResCode'] as const;
  const values = Object.fromEntries(allowed.map((field) => [field, input[field]]));
  if (Object.values(values).some((value) => typeof value !== 'string' || value.length === 0 || value.length > CALLBACK_MAX_FIELD_LENGTH) || !/^\d+$/u.test(values.OrderId as string)) throw blocked();
  return { providerOrderId: BigInt(values.OrderId as string), token: values.Token as string, resultCode: values.ResCode as string };
};

export const buildDormantSadadRedirect = (profile: SadadRedirectProfile, token: string) => {
  if (!token || token.length > CALLBACK_MAX_FIELD_LENGTH) throw blocked();
  return SADAD_REDIRECT_PROFILES[profile].replace('{token}', encodeURIComponent(token));
};

export const SADAD_DESCRIPTOR = {
  code: 'sadad', displayName: 'Sadad', capabilities: {
    createPayment: 'SUPPORTED_WHEN_GO_LIVE_READY', parseCallback: 'SUPPORTED_WHEN_GO_LIVE_READY', verifyPayment: 'SUPPORTED_WHEN_GO_LIVE_READY',
    sandbox: 'UNSUPPORTED', inquiry: 'UNSUPPORTED', webhook: 'UNSUPPORTED', refund: 'UNSUPPORTED', partialRefund: 'UNSUPPORTED',
  },
} as const;

/** Dormant protocol adapter. Network transport and callback-profile activation require merchant evidence. */
@Injectable()
export class SadadPaymentProviderAdapter implements PaymentProviderPort {
  readonly descriptor = SADAD_DESCRIPTOR;
  constructor(registry: PaymentProviderRegistry) { registry.register(this); }
  createPayment(_input: ProviderCreateInput): Promise<ProviderCreateResult> { throw blocked(); }
  parseCallback(_input: unknown): ProviderCallback { throw blocked(); }
  verifyPayment(_input: { token: string; credential: Record<string, string> }): Promise<ProviderVerifyResult> { throw blocked(); }
  signData(terminalId: string, providerOrderId: bigint, amount: bigint, terminalKeyBase64: string) { const key = Buffer.from(terminalKeyBase64, 'base64'); if (key.length !== 24) throw blocked(); const cipher = createCipheriv('des-ede3', key, null); return Buffer.concat([cipher.update(`${terminalId};${providerOrderId.toString()};${amount.toString()}`, 'utf8'), cipher.final()]).toString('base64'); }
  signVerifyToken(token: string, terminalKeyBase64: string) { const key = Buffer.from(terminalKeyBase64, 'base64'); if (key.length !== 24) throw blocked(); const cipher = createCipheriv('des-ede3', key, null); return Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]).toString('base64'); }
}
