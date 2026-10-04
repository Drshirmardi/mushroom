import { describe, expect, it } from 'vitest';
import { environmentValidationSchema } from '../src/config/environment.validation';

const base = { DATABASE_URL: 'postgresql://user:password@localhost:5432/test', JWT_ACCESS_SECRET: 'a'.repeat(43), REFRESH_TOKEN_PEPPER: 'b'.repeat(43) };

describe('production-hardening environment validation', () => {
  it('accepts only a disabled Sadad runtime with bounded non-secret settings', () => {
    const value = environmentValidationSchema.validate({ ...base, SADAD_TRANSPORT_MODE: 'disabled', SADAD_REQUEST_TIMEOUT_MS: '5000', SADAD_RETURN_URL: 'https://staging.example.test/v1/payments/providers/sadad/callback', SADAD_REDIRECT_PROFILE: 'PDF_PURCHASE', PAYMENT_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString('base64'), PAYMENT_CREDENTIAL_DECRYPTION_KEYS: `v1:${Buffer.alloc(32, 7).toString('base64')}` });
    expect(value.error).toBeUndefined();
    expect(value.value.SADAD_TRANSPORT_MODE).toBe('disabled');
  });

  it('rejects configuration that could be malformed or imply an unreviewed redirect', () => {
    expect(environmentValidationSchema.validate({ ...base, SADAD_TRANSPORT_MODE: 'live' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, SADAD_RETURN_URL: 'http://example.test/v1/payments/providers/sadad/callback' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, SADAD_REDIRECT_PROFILE: 'INVENTED_PROFILE' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, PAYMENT_CREDENTIAL_ENCRYPTION_KEY: 'not-a-32-byte-key' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, PAYMENT_CREDENTIAL_DECRYPTION_KEYS: 'v1:not-a-32-byte-key' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, PAYMENT_CREDENTIAL_DECRYPTION_KEYS: `v1:${Buffer.alloc(32, 7).toString('base64')},v1:${Buffer.alloc(32, 8).toString('base64')}` }).error).toBeDefined();
  });
});
