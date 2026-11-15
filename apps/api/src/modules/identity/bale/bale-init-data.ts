import { createHmac, timingSafeEqual } from 'node:crypto';

/** A verified Bale user. Never construct it from initDataUnsafe or browser contact data. */
export interface VerifiedBaleUser {
  providerUserId: string;
  firstName: string;
  authDate: number;
  queryId?: string;
}

export class BaleInitDataError extends Error {
  constructor() {
    super('Bale mini-app authentication data is invalid or expired.');
    this.name = 'BaleInitDataError';
  }
}

/**
 * Verify exactly the signed URL-encoded bytes/values defined by Bale.
 * The derived key matches the official WebAppData HMAC-SHA256 protocol.
 */
export function verifyBaleInitData(
  raw: string,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  maxAgeSeconds = 600,
): VerifiedBaleUser {
  if (!botToken || !raw || raw.length > 8192 || !Number.isFinite(nowSeconds)) {
    throw new BaleInitDataError();
  }

  const params = new URLSearchParams(raw);
  const values = [...params.entries()];
  const names = new Set(values.map(([key]) => key));
  if (names.size !== values.length || values.length < 3) throw new BaleInitDataError();

  const hash = params.get('hash');
  const authDateRaw = params.get('auth_date');
  const userRaw = params.get('user');
  if (!hash || !/^[a-f\d]{64}$/iu.test(hash) || !authDateRaw || !/^\d{1,12}$/u.test(authDateRaw) || !userRaw) {
    throw new BaleInitDataError();
  }

  const checkString = values
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(checkString).digest();
  const received = Buffer.from(hash, 'hex');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new BaleInitDataError();
  }

  const authDate = Number(authDateRaw);
  if (!Number.isSafeInteger(authDate) || authDate > nowSeconds + 30 || nowSeconds - authDate > maxAgeSeconds) {
    throw new BaleInitDataError();
  }

  let user: unknown;
  try {
    user = JSON.parse(userRaw);
  } catch {
    throw new BaleInitDataError();
  }

  if (typeof user !== 'object' || user === null || Array.isArray(user)) throw new BaleInitDataError();
  const record = user as Record<string, unknown>;
  if (typeof record.id !== 'number' || !Number.isSafeInteger(record.id) || record.id <= 0 ||
    typeof record.first_name !== 'string' || record.first_name.length > 200) {
    throw new BaleInitDataError();
  }

  return {
    providerUserId: String(record.id),
    firstName: record.first_name,
    authDate,
    queryId: params.get('query_id') ?? undefined,
  };
}
