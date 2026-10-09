import { randomInt } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { HmacRefreshTokenManager } from '../src/modules/identity/infrastructure/hmac-refresh-token-manager';

const allowedOrigin = 'http://localhost:3000';
const password = 'correct horse battery staple';
const createLocalPhone = (): string =>
  `09${randomInt(100_000_000, 1_000_000_000)}`;

const getSetCookie = (headers: Record<string, unknown>): string => {
  const value = headers['set-cookie'];

  return Array.isArray(value) ? value.join('; ') : String(value ?? '');
};

const getCookie = (setCookie: string): { pair: string; token: string } => {
  const match = /^sz_refresh_dev=([^;]+)/.exec(setCookie);
  if (!match?.[1]) throw new Error('Refresh cookie was not set.');

  return {
    pair: `sz_refresh_dev=${match[1]}`,
    token: match[1],
  };
};

describe('login and refresh sessions (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let accessTokens: AccessTokenService;
  let refreshTokens: HmacRefreshTokenManager;
  const createdPhones = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    accessTokens = app.get(AccessTokenService);
    refreshTokens = app.get(HmacRefreshTokenManager);
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

  const login = async (phone: string, remember = false) => app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    headers: {
      origin: allowedOrigin,
      'user-agent': 'integration-test-agent',
    },
    payload: { phone, password, remember },
  });

  const refresh = async (cookiePair: string) => app.inject({
    method: 'POST',
    url: '/v1/auth/refresh',
    headers: {
      origin: allowedOrigin,
      cookie: cookiePair,
      'user-agent': 'rotated-integration-agent',
    },
  });

  it('creates a 24-hour session and returns only access credentials in JSON', async () => {
    const phone = await register();
    const response = await login(phone);
    const body = response.json();
    const setCookie = getSetCookie(response.headers);
    const cookie = getCookie(setCookie);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 600,
      user: { phone, roles: ['PATIENT'] },
    });
    expect(body.accessToken).toEqual(expect.any(String));
    expect(JSON.stringify(body)).not.toMatch(/refresh|password|hash/i);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).not.toContain('Secure');
    expect(setCookie).not.toContain('Domain=');

    const session = await prisma.session.findFirstOrThrow({
      where: { user: { phone } },
    });
    const inspected = refreshTokens.inspect(cookie.token);
    const principal = await accessTokens.verify(body.accessToken);

    expect(session.remembered).toBe(false);
    expect(session.refreshGeneration).toBe(0);
    expect(session.refreshTokenHash).toBe(inspected?.tokenHash);
    expect(session.refreshTokenHash).not.toBe(cookie.token);
    expect(session.ipAddress).toBe('127.0.0.1');
    expect(session.userAgent).toBe('integration-test-agent');
    expect(session.expiresAt.getTime() - session.createdAt.getTime())
      .toBeGreaterThanOrEqual(24 * 60 * 60 * 1_000 - 2_000);
    expect(principal).toMatchObject({
      userId: body.user.id,
      sessionId: session.id,
      roles: ['PATIENT'],
    });
  });

  it('uses the 30-day absolute deadline when remember is true', async () => {
    const phone = await register();
    const response = await login(phone, true);
    const setCookie = getSetCookie(response.headers);
    const maxAge = Number(/Max-Age=(\d+)/.exec(setCookie)?.[1]);
    const session = await prisma.session.findFirstOrThrow({
      where: { user: { phone } },
    });

    expect(response.statusCode).toBe(200);
    expect(session.remembered).toBe(true);
    expect(maxAge).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 - 2);
    expect(maxAge).toBeLessThanOrEqual(30 * 24 * 60 * 60);
  });

  it('maps invalid credentials and login rate limits without setting a cookie', async () => {
    const phone = await register();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const invalid = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        headers: { origin: allowedOrigin },
        payload: {
          phone,
          password: `incorrect password attempt ${attempt}`,
          remember: false,
        },
      });

      expect(invalid.statusCode).toBe(401);
      expect(invalid.json()).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid phone number or password.',
        details: {},
      });
      expect(invalid.headers['set-cookie']).toBeUndefined();
    }

    const limited = await login(phone);

    expect(limited.statusCode).toBe(429);
    expect(limited.json().code).toBe('LOGIN_RATE_LIMITED');
    expect(limited.headers['set-cookie']).toBeUndefined();
    await expect(prisma.session.count({ where: { user: { phone } } }))
      .resolves.toBe(0);
  });

  it('rotates the cookie and stored hash without extending the deadline', async () => {
    const phone = await register();
    const loginResponse = await login(phone);
    const firstCookie = getCookie(getSetCookie(loginResponse.headers));
    const initialSession = await prisma.session.findFirstOrThrow({
      where: { user: { phone } },
    });

    const response = await refresh(firstCookie.pair);
    const rotatedCookie = getCookie(getSetCookie(response.headers));
    const rotatedSession = await prisma.session.findUniqueOrThrow({
      where: { id: initialSession.id },
    });

    expect(response.statusCode).toBe(200);
    expect(rotatedCookie.token).not.toBe(firstCookie.token);
    expect(response.json().accessToken).not.toBe(loginResponse.json().accessToken);
    expect(rotatedSession.refreshGeneration).toBe(1);
    expect(rotatedSession.refreshTokenHash)
      .toBe(refreshTokens.inspect(rotatedCookie.token)?.tokenHash);
    expect(rotatedSession.expiresAt).toEqual(initialSession.expiresAt);
    expect(rotatedSession.userAgent).toBe('rotated-integration-agent');
  });

  it('revokes the session when a rotated token is reused', async () => {
    const phone = await register();
    const loginResponse = await login(phone);
    const originalCookie = getCookie(getSetCookie(loginResponse.headers));
    const session = await prisma.session.findFirstOrThrow({
      where: { user: { phone } },
    });
    expect((await refresh(originalCookie.pair)).statusCode).toBe(200);
    await prisma.session.update({
      where: { id: session.id },
      data: { previousRefreshTokenExpiresAt: new Date(Date.now() - 1_000) },
    });

    const reuseResponse = await refresh(originalCookie.pair);
    const revokedSession = await prisma.session.findUniqueOrThrow({
      where: { id: session.id },
    });

    expect(reuseResponse.statusCode).toBe(401);
    expect(reuseResponse.json().code).toBe('INVALID_REFRESH_TOKEN');
    expect(getSetCookie(reuseResponse.headers)).toMatch(/^sz_refresh_dev=;/);
    expect(revokedSession.revokedReason).toBe('REFRESH_REUSE_DETECTED');
    expect(revokedSession.revokedAt).toBeInstanceOf(Date);
  });

  it('allows one concurrent refresh and asks the stale-cookie request to retry', async () => {
    const phone = await register();
    const loginResponse = await login(phone);
    const originalCookie = getCookie(getSetCookie(loginResponse.headers));
    const session = await prisma.session.findFirstOrThrow({
      where: { user: { phone } },
    });

    const responses = await Promise.all([
      refresh(originalCookie.pair),
      refresh(originalCookie.pair),
    ]);
    const persisted = await prisma.session.findUniqueOrThrow({
      where: { id: session.id },
    });

    expect(responses.map(({ statusCode }) => statusCode).sort())
      .toEqual([200, 409]);
    expect(persisted.refreshGeneration).toBe(1);
    expect(persisted.revokedAt).toBeNull();
    expect(responses.find(({ statusCode }) => statusCode === 409)?.json().code)
      .toBe('REFRESH_CONCURRENT_RETRY');
  });

  it('revokes an active session when its user becomes disabled', async () => {
    const phone = await register();
    const loginResponse = await login(phone);
    const cookie = getCookie(getSetCookie(loginResponse.headers));
    await prisma.user.update({
      where: { phone },
      data: { status: 'DISABLED' },
    });

    const response = await refresh(cookie.pair);
    const session = await prisma.session.findFirstOrThrow({
      where: { user: { phone } },
    });

    expect(response.statusCode).toBe(401);
    expect(session.revokedReason).toBe('ADMIN_REVOKED');
  });

  it('clears missing refresh cookies and rejects unknown browser origins', async () => {
    const missingCookie = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: { origin: allowedOrigin },
    });
    const forbiddenOrigin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { origin: 'https://evil.example' },
      payload: {
        phone: createLocalPhone(),
        password,
        remember: false,
      },
    });

    expect(missingCookie.statusCode).toBe(401);
    expect(missingCookie.json().code).toBe('INVALID_REFRESH_TOKEN');
    expect(getSetCookie(missingCookie.headers)).toMatch(/^sz_refresh_dev=;/);
    expect(forbiddenOrigin.statusCode).toBe(403);
    expect(forbiddenOrigin.json().code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('publishes login and refresh paths without exposing refresh input in OpenAPI', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs-json' });
    const paths = response.json().paths;

    expect(paths['/v1/auth/login']?.post).toBeDefined();
    expect(paths['/v1/auth/refresh']?.post).toBeDefined();
    expect(paths['/v1/auth/refresh']?.post?.requestBody).toBeUndefined();
  });
});
