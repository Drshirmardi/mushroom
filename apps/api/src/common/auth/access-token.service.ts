import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { isRoleCode, type RoleCode } from './authorization.policy';

export const ACCESS_TOKEN_ALGORITHM = 'HS256' as const;
export const ACCESS_TOKEN_TTL_SECONDS = 10 * 60;
export const ACCESS_TOKEN_CLOCK_TOLERANCE_SECONDS = 5;
export const DEFAULT_ACCESS_TOKEN_ISSUER = 'sabz-zendegi-api';
export const DEFAULT_ACCESS_TOKEN_AUDIENCE = 'sabz-zendegi-frontends';
export const ACCESS_TOKEN_CLOCK = Symbol('ACCESS_TOKEN_CLOCK');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_HEADER_KEYS = ['alg', 'typ'];
const ALLOWED_PAYLOAD_KEYS = [
  'aud',
  'exp',
  'iat',
  'iss',
  'jti',
  'roles',
  'sid',
  'sub',
];

export interface IssueAccessToken {
  userId: string;
  sessionId: string;
  roles: string[];
}

export interface AccessTokenPrincipal {
  userId: string;
  sessionId: string;
  roles: RoleCode[];
  tokenId: string;
  issuedAt: number;
  expiresAt: number;
}

interface CompleteJwt {
  header: {
    alg?: unknown;
    typ?: unknown;
    [key: string]: unknown;
  };
  payload: {
    iss?: unknown;
    aud?: unknown;
    sub?: unknown;
    sid?: unknown;
    roles?: unknown;
    jti?: unknown;
    iat?: unknown;
    exp?: unknown;
    [key: string]: unknown;
  };
  signature: string;
}

export class InvalidAccessTokenError extends Error {
  constructor() {
    super('Access token is invalid.');
    this.name = 'InvalidAccessTokenError';
  }
}

const hasExactKeys = (value: object, expectedKeys: string[]): boolean => {
  const keys = Object.keys(value).sort();

  return keys.length === expectedKeys.length
    && keys.every((key, index) => key === expectedKeys[index]);
};

const hasValidRoles = (roles: unknown): roles is RoleCode[] =>
  Array.isArray(roles)
  && roles.length > 0
  && new Set(roles).size === roles.length
  && roles.every(isRoleCode);

@Injectable()
export class AccessTokenService {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly now: () => Date;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
    @Optional()
    @Inject(ACCESS_TOKEN_CLOCK)
    now?: () => Date,
  ) {
    this.secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.issuer = config.get<string>(
      'JWT_ACCESS_ISSUER',
      DEFAULT_ACCESS_TOKEN_ISSUER,
    );
    this.audience = config.get<string>(
      'JWT_ACCESS_AUDIENCE',
      DEFAULT_ACCESS_TOKEN_AUDIENCE,
    );
    this.now = now ?? (() => new Date());
  }

  async issue(input: IssueAccessToken): Promise<string> {
    if (
      !UUID_PATTERN.test(input.userId)
      || !UUID_PATTERN.test(input.sessionId)
      || !hasValidRoles(input.roles)
    ) {
      throw new TypeError('Access token input is invalid.');
    }

    const issuedAt = Math.floor(this.now().getTime() / 1_000);

    return this.jwt.signAsync(
      {
        sid: input.sessionId,
        roles: [...input.roles],
        iat: issuedAt,
      },
      {
        secret: this.secret,
        algorithm: ACCESS_TOKEN_ALGORITHM,
        issuer: this.issuer,
        audience: this.audience,
        subject: input.userId,
        jwtid: randomUUID(),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        header: { alg: ACCESS_TOKEN_ALGORITHM, typ: 'JWT' },
      },
    );
  }

  async verify(token: string): Promise<AccessTokenPrincipal> {
    try {
      if (token.length === 0 || token.length > 4_096) {
        throw new InvalidAccessTokenError();
      }

      const currentTimestamp = Math.floor(this.now().getTime() / 1_000);
      const verified = await this.jwt.verifyAsync<CompleteJwt>(token, {
        secret: this.secret,
        algorithms: [ACCESS_TOKEN_ALGORITHM],
        issuer: this.issuer,
        audience: this.audience,
        clockTimestamp: currentTimestamp,
        clockTolerance: ACCESS_TOKEN_CLOCK_TOLERANCE_SECONDS,
        complete: true,
      });
      const { header, payload } = verified;

      if (
        !hasExactKeys(header, ALLOWED_HEADER_KEYS)
        || header.alg !== ACCESS_TOKEN_ALGORITHM
        || header.typ !== 'JWT'
        || !hasExactKeys(payload, ALLOWED_PAYLOAD_KEYS)
        || payload.iss !== this.issuer
        || payload.aud !== this.audience
        || typeof payload.sub !== 'string'
        || !UUID_PATTERN.test(payload.sub)
        || typeof payload.sid !== 'string'
        || !UUID_PATTERN.test(payload.sid)
        || typeof payload.jti !== 'string'
        || !UUID_PATTERN.test(payload.jti)
        || !hasValidRoles(payload.roles)
        || typeof payload.iat !== 'number'
        || !Number.isInteger(payload.iat)
        || typeof payload.exp !== 'number'
        || !Number.isInteger(payload.exp)
        || payload.exp - payload.iat !== ACCESS_TOKEN_TTL_SECONDS
        || payload.iat > currentTimestamp + ACCESS_TOKEN_CLOCK_TOLERANCE_SECONDS
      ) {
        throw new InvalidAccessTokenError();
      }

      return {
        userId: payload.sub,
        sessionId: payload.sid,
        roles: [...payload.roles],
        tokenId: payload.jti,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
      };
    } catch {
      throw new InvalidAccessTokenError();
    }
  }
}
