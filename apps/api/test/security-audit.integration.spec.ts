import { randomInt } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { SECURITY_AUDIT_ACTIONS } from '../src/modules/identity/application/security-audit';

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

describe('security audit trail (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let accessTokens: AccessTokenService;
  let userId: string | undefined;
  const createdPhones = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    accessTokens = app.get(AccessTokenService);
  }, 30_000);

  afterEach(async () => {
    await prisma.authRateLimitBucket.deleteMany();
    if (userId) {
      await prisma.auditEvent.deleteMany({ where: { actorUserId: userId } });
    }
    if (createdPhones.size > 0) {
      await prisma.loginAttempt.deleteMany({
        where: { phone: { in: [...createdPhones] } },
      });
      await prisma.patientProfile.deleteMany({
        where: { user: { phone: { in: [...createdPhones] } } },
      });
      await prisma.user.deleteMany({
        where: { phone: { in: [...createdPhones] } },
      });
    }
    userId = undefined;
    createdPhones.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const requestHeaders = (requestId: string) => ({
    origin: allowedOrigin,
    'x-request-id': requestId,
  });

  const authorization = (accessToken: string, requestId: string) => ({
    ...requestHeaders(requestId),
    authorization: `Bearer ${accessToken}`,
  });

  const login = async (
    phone: string,
    candidatePassword: string,
    requestId: string,
  ) => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: {
        ...requestHeaders(requestId),
        'user-agent': 'audit-test-agent',
      },
      payload: { phone, password: candidatePassword, remember: false },
    });
    expect(response.statusCode).toBe(200);

    return {
      accessToken: response.json().accessToken as string,
      cookie: getCookiePair(getSetCookie(response.headers)),
    };
  };

  it('records state changes atomically with safe request context', async () => {
    const localPhone = createLocalPhone();
    const register = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      headers: requestHeaders('audit-register'),
      payload: { phone: localPhone, password },
    });
    expect(register.statusCode).toBe(201);
    userId = register.json().id;
    createdPhones.add(register.json().phone);

    const firstLogin = await login(
      register.json().phone,
      password,
      'audit-login-first',
    );
    const secondLogin = await login(
      register.json().phone,
      password,
      'audit-login-second',
    );
    const firstPrincipal = await accessTokens.verify(firstLogin.accessToken);
    const secondPrincipal = await accessTokens.verify(secondLogin.accessToken);

    const revoke = await app.inject({
      method: 'DELETE',
      url: `/v1/auth/sessions/${firstPrincipal.sessionId}`,
      headers: authorization(secondLogin.accessToken, 'audit-revoke'),
    });
    expect(revoke.statusCode).toBe(204);
    const repeatedRevoke = await app.inject({
      method: 'DELETE',
      url: `/v1/auth/sessions/${firstPrincipal.sessionId}`,
      headers: authorization(secondLogin.accessToken, 'audit-revoke-repeat'),
    });
    expect(repeatedRevoke.statusCode).toBe(204);

    const logoutAll = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout-all',
      headers: authorization(secondLogin.accessToken, 'audit-logout-all'),
    });
    expect(logoutAll.statusCode).toBe(204);

    const thirdLogin = await login(
      register.json().phone,
      password,
      'audit-login-third',
    );
    const replacementLocalPhone = createLocalPhone();
    const replacementCanonical = `+98${replacementLocalPhone.slice(1)}`;
    const phoneChange = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: authorization(thirdLogin.accessToken, 'audit-phone'),
      payload: { currentPassword: password, phone: replacementLocalPhone },
    });
    expect(phoneChange.statusCode).toBe(200);
    createdPhones.add(replacementCanonical);

    const passwordChange = await app.inject({
      method: 'POST',
      url: '/v1/me/change-password',
      headers: authorization(thirdLogin.accessToken, 'audit-password'),
      payload: { currentPassword: password, newPassword },
    });
    expect(passwordChange.statusCode).toBe(204);

    const fourthLogin = await login(
      replacementCanonical,
      newPassword,
      'audit-login-fourth',
    );
    const fourthPrincipal = await accessTokens.verify(fourthLogin.accessToken);
    const logout = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: authorization(fourthLogin.accessToken, 'audit-logout'),
    });
    expect(logout.statusCode).toBe(204);

    const reuseLogin = await login(
      replacementCanonical,
      newPassword,
      'audit-login-reuse',
    );
    const rotate = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: {
        ...requestHeaders('audit-rotate'),
        cookie: reuseLogin.cookie,
      },
    });
    expect(rotate.statusCode).toBe(200);
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { previousRefreshTokenExpiresAt: new Date(Date.now() - 1) },
    });
    const reuse = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: {
        ...requestHeaders('audit-reuse'),
        cookie: reuseLogin.cookie,
      },
    });
    expect(reuse.statusCode).toBe(401);

    const events = await prisma.auditEvent.findMany({
      where: { actorUserId: userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const byRequestId = new Map(events.map((event) => [event.requestId, event]));

    expect(byRequestId.get('audit-register')).toMatchObject({
      action: SECURITY_AUDIT_ACTIONS.ACCOUNT_REGISTERED,
      actorUserId: userId,
      actorSessionId: null,
      subjectType: 'USER',
      subjectId: userId,
      ipAddress: '127.0.0.1',
      metadata: { initialRole: 'PATIENT' },
    });
    expect(byRequestId.get('audit-login-first')).toMatchObject({
      action: SECURITY_AUDIT_ACTIONS.SESSION_CREATED,
      actorSessionId: firstPrincipal.sessionId,
      subjectType: 'SESSION',
      subjectId: firstPrincipal.sessionId,
      metadata: { remembered: false },
    });
    expect(byRequestId.get('audit-revoke')).toMatchObject({
      action: SECURITY_AUDIT_ACTIONS.SESSION_REVOKED,
      actorSessionId: secondPrincipal.sessionId,
      subjectId: firstPrincipal.sessionId,
      metadata: { reason: 'LOGOUT' },
    });
    expect(byRequestId.has('audit-revoke-repeat')).toBe(false);
    expect(byRequestId.get('audit-logout-all')).toMatchObject({
      action: SECURITY_AUDIT_ACTIONS.SESSIONS_LOGGED_OUT_ALL,
      subjectType: 'USER',
      subjectId: userId,
      metadata: { reason: 'LOGOUT_ALL', revokedSessionCount: 1 },
    });
    expect(byRequestId.get('audit-phone')).toMatchObject({
      action: SECURITY_AUDIT_ACTIONS.ACCOUNT_PHONE_CHANGED,
      subjectId: userId,
      metadata: {},
    });
    expect(byRequestId.get('audit-password')).toMatchObject({
      action: SECURITY_AUDIT_ACTIONS.ACCOUNT_PASSWORD_CHANGED,
      subjectId: userId,
      metadata: { revokedSessionCount: 1 },
    });
    expect(byRequestId.get('audit-logout')).toMatchObject({
      action: SECURITY_AUDIT_ACTIONS.SESSION_LOGGED_OUT,
      actorSessionId: fourthPrincipal.sessionId,
      subjectId: fourthPrincipal.sessionId,
    });
    expect(byRequestId.get('audit-reuse')).toMatchObject({
      action: SECURITY_AUDIT_ACTIONS.SESSION_REFRESH_REUSE_DETECTED,
      subjectType: 'SESSION',
      metadata: { generation: 1 },
    });

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(password);
    expect(serialized).not.toContain(newPassword);
    expect(serialized).not.toContain(register.json().phone);
    expect(serialized).not.toContain(replacementCanonical);
    expect(serialized).not.toContain('audit-test-agent');
    expect(serialized).not.toContain(reuseLogin.cookie);
  }, 30_000);
});
