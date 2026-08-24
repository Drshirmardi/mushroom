import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';

import {
  ACCESS_TOKEN_ALGORITHM,
  ACCESS_TOKEN_TTL_SECONDS,
  AccessTokenService,
  InvalidAccessTokenError,
} from '../src/common/auth/access-token.service';
import { environmentValidationSchema } from '../src/config/environment.validation';

const secret = 'test-only-access-secret-that-is-at-least-32-characters';
const wrongSecret = 'different-test-secret-that-is-at-least-32-characters';
const issuer = 'test-api';
const audience = 'test-frontends';
const now = new Date('2026-08-22T12:00:00.000Z');
const issuedAt = Math.floor(now.getTime() / 1_000);
const userId = '37694db4-23a5-4498-a49d-135fc98de279';
const sessionId = 'df846b14-c123-45bd-8efe-58220999e940';
const tokenId = '62d6fd3b-306d-42bc-ae8f-df508178136a';

const jwt = new JwtService();
const service = new AccessTokenService(
  jwt,
  new ConfigService({
    JWT_ACCESS_SECRET: secret,
    JWT_ACCESS_ISSUER: issuer,
    JWT_ACCESS_AUDIENCE: audience,
  }),
  () => now,
);

const payload = (overrides: Record<string, unknown> = {}) => ({
  iss: issuer,
  aud: audience,
  sub: userId,
  sid: sessionId,
  roles: ['PATIENT'],
  jti: tokenId,
  iat: issuedAt,
  exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
  ...overrides,
});

const sign = (
  overrides: Record<string, unknown> = {},
  algorithm: 'HS256' | 'HS384' = ACCESS_TOKEN_ALGORITHM,
  signingSecret = secret,
): string => jwt.sign(payload(overrides), {
  secret: signingSecret,
  algorithm,
  header: { alg: algorithm, typ: 'JWT' },
});

describe('AccessTokenService', () => {
  it('issues a ten-minute HS256 token with only the approved claims', async () => {
    const token = await service.issue({
      userId,
      sessionId,
      roles: ['PATIENT', 'DOCTOR'],
    });
    const decoded = jwt.decode(token, { complete: true }) as {
      header: Record<string, unknown>;
      payload: Record<string, unknown>;
    };

    expect(decoded.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(Object.keys(decoded.payload).sort()).toEqual([
      'aud',
      'exp',
      'iat',
      'iss',
      'jti',
      'roles',
      'sid',
      'sub',
    ]);
    expect(decoded.payload).toMatchObject({
      iss: issuer,
      aud: audience,
      sub: userId,
      sid: sessionId,
      roles: ['PATIENT', 'DOCTOR'],
      iat: issuedAt,
      exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
    });
    expect(JSON.stringify(decoded.payload)).not.toMatch(
      /phone|password|permission|medical/i,
    );
  });

  it('validates a token into the request principal shape', async () => {
    await expect(service.verify(sign())).resolves.toEqual({
      userId,
      sessionId,
      roles: ['PATIENT'],
      tokenId,
      issuedAt,
      expiresAt: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
    });
  });

  it.each([
    [
      'expired token',
      { iat: issuedAt - 606, exp: issuedAt - 6 },
      'HS256',
      secret,
    ],
    ['wrong algorithm', {}, 'HS384', secret],
    ['wrong issuer', { iss: 'other-api' }, 'HS256', secret],
    ['wrong audience', { aud: 'other-client' }, 'HS256', secret],
    ['wrong signature', {}, 'HS256', wrongSecret],
    ['additional claim', { phone: '+989123456789' }, 'HS256', secret],
    ['extended lifetime', { exp: issuedAt + 3_600 }, 'HS256', secret],
    ['invalid role', { roles: ['SUPER_ADMIN'] }, 'HS256', secret],
    ['duplicate role', { roles: ['PATIENT', 'PATIENT'] }, 'HS256', secret],
    ['invalid session id', { sid: 'not-a-uuid' }, 'HS256', secret],
  ] as const)(
    'rejects %s with the same internal error',
    async (_name, overrides, algorithm, signingSecret) => {
      await expect(service.verify(sign(
        overrides,
        algorithm,
        signingSecret,
      ))).rejects.toEqual(new InvalidAccessTokenError());
    },
  );

  it('rejects malformed compact tokens without leaking parser details', async () => {
    await expect(service.verify('not-a-jwt')).rejects.toEqual(
      new InvalidAccessTokenError(),
    );
  });

  it('rejects oversized token input before parsing', async () => {
    await expect(service.verify('a'.repeat(4_097))).rejects.toEqual(
      new InvalidAccessTokenError(),
    );
  });

  it('refuses to issue tokens from malformed identity data', async () => {
    await expect(service.issue({
      userId: 'not-a-uuid',
      sessionId,
      roles: ['PATIENT'],
    })).rejects.toBeInstanceOf(TypeError);
  });

  it('rejects the documented placeholder secret during configuration', () => {
    const result = environmentValidationSchema.validate({
      DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
      JWT_ACCESS_SECRET:
        'replace-this-placeholder-with-a-unique-32-character-secret',
    });

    expect(result.error).toBeDefined();
  });
});
