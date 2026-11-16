import { Injectable, OnModuleInit } from '@nestjs/common';
import { SmsProviderPort, type SmsProviderDescriptor, type SmsProviderResult } from './sms-provider.port';
import { SmsProviderRegistry } from './sms-provider.registry';
import { SmsRuntimeService } from './sms-runtime.service';

@Injectable()
export class FarazSmsAdapter extends SmsProviderPort implements OnModuleInit {
  readonly descriptor: SmsProviderDescriptor = {
    code: 'farazsms', displayName: 'فراز اس‌ام‌اس', description: 'ارسال کد ورود با پترن و ارسال پیامک متنی یا پترنی دعوت با تنظیمات مستقل',
    capabilities: ['PATTERN_SEND', 'TEXT_SEND', 'CONNECTION_TEST'] as const,
    fields: [
      { key: 'invitationMode', label: 'روش پیامک دعوت', help: 'TEXT برای متن خام یا PATTERN برای پترن مستقل؛ تنظیم ورود تغییر نمی‌کند', type: 'text', required: false, secret: false, order: 4, maxLength: 16 },
      { key: 'invitationSenderLine', label: 'خط فرستنده دعوت', help: 'شماره خط مجاز حساب برای ارسال متن خام؛ فقط رقم', type: 'text', required: false, secret: false, order: 5, maxLength: 20 },
      { key: 'invitationPatternCode', label: 'پترن دعوت به خدمت', help: 'پترن مستقل با متغیر link؛ پترن ورود تغییر نمی‌کند', type: 'text', required: false, secret: false, order: 3, maxLength: 128 },
      { key: 'patternCode', label: 'کد پترن', help: 'کد پترن تأییدشده برای متغیر code', type: 'text', required: true, secret: false, defaultValue: '5k9VJ4lCE1', placeholder: '5k9VJ4lCE1', order: 1, maxLength: 128 },
      { key: 'apiToken', label: 'توکن API', help: 'توکن فقط هنگام جایگزینی ارسال و رمزگذاری می‌شود', type: 'secret', required: true, secret: true, placeholder: '••••••••', order: 2, maxLength: 4096 },
    ],
  };

  constructor(private readonly registry: SmsProviderRegistry, private readonly runtime: SmsRuntimeService) { super(); }
  onModuleInit() { this.registry.register(this); }

  async testConnection(credential: Record<string, string>): Promise<SmsProviderResult> {
    this.runtime.assertLive();
    return this.call(async () => (await this.client(credential)).lines(), false);
  }

  async sendPattern(input: { credential: Record<string, string>; config: Record<string, string>; recipient: string; attributes: Record<string, string> }): Promise<SmsProviderResult> {
    this.runtime.assertLive();
    const pattern = input.config.patternCode?.trim();
    if (!pattern || !/^\+989\d{9}$/u.test(input.recipient)) return { outcome: 'FAILED', errorCategory: 'REJECTED' };
    const phone = `0${input.recipient.slice(3)}`;
    return this.call(async () => (await this.client(input.credential)).sendPattern(pattern, phone, input.attributes));
  }

  async sendText(input: { credential: Record<string,string>; recipient: string; text: string; senderLine: string }): Promise<SmsProviderResult> {
    this.runtime.assertLive();
    if (!/^\+989\d{9}$/u.test(input.recipient) || !/^\d{3,20}$/u.test(input.senderLine) || !input.text.trim() || input.text.length > 2000) return { outcome: 'FAILED', errorCategory: 'REJECTED' };
    return this.call(async () => (await this.client(input.credential)).sendSimple(input.text, [`0${input.recipient.slice(3)}`], input.senderLine));
  }

  private async client(credential: Record<string,string>) {
    const { FarazSMS, FarazError } = await import('farazsms');
    const timeout = Number(this.runtime.timeoutMs);
    // Reuse SDK helpers; its default transport ignores unsuccessful HTTP status and has no abort.
    return new class extends FarazSMS {
      override async request(method: string, path: string, body?: unknown, query?: Record<string,string|number|boolean|null|undefined>|null) {
        const url = new URL(this.base + path);
        for (const [key,value] of Object.entries(query ?? {})) if (value != null) url.searchParams.set(key,String(value));
        const response = await fetch(url, { method, signal: AbortSignal.timeout(timeout), headers: { 'Api-Key': this.key, Accept: 'application/json', ...(body ? { 'Content-Type':'application/json' } : {}) }, ...(body ? { body:JSON.stringify(body) } : {}) });
        const data: unknown = await response.json().catch(() => undefined);
        if (!response.ok || data && typeof data === 'object' && 'status' in data && data.status === 'error') throw new FarazError(response.status, {});
        return data;
      }
    }(this.token(credential));
  }

  private token(value: Record<string, string>) { const token = value.apiToken?.trim(); if (!token || token.length > 4096) throw new Error('SMS_PROVIDER_CONFIGURATION_INVALID'); return token; }
  private async call(operation: () => Promise<unknown>, requireAcknowledgement = true): Promise<SmsProviderResult> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('SMS_TIMEOUT')), this.runtime.timeoutMs); });
      const response = await Promise.race([operation(), timeout]);
      if (!response || typeof response !== 'object' || Array.isArray(response) || !Object.keys(response).length) return { outcome: 'UNKNOWN', errorCategory: 'INVALID_RESPONSE' };
      const record = response as Record<string, unknown>;
      if (record.status === 'error' || record.success === false) return { outcome: 'FAILED', errorCategory: 'REJECTED' };
      const nested = record.data && typeof record.data === 'object' && !Array.isArray(record.data) ? record.data as Record<string,unknown> : {};
      const id = record.id ?? record.request_id ?? nested.id ?? nested.request_id;
      const reference = typeof id === 'string' || typeof id === 'number' ? String(id).slice(0, 256) : undefined;
      if (requireAcknowledgement && !reference && record.status !== 'success' && record.success !== true) return { outcome: 'UNKNOWN', errorCategory: 'INVALID_RESPONSE' };
      return { outcome: 'ACCEPTED', providerReference: reference };
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' && error.status >= 500) return { outcome: 'UNKNOWN', errorCategory: 'NETWORK' };
      if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') return { outcome: 'FAILED', errorCategory: error.status === 401 || error.status === 403 ? 'AUTHENTICATION' : 'REJECTED' };
      if (error instanceof Error && (error.message === 'SMS_TIMEOUT' || ['TimeoutError','AbortError'].includes(error.name))) return { outcome: 'UNKNOWN', errorCategory: 'TIMEOUT' };
      return { outcome: 'UNKNOWN', errorCategory: 'NETWORK' };
    } finally { if (timer) clearTimeout(timer); }
  }
}
