import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyBaleInitData, BaleInitDataError } from '../src/modules/identity/bale/bale-init-data';

const TOKEN = '123456789:test-bot-token';
const NOW = 1_800_000_000;

function signedData(overrides: Record<string, string> = {}): string {
  const values = {
    auth_date: String(NOW - 60),
    query_id: 'session-123',
    user: JSON.stringify({ id: 123456789, first_name: 'Test User' }),
    ...overrides,
  };
  const check = Object.entries(values).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const hash = createHmac('sha256', secret).update(check).digest('hex');
  return new URLSearchParams({ ...values, hash }).toString();
}

describe('Bale mini-app initData signature verification', () => {
  it('accepts a valid signed user and preserves the provider id as a string', () => {
    expect(verifyBaleInitData(signedData(), TOKEN, NOW)).toMatchObject({
      providerUserId: '123456789',
      firstName: 'Test User',
      authDate: NOW - 60,
    });
  });

  it('rejects tampered data', () => {
    const data = signedData().replace('session-123', 'session-evil');
    expect(() => verifyBaleInitData(data, TOKEN, NOW)).toThrow(BaleInitDataError);
  });

  it('rejects an expired signature even when the HMAC is correct', () => {
    expect(() => verifyBaleInitData(signedData({ auth_date: String(NOW - 601) }), TOKEN, NOW)).toThrow(BaleInitDataError);
  });

  it('rejects a future signature', () => {
    expect(() => verifyBaleInitData(signedData({ auth_date: String(NOW + 60) }), TOKEN, NOW)).toThrow(BaleInitDataError);
  });

  it('rejects duplicate fields and malformed JSON', () => {
    expect(() => verifyBaleInitData(signedData() + '&user=%7B%7D', TOKEN, NOW)).toThrow(BaleInitDataError);
    expect(() => verifyBaleInitData(signedData({ user: '{' }), TOKEN, NOW)).toThrow(BaleInitDataError);
  });

  it('rejects a wrong bot token or a missing user', () => {
    expect(() => verifyBaleInitData(signedData(), 'different-token', NOW)).toThrow(BaleInitDataError);
    expect(() => verifyBaleInitData(signedData({ user: '{}' }), TOKEN, NOW)).toThrow(BaleInitDataError);
  });
});
