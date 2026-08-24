import { randomInt } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';

const allowedOrigin = 'http://localhost:3000';
const password = 'correct horse battery staple';
const newPassword = 'a different secure password value';
const createLocalPhone = (): string =>
  `09${randomInt(100_000_000, 1_000_000_000)}`;

const getSetCookie = (headers: Record<string, unknown>): string => {
  const value = headers['set-cookie'];

  return Array.isArray(value) ? value.join('; ') : String(value ?? '');
};

const getCookiePair = (setCookie: string): string => {
  const match = /^sz_refresh_dev=([^;]+)/.exec(setCookie);
  if (!match?.[1]) throw new Error('Refresh cookie was not set.');

  return `sz_refresh_dev=${match[1]}`;
};

describe('current account (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const createdPhones = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
  }, 30_000);

  afterEach(async () => {
    await prisma.authRateLimitBucket.deleteMany();
    if (createdPhones.size === 0) return;

    await prisma.loginAttempt.deleteMany({
      where: { phone: { in: [...createdPhones] } },
    });
    await prisma.patientProfile.deleteMany({
      where: { user: { phone: { in: [...createdPhones] } } },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: [...createdPhones] } },
    });
    createdPhones.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const register = async (): Promise<string> => {
    const phone = createLocalPhone();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      headers: { origin: allowedOrigin },
      payload: { phone, password },
    });
    const canonicalPhone = response.json().phone as string;
    createdPhones.add(canonicalPhone);
    expect(response.statusCode).toBe(201);

    return canonicalPhone;
  };

  const login = async (phone: string, candidatePassword = password) => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { origin: allowedOrigin, 'user-agent': 'me-test-device' },
      payload: { phone, password: candidatePassword, remember: false },
    });

    return response;
  };

  const authorization = (accessToken: string) => ({
    authorization: `Bearer ${accessToken}`,
    origin: allowedOrigin,
  });

  it('returns the database-backed current account without sensitive fields', async () => {
    const phone = await register();
    const loginResponse = await login(phone);
    const response = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: authorization(loginResponse.json().accessToken),
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ phone, status: 'ACTIVE', roles: ['PATIENT'] });
    expect(Object.keys(body).sort()).toEqual([
      'createdAt',
      'id',
      'passwordChangedAt',
      'phone',
      'roles',
      'status',
    ]);
    expect(JSON.stringify(body)).not.toMatch(/hash|token|credential/i);
  });

  it('changes and canonicalizes the login phone after current-password verification', async () => {
    const phone = await register();
    const loginResponse = await login(phone);
    const replacementLocalPhone = createLocalPhone();
    const replacementCanonical = `+98${replacementLocalPhone.slice(1)}`;

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: authorization(loginResponse.json().accessToken),
      payload: {
        currentPassword: password,
        phone: replacementLocalPhone,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().phone).toBe(replacementCanonical);
    createdPhones.add(replacementCanonical);
    expect((await login(phone)).statusCode).toBe(401);
    expect((await login(replacementCanonical)).statusCode).toBe(200);
  });

  it('rejects invalid, duplicate and unauthenticated phone changes', async () => {
    const phone = await register();
    const occupiedPhone = await register();
    const loginResponse = await login(phone);
    const token = loginResponse.json().accessToken;

    const wrongPassword = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: authorization(token),
      payload: { currentPassword: 'incorrect current password', phone: 'not-a-phone' },
    });
    const invalidPhone = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: authorization(token),
      payload: { currentPassword: password, phone: 'not-a-phone' },
    });
    const duplicate = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: authorization(token),
      payload: { currentPassword: password, phone: occupiedPhone },
    });

    expect(wrongPassword.statusCode).toBe(401);
    expect(wrongPassword.json().code).toBe('INVALID_CURRENT_PASSWORD');
    expect(invalidPhone.statusCode).toBe(422);
    expect(invalidPhone.json().code).toBe('INVALID_PHONE_NUMBER');
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().code).toBe('PHONE_ALREADY_REGISTERED');
  });

  it('treats an unchanged canonical phone idempotently without exposing credentials', async () => {
    const phone = await register();
    const loginResponse = await login(phone);
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: authorization(loginResponse.json().accessToken),
      payload: { currentPassword: password, phone: phone.replace('+98', '0') },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().phone).toBe(phone);
    expect(Object.keys(response.json()).sort()).toEqual([
      'createdAt',
      'id',
      'passwordChangedAt',
      'phone',
      'roles',
      'status',
    ]);
  });

  it('changes the password atomically, revokes all sessions and clears the cookie', async () => {
    const phone = await register();
    const firstLogin = await login(phone);
    const secondLogin = await login(phone);
    const oldRefreshCookie = getCookiePair(getSetCookie(firstLogin.headers));
    const before = await prisma.credential.findFirstOrThrow({
      where: { user: { phone } },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/me/change-password',
      headers: authorization(firstLogin.json().accessToken),
      payload: { currentPassword: password, newPassword },
    });
    const credential = await prisma.credential.findFirstOrThrow({
      where: { user: { phone } },
    });
    const sessions = await prisma.session.findMany({
      where: { user: { phone } },
    });
    const oldRefresh = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: { origin: allowedOrigin, cookie: oldRefreshCookie },
    });

    expect(response.statusCode).toBe(204);
    expect(getSetCookie(response.headers)).toMatch(/^sz_refresh_dev=;/);
    expect(credential.passwordHash).not.toBe(before.passwordHash);
    expect(credential.passwordChangedAt.getTime())
      .toBeGreaterThan(before.passwordChangedAt.getTime());
    expect(sessions).toHaveLength(2);
    expect(sessions.every(({ revokedReason }) => revokedReason === 'PASSWORD_CHANGED'))
      .toBe(true);
    expect(oldRefresh.statusCode).toBe(401);
    expect((await login(phone)).statusCode).toBe(401);
    expect((await login(phone, newPassword)).statusCode).toBe(200);
    expect(secondLogin.json().accessToken).toEqual(expect.any(String));
  });

  it('does not mutate credentials or sessions for invalid password changes', async () => {
    const phone = await register();
    const loginResponse = await login(phone);
    const token = loginResponse.json().accessToken;
    const before = await prisma.credential.findFirstOrThrow({
      where: { user: { phone } },
    });

    const wrongCurrent = await app.inject({
      method: 'POST',
      url: '/v1/me/change-password',
      headers: authorization(token),
      payload: { currentPassword: 'incorrect current password', newPassword },
    });
    const unchanged = await app.inject({
      method: 'POST',
      url: '/v1/me/change-password',
      headers: authorization(token),
      payload: { currentPassword: password, newPassword: password },
    });
    const weak = await app.inject({
      method: 'POST',
      url: '/v1/me/change-password',
      headers: authorization(token),
      payload: { currentPassword: password, newPassword: 'too short' },
    });
    const after = await prisma.credential.findUniqueOrThrow({
      where: { id: before.id },
    });
    const session = await prisma.session.findFirstOrThrow({
      where: { user: { phone } },
    });

    expect(wrongCurrent.statusCode).toBe(401);
    expect(wrongCurrent.json().code).toBe('INVALID_CURRENT_PASSWORD');
    expect(unchanged.statusCode).toBe(422);
    expect(unchanged.json().code).toBe('PASSWORD_UNCHANGED');
    expect(weak.statusCode).toBe(422);
    expect(weak.json().code).toBe('PASSWORD_TOO_SHORT');
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.passwordChangedAt).toEqual(before.passwordChangedAt);
    expect(session.revokedAt).toBeNull();
  });

  it('allows only one concurrent password change from the same old credential', async () => {
    const phone = await register();
    const loginResponse = await login(phone);
    const request = (candidate: string) => app.inject({
      method: 'POST',
      url: '/v1/me/change-password',
      headers: authorization(loginResponse.json().accessToken),
      payload: { currentPassword: password, newPassword: candidate },
    });

    const responses = await Promise.all([
      request('first concurrent secure password'),
      request('second concurrent secure password'),
    ]);

    expect(responses.map(({ statusCode }) => statusCode).sort())
      .toEqual([204, 401]);
  });

  it('rejects disabled accounts and unknown origins from current-account operations', async () => {
    const phone = await register();
    const loginResponse = await login(phone);
    const token = loginResponse.json().accessToken;
    await prisma.user.update({ where: { phone }, data: { status: 'DISABLED' } });

    const disabled = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: authorization(token),
    });
    const forbidden = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: { authorization: `Bearer ${token}`, origin: 'https://evil.example' },
      payload: { currentPassword: password, phone },
    });

    expect(disabled.statusCode).toBe(401);
    expect(forbidden.statusCode).toBe(403);
  });

  it('publishes protected current-account endpoints in OpenAPI', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs-json' });
    const paths = response.json().paths;

    expect(paths['/v1/me']?.get?.security).toBeDefined();
    expect(paths['/v1/me']?.patch?.security).toBeDefined();
    expect(paths['/v1/me/change-password']?.post?.security).toBeDefined();
  });
});
