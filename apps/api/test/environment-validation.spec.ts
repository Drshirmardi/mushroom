import { describe, expect, it } from 'vitest';
import { environmentValidationSchema } from '../src/config/environment.validation';

const base = { DATABASE_URL: 'postgresql://user:password@localhost:5432/test', JWT_ACCESS_SECRET: 'a'.repeat(43), REFRESH_TOKEN_PEPPER: 'b'.repeat(43), OTP_PEPPER: 'c'.repeat(43) };

describe('production-hardening environment validation', () => {
  it('accepts an empty optional example API origin only while Sadad is disabled', () => {
    expect(environmentValidationSchema.validate({ ...base, PUBLIC_API_URL: '', SADAD_TRANSPORT_MODE: 'disabled' }).error).toBeUndefined();
    expect(environmentValidationSchema.validate({ ...base, PUBLIC_API_URL: '', SADAD_TRANSPORT_MODE: 'live' }).error).toBeDefined();
  });
  it('accepts disabled Sadad settings and an explicitly complete live runtime', () => {
    const value = environmentValidationSchema.validate({ ...base, SADAD_TRANSPORT_MODE: 'disabled', SADAD_REQUEST_TIMEOUT_MS: '5000', SADAD_RETURN_URL: 'https://staging.example.test/v1/payments/providers/sadad/callback', SADAD_REDIRECT_PROFILE: 'PDF_PURCHASE', PAYMENT_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString('base64'), PAYMENT_CREDENTIAL_DECRYPTION_KEYS: `v1:${Buffer.alloc(32, 7).toString('base64')}` });
    expect(value.error).toBeUndefined();
    expect(value.value.SADAD_TRANSPORT_MODE).toBe('disabled');
    const live = environmentValidationSchema.validate({ ...base, SADAD_TRANSPORT_MODE: 'live', PUBLIC_API_URL: 'https://dev-api.example.test', SADAD_REQUEST_TIMEOUT_MS: '5000', SADAD_RETURN_URL: 'https://dev-api.example.test/v1/payments/providers/sadad/callback', SADAD_RESULT_URL: 'https://dev-app.example.test/store/order-success', SADAD_REDIRECT_PROFILE: 'PHP_VPG_PURCHASE', PAYMENT_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString('base64') });
    expect(live.error).toBeUndefined();
    expect(live.value).toMatchObject({ SADAD_TRANSPORT_MODE: 'live', SADAD_REDIRECT_PROFILE: 'PHP_VPG_PURCHASE' });
  });

  it('rejects configuration that could be malformed or imply an unreviewed redirect', () => {
    expect(environmentValidationSchema.validate({ ...base, SADAD_TRANSPORT_MODE: 'live' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, SADAD_TRANSPORT_MODE: 'live', PUBLIC_API_URL: 'https://dev-api.example.test', SADAD_RETURN_URL: 'https://dev-api.example.test/v1/payments/providers/sadad/callback', SADAD_RESULT_URL: 'https://dev-app.example.test/store/order-success', SADAD_REDIRECT_PROFILE: 'PHP_VPG_PURCHASE' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, SADAD_RETURN_URL: 'http://example.test/v1/payments/providers/sadad/callback' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, SADAD_RESULT_URL: 'https://dev-app.example.test/store/payment?status=success' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, SADAD_REDIRECT_PROFILE: 'INVENTED_PROFILE' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, PAYMENT_CREDENTIAL_ENCRYPTION_KEY: 'not-a-32-byte-key' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, PAYMENT_CREDENTIAL_DECRYPTION_KEYS: 'v1:not-a-32-byte-key' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...base, PAYMENT_CREDENTIAL_DECRYPTION_KEYS: `v1:${Buffer.alloc(32, 7).toString('base64')},v1:${Buffer.alloc(32, 8).toString('base64')}` }).error).toBeDefined();
  });

  it('keeps SMS transport disabled by default and requires an independent key in live mode', () => {
    expect(environmentValidationSchema.validate(base).value.SMS_TRANSPORT_MODE).toBe('disabled');
    expect(environmentValidationSchema.validate({ ...base, SMS_TRANSPORT_MODE: 'live' }).error).toBeDefined();
    const live = environmentValidationSchema.validate({ ...base, SMS_TRANSPORT_MODE: 'live', SMS_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString('base64') });
    expect(live.error).toBeUndefined();
  });
});
