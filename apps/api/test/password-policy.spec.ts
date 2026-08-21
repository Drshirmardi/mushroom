import { describe, expect, it } from 'vitest';

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordPolicyError,
  assertPasswordPolicy,
} from '../src/modules/identity/domain/password-policy';

describe('password policy', () => {
  it.each([
    'correct horse battery staple',
    'یک گذرواژه بسیار طولانی و امن',
    'گذرواژه‌ی فارسی با نیم‌فاصله',
    '😀'.repeat(PASSWORD_MIN_LENGTH),
    ` ${'a'.repeat(PASSWORD_MIN_LENGTH - 1)}`,
  ])('accepts a long password without composition rules', (password) => {
    expect(assertPasswordPolicy(password)).toBe(password.normalize('NFC'));
  });

  it('normalizes Unicode to NFC without trimming spaces', () => {
    const decomposed = `${'a'.repeat(14)}e\u0301 `;

    expect(assertPasswordPolicy(decomposed)).toBe(
      `${'a'.repeat(14)}é `,
    );
  });

  it.each([
    ['short', 'PASSWORD_TOO_SHORT'],
    ['a'.repeat(PASSWORD_MAX_LENGTH + 1), 'PASSWORD_TOO_LONG'],
    [`${'a'.repeat(15)}\n`, 'PASSWORD_UNSUPPORTED_CHARACTERS'],
    [' '.repeat(PASSWORD_MIN_LENGTH), 'PASSWORD_BLOCKED'],
    ['PasswordPassword', 'PASSWORD_BLOCKED'],
    ['123456789012345', 'PASSWORD_BLOCKED'],
  ] as const)('rejects invalid password policy input', (password, code) => {
    expect(() => assertPasswordPolicy(password)).toThrow(PasswordPolicyError);

    try {
      assertPasswordPolicy(password);
    } catch (error) {
      expect(error).toMatchObject({ code });
      expect((error as Error).message).not.toContain(password);
    }
  });

  it('supports contextual blocklist values without exposing them', () => {
    const password = 'clinic-specific-secret';

    expect(() => assertPasswordPolicy(password, {
      blockedValues: ['Clinic-Specific-Secret'],
    })).toThrow(expect.objectContaining({ code: 'PASSWORD_BLOCKED' }));
  });
});
