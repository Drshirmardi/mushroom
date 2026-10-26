import { Injectable, OnModuleInit } from '@nestjs/common';
import { SmsProviderPort, type SmsProviderDescriptor, type SmsProviderResult } from './sms-provider.port';
import { SmsProviderRegistry } from './sms-provider.registry';
import { SmsRuntimeService } from './sms-runtime.service';

@Injectable()
export class FarazSmsAdapter extends SmsProviderPort implements OnModuleInit {
  readonly descriptor: SmsProviderDescriptor = {
    code: 'farazsms', displayName: 'فراز اس‌ام‌اس', description: 'ارسال کد یک‌بارمصرف با پترن تأییدشده فراز اس‌ام‌اس',
    capabilities: ['PATTERN_SEND', 'CONNECTION_TEST'] as const,
    fields: [
      { key: 'patternCode', label: 'کد پترن', help: 'کد پترن تأییدشده برای متغیر code', type: 'text', required: true, secret: false, defaultValue: '5k9VJ4lCE1', placeholder: '5k9VJ4lCE1', order: 1, maxLength: 128 },
      { key: 'apiToken', label: 'توکن API', help: 'توکن فقط هنگام جایگزینی ارسال و رمزگذاری می‌شود', type: 'secret', required: true, secret: true, placeholder: '••••••••', order: 2, maxLength: 4096 },
    ],
  };

  constructor(private readonly registry: SmsProviderRegistry, private readonly runtime: SmsRuntimeService) { super(); }
  onModuleInit() { this.registry.register(this); }

  async testConnection(credential: Record<string, string>): Promise<SmsProviderResult> {
    this.runtime.assertLive();
    return this.call(async () => { const { FarazSMS } = await import('farazsms'); return new FarazSMS(this.token(credential)).lines(); });
  }

  async sendPattern(input: { credential: Record<string, string>; config: Record<string, string>; recipient: string; attributes: Record<string, string> }): Promise<SmsProviderResult> {
    this.runtime.assertLive();
    const pattern = input.config.patternCode?.trim();
    if (!pattern || !/^\+989\d{9}$/u.test(input.recipient)) return { outcome: 'FAILED', errorCategory: 'REJECTED' };
    const phone = `0${input.recipient.slice(3)}`;
    return this.call(async () => { const { FarazSMS } = await import('farazsms'); return new FarazSMS(this.token(input.credential)).sendPattern(pattern, phone, input.attributes); });
  }

  private token(value: Record<string, string>) { const token = value.apiToken?.trim(); if (!token || token.length > 4096) throw new Error('SMS_PROVIDER_CONFIGURATION_INVALID'); return token; }
  private async call(operation: () => Promise<unknown>): Promise<SmsProviderResult> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('SMS_TIMEOUT')), this.runtime.timeoutMs); });
      const response = await Promise.race([operation(), timeout]);
      if (!response || typeof response !== 'object') return { outcome: 'UNKNOWN', errorCategory: 'INVALID_RESPONSE' };
      const record = response as Record<string, unknown>;
      if (record.status === 'error' || record.success === false) return { outcome: 'FAILED', errorCategory: 'REJECTED' };
      const reference = typeof record.id === 'string' || typeof record.id === 'number' ? String(record.id).slice(0, 256) : undefined;
      return { outcome: 'ACCEPTED', providerReference: reference };
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') return { outcome: 'FAILED', errorCategory: error.status === 401 || error.status === 403 ? 'AUTHENTICATION' : 'REJECTED' };
      if (error instanceof Error && error.message === 'SMS_TIMEOUT') return { outcome: 'UNKNOWN', errorCategory: 'TIMEOUT' };
      return { outcome: 'UNKNOWN', errorCategory: 'NETWORK' };
    } finally { if (timer) clearTimeout(timer); }
  }
}
