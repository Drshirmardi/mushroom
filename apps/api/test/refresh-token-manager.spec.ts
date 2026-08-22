import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import {
  HmacRefreshTokenManager,
  constantTimeRefreshHashEquals,
} from '../src/modules/identity/infrastructure/hmac-refresh-token-manager';

const pepper = 'test-only-refresh-pepper-that-is-independent-and-long-enough';

describe('HmacRefreshTokenManager', () => {
  const manager = new HmacRefreshTokenManager(new ConfigService({
    REFRESH_TOKEN_PEPPER: pepper,
  }));

  it('creates an opaque versioned token with a 256-bit verifier and HMAC only', () => {
    const material = manager.create();

    expect(material.rawToken).toMatch(
      /^v1\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/,
    );
    expect(material.rawToken).toContain(material.sessionId);
    expect(material.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(material.tokenHash).not.toContain(material.rawToken);
    expect(manager.inspect(material.rawToken)).toEqual({
      sessionId: material.sessionId,
      tokenHash: material.tokenHash,
    });
  });

  it('rotates the verifier without changing the session lookup id', () => {
    const first = manager.create();
    const second = manager.rotate(first.sessionId);

    expect(second.sessionId).toBe(first.sessionId);
    expect(second.rawToken).not.toBe(first.rawToken);
    expect(second.tokenHash).not.toBe(first.tokenHash);
  });

  it.each([
    '',
    'not-a-token',
    `v2.37694db4-23a5-4498-a49d-135fc98de279.${'a'.repeat(43)}`,
    `v1.not-a-uuid.${'a'.repeat(43)}`,
    `v1.37694db4-23a5-4498-a49d-135fc98de279.short`,
    'a'.repeat(129),
  ])('rejects malformed input without hashing it into a lookup', (token) => {
    expect(manager.inspect(token)).toBeNull();
  });

  it('binds stored hashes to an independent pepper', () => {
    const material = manager.create();
    const otherManager = new HmacRefreshTokenManager(new ConfigService({
      REFRESH_TOKEN_PEPPER:
        'another-independent-refresh-pepper-that-is-long-enough-for-tests',
    }));

    expect(otherManager.inspect(material.rawToken)?.tokenHash)
      .not.toBe(material.tokenHash);
  });

  it('compares well-formed hashes in constant-time and rejects malformed hashes', () => {
    const material = manager.create();

    expect(constantTimeRefreshHashEquals(
      material.tokenHash,
      material.tokenHash,
    )).toBe(true);
    expect(constantTimeRefreshHashEquals(
      material.tokenHash,
      '0'.repeat(64),
    )).toBe(false);
    expect(constantTimeRefreshHashEquals(material.tokenHash, 'malformed'))
      .toBe(false);
  });
});
