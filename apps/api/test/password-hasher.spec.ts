import { hash as argon2Hash, argon2id } from 'argon2';
import { describe, expect, it } from 'vitest';

import {
  ARGON2ID_HASH_OPTIONS,
  hashPassword,
  passwordHashNeedsRehash,
  verifyPassword,
} from '../src/modules/identity/infrastructure/password-hasher';

describe('Argon2id password hashing', () => {
  const password = 'correct horse battery staple';

  it('creates a salted Argon2id v19 hash with explicit cost parameters', async () => {
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).toMatch(/^\$argon2id\$v=19\$m=65536,p=4,t=3\$/);
    expect(secondHash).toMatch(/^\$argon2id\$v=19\$m=65536,p=4,t=3\$/);
    expect(firstHash).not.toBe(secondHash);
    expect(firstHash).not.toContain(password);
  });

  it('verifies the complete normalized password and rejects a mismatch', async () => {
    const decomposedPassword = `${'a'.repeat(14)}e\u0301 `;
    const encodedHash = await hashPassword(decomposedPassword);

    await expect(verifyPassword(
      encodedHash,
      `${'a'.repeat(14)}é `,
    )).resolves.toBe(true);
    await expect(verifyPassword(encodedHash, `${'a'.repeat(14)}é`))
      .resolves.toBe(false);
  });

  it('returns false instead of leaking malformed-hash details', async () => {
    await expect(verifyPassword('not-a-password-hash', password))
      .resolves.toBe(false);
  });

  it('detects hashes that use weaker or invalid parameters', async () => {
    const currentHash = await hashPassword(password);
    const weakHash = await argon2Hash(password, {
      ...ARGON2ID_HASH_OPTIONS,
      type: argon2id,
      memoryCost: 8_192,
      timeCost: 2,
      parallelism: 1,
    });

    expect(passwordHashNeedsRehash(currentHash)).toBe(false);
    expect(passwordHashNeedsRehash(weakHash)).toBe(true);
    expect(passwordHashNeedsRehash('invalid-hash')).toBe(true);
  });

  it('enforces policy before spending resources on hashing', async () => {
    await expect(hashPassword('too-short')).rejects.toMatchObject({
      code: 'PASSWORD_TOO_SHORT',
    });
  });
});
