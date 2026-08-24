import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  RefreshTokenManager,
  type InspectedRefreshToken,
  type RefreshTokenMaterial,
} from '../application/ports/refresh-token-manager';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFRESH_TOKEN_PATTERN = new RegExp(
  `^v1\\.(${UUID_PATTERN.source.slice(1, -1)})\\.([A-Za-z0-9_-]{43})$`,
  'i',
);

export const constantTimeRefreshHashEquals = (
  first: string,
  second: string,
): boolean => {
  if (!/^[0-9a-f]{64}$/i.test(first) || !/^[0-9a-f]{64}$/i.test(second)) {
    return false;
  }

  return timingSafeEqual(Buffer.from(first, 'hex'), Buffer.from(second, 'hex'));
};

@Injectable()
export class HmacRefreshTokenManager extends RefreshTokenManager {
  private readonly pepper: string;

  constructor(config: ConfigService) {
    super();
    this.pepper = config.getOrThrow<string>('REFRESH_TOKEN_PEPPER');
  }

  create(): RefreshTokenMaterial {
    return this.generate(randomUUID());
  }

  rotate(sessionId: string): RefreshTokenMaterial {
    if (!UUID_PATTERN.test(sessionId)) {
      throw new TypeError('Session id is invalid.');
    }

    return this.generate(sessionId);
  }

  inspect(rawToken: string): InspectedRefreshToken | null {
    if (rawToken.length > 128) return null;

    const match = REFRESH_TOKEN_PATTERN.exec(rawToken);
    if (!match?.[1]) return null;

    return {
      sessionId: match[1].toLowerCase(),
      tokenHash: this.hash(rawToken),
    };
  }

  private generate(sessionId: string): RefreshTokenMaterial {
    const verifier = randomBytes(32).toString('base64url');
    const rawToken = `v1.${sessionId}.${verifier}`;

    return {
      sessionId,
      rawToken,
      tokenHash: this.hash(rawToken),
    };
  }

  private hash(rawToken: string): string {
    return createHmac('sha256', this.pepper)
      .update(rawToken, 'utf8')
      .digest('hex');
  }
}
