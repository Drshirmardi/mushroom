import { randomInt } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

const allowedOrigin = 'http://localhost:3000';
const password = 'correct horse battery staple';
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

describe('session management (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let accessTokens: AccessTokenService;
  const createdPhones = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    accessTokens = app.get(AccessTokenService);
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

  const login = async (phone: string, userAgent: string) => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { origin: allowedOrigin, 'user-agent': userAgent },
      payload: { phone, password, remember: false },
    });
    expect(response.statusCode).toBe(200);

    return {
      accessToken: response.json().accessToken as string,
      cookie: getCookiePair(getSetCookie(response.headers)),
    };
  };

  const authorization = (accessToken: string) => ({
    authorization: `Bearer ${accessToken}`,
    origin: allowedOrigin,
  });

  it('logs out the current session idempotently and clears its cookie', async () => {
    const phone = await register();
    const loginResult = await login(phone, 'current-device');
    const principal = await accessTokens.verify(loginResult.accessToken);

    const first = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: authorization(loginResult.accessToken),
    });
    const second = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: authorization(loginResult.accessToken),
    });
    const refresh = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: { origin: allowedOrigin, cookie: loginResult.cookie },
    });
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: principal.sessionId },
    });

    expect(first.statusCode).toBe(204);
    expect(second.statusCode).toBe(204);
    expect(getSetCookie(first.headers)).toMatch(/^sz_refresh_dev=;/);
    expect(refresh.statusCode).toBe(401);
    expect(session.revokedReason).toBe('LOGOUT');
    expect(session.revokedAt).toBeInstanceOf(Date);
  });

  it('returns paginated safe metadata and identifies the current session', async () => {
    const phone = await register();
    const firstLogin = await login(phone, 'first-sensitive-agent');
    const secondLogin = await login(phone, 'second-sensitive-agent');
    const current = await accessTokens.verify(secondLogin.accessToken);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/sessions?page=1&limit=1',
      headers: authorization(secondLogin.accessToken),
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ page: 1, limit: 1, total: 2 });
    expect(body.items).toHaveLength(1);
    expect(Object.keys(body.items[0]).sort()).toEqual([
      'createdAt',
      'current',
      'expiresAt',
      'id',
      'lastUsedAt',
      'remembered',
    ]);
    expect(JSON.stringify(body)).not.toMatch(/hash|token|ip|userAgent|sensitive-agent/i);

    const all = await app.inject({
      method: 'GET',
      url: '/v1/auth/sessions?limit=20',
      headers: authorization(secondLogin.accessToken),
    });
    expect(all.json().items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: current.sessionId, current: true }),
    ]));
    expect(firstLogin.accessToken).not.toBe(secondLogin.accessToken);
  });

  it('revokes only an owned selected session without revealing ownership', async () => {
    const ownerPhone = await register();
    const ownerCurrent = await login(ownerPhone, 'owner-current');
    const ownerOther = await login(ownerPhone, 'owner-other');
    const foreignPhone = await register();
    const foreign = await login(foreignPhone, 'foreign-device');
    const currentPrincipal = await accessTokens.verify(ownerCurrent.accessToken);
    const otherPrincipal = await accessTokens.verify(ownerOther.accessToken);
    const foreignPrincipal = await accessTokens.verify(foreign.accessToken);

    const ownedResponse = await app.inject({
      method: 'DELETE',
      url: `/v1/auth/sessions/${otherPrincipal.sessionId}`,
      headers: authorization(ownerCurrent.accessToken),
    });
    const foreignResponse = await app.inject({
      method: 'DELETE',
      url: `/v1/auth/sessions/${foreignPrincipal.sessionId}`,
      headers: authorization(ownerCurrent.accessToken),
    });
    const currentResponse = await app.inject({
      method: 'DELETE',
      url: `/v1/auth/sessions/${currentPrincipal.sessionId}`,
      headers: authorization(ownerCurrent.accessToken),
    });
    const [ownedSession, foreignSession] = await Promise.all([
      prisma.session.findUniqueOrThrow({ where: { id: otherPrincipal.sessionId } }),
      prisma.session.findUniqueOrThrow({ where: { id: foreignPrincipal.sessionId } }),
    ]);

    expect(ownedResponse.statusCode).toBe(204);
    expect(foreignResponse.statusCode).toBe(204);
    expect(currentResponse.statusCode).toBe(204);
    expect(ownedResponse.headers['set-cookie']).toBeUndefined();
    expect(getSetCookie(currentResponse.headers)).toMatch(/^sz_refresh_dev=;/);
    expect(ownedSession.revokedReason).toBe('LOGOUT');
    expect(foreignSession.revokedAt).toBeNull();
  });

  it('revokes every owned session with logout-all and leaves other users active', async () => {
    const phone = await register();
    const first = await login(phone, 'first-device');
    await login(phone, 'second-device');
    const foreignPhone = await register();
    const foreign = await login(foreignPhone, 'foreign-device');
    const foreignPrincipal = await accessTokens.verify(foreign.accessToken);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout-all',
      headers: authorization(first.accessToken),
    });
    const repeated = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout-all',
      headers: authorization(first.accessToken),
    });
    const ownedSessions = await prisma.session.findMany({
      where: { user: { phone } },
    });
    const foreignSession = await prisma.session.findUniqueOrThrow({
      where: { id: foreignPrincipal.sessionId },
    });

    expect(response.statusCode).toBe(204);
    expect(repeated.statusCode).toBe(204);
    expect(getSetCookie(response.headers)).toMatch(/^sz_refresh_dev=;/);
    expect(ownedSessions).toHaveLength(2);
    expect(ownedSessions.every(({ revokedReason }) => revokedReason === 'LOGOUT_ALL'))
      .toBe(true);
    expect(foreignSession.revokedAt).toBeNull();
  });

  it('requires bearer authentication and validates origin, ids and pagination', async () => {
    const phone = await register();
    const loginResult = await login(phone, 'validation-device');

    const unauthenticated = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: { origin: allowedOrigin },
    });
    const forbidden = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: {
        authorization: `Bearer ${loginResult.accessToken}`,
        origin: 'https://evil.example',
      },
    });
    const badId = await app.inject({
      method: 'DELETE',
      url: '/v1/auth/sessions/not-a-uuid',
      headers: authorization(loginResult.accessToken),
    });
    const badPage = await app.inject({
      method: 'GET',
      url: '/v1/auth/sessions?page=0&limit=51',
      headers: authorization(loginResult.accessToken),
    });

    expect(unauthenticated.statusCode).toBe(401);
    expect(forbidden.statusCode).toBe(403);
    expect(badId.statusCode).toBe(400);
    expect(badPage.statusCode).toBe(400);
  });

  it('publishes protected session-management endpoints in OpenAPI', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs-json' });
    const paths = response.json().paths;

    expect(paths['/v1/auth/logout']?.post?.security).toBeDefined();
    expect(paths['/v1/auth/logout-all']?.post?.security).toBeDefined();
    expect(paths['/v1/auth/sessions']?.get?.security).toBeDefined();
    expect(paths['/v1/auth/sessions/{id}']?.delete?.security).toBeDefined();
  });
});
