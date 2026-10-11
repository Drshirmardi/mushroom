import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { SmsCredentialCryptoService } from '../src/modules/communications/sms/sms-credential-crypto.service';
import { SmsProviderRegistry } from '../src/modules/communications/sms/sms-provider.registry';
import { SmsRuntimeService } from '../src/modules/communications/sms/sms-runtime.service';
import { FarazSmsAdapter } from '../src/modules/communications/sms/faraz-sms.adapter';
import { OtpAuthenticationUseCase } from '../src/modules/identity/application/otp-authentication.use-case';

const key = Buffer.alloc(32, 7).toString('base64');

describe('SMS credential and OTP security boundaries', () => {
  it('encrypts credentials with authenticated encryption and rejects tampering', () => {
    const config = new ConfigService({ SMS_CREDENTIAL_ENCRYPTION_KEY: key, SMS_CREDENTIAL_ENCRYPTION_KEY_VERSION: 'v1' });
    const crypto = new SmsCredentialCryptoService(config);
    const encrypted = crypto.encrypt({ apiToken: 'write-only-value' });
    expect(encrypted.ciphertext.toString()).not.toContain('write-only-value');
    expect(crypto.decrypt({ encryptedPayload: encrypted.ciphertext, encryptionNonce: encrypted.nonce, authenticationTag: encrypted.tag, encryptionKeyVersion: encrypted.keyVersion })).toEqual({ apiToken: 'write-only-value' });
    encrypted.ciphertext[0] ^= 1;
    expect(() => crypto.decrypt({ encryptedPayload: encrypted.ciphertext, encryptionNonce: encrypted.nonce, authenticationTag: encrypted.tag, encryptionKeyVersion: encrypted.keyVersion })).toThrow();
  });

  it('registers only the real FarazSMS adapter and fails closed while transport is disabled', async () => {
    const registry = new SmsProviderRegistry();
    const adapter = new FarazSmsAdapter(registry, new SmsRuntimeService(new ConfigService({ SMS_TRANSPORT_MODE: 'disabled' })));
    adapter.onModuleInit();
    expect(registry.descriptors().map(({ code }) => code)).toEqual(['farazsms']);
    expect(adapter.descriptor.fields.find(({ key: field }) => field === 'apiToken')?.secret).toBe(true);
    await expect(adapter.testConnection({ apiToken: 'never-used' })).rejects.toMatchObject({ response: { code: 'SMS_TRANSPORT_DISABLED' } });
  });

  it('persists only an HMAC verifier and dispatches a six-digit in-memory code', async () => {
    const created: Record<string, unknown>[] = [];
    const prisma = {
      otpPolicy: { upsert: vi.fn().mockResolvedValue({ enabled: true, codeLength: 6, expiresInSeconds: 120, resendCooldownSeconds: 60, maxVerifyAttempts: 5, phoneRequestLimit: 3, requestWindowSeconds: 900 }) },
      otpChallenge: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(async ({ data }) => { created.push(data); return data; }) },
    };
    const delivery = { sendAuthenticationCode: vi.fn().mockResolvedValue({ outcome: 'ACCEPTED' }) };
    const limiter = { consume: vi.fn().mockResolvedValue(true) };
    const useCase = new OtpAuthenticationUseCase(prisma as never, delivery as never, limiter as never, {} as never, new ConfigService({ OTP_PEPPER: 'otp-pepper-with-at-least-32-bytes-of-entropy-123456' }));
    await useCase.request({ phone: '09123456789', remember: true, idempotencyKey: 'request-1', ipAddress: '127.0.0.1', requestId: 'test' });
    const code = delivery.sendAuthenticationCode.mock.calls[0]?.[2] as string;
    expect(code).toMatch(/^\d{6}$/u);
    expect(created[0]?.verifier).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(created[0])).not.toContain(code);
  });
});
