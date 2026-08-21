import { describe, expect, it } from 'vitest';

import {
  InvalidPhoneNumberError,
  isCanonicalIranianMobile,
  normalizeIranianMobile,
} from '../src/modules/identity/domain/phone-number';

describe('Iranian mobile normalization', () => {
  it.each([
    ['+989123456789', '+989123456789'],
    ['09123456789', '+989123456789'],
    ['9123456789', '+989123456789'],
    ['989123456789', '+989123456789'],
    ['00989123456789', '+989123456789'],
    ['۰۹۱۲ ۳۴۵ ۶۷۸۹', '+989123456789'],
    ['٠٩١٢-٣٤٥-٦٧٨٩', '+989123456789'],
    ['۰۹۱۲ (۳۴۵) ۶۷۸۹', '+989123456789'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeIranianMobile(input)).toBe(expected);
  });

  it.each([
    '',
    '02112345678',
    '+12025550123',
    '0912345678',
    '091234567890',
    '0912abc6789',
    '09+123456789',
  ])('rejects invalid input without echoing it: %s', (input) => {
    expect(() => normalizeIranianMobile(input)).toThrow(InvalidPhoneNumberError);

    try {
      normalizeIranianMobile(input);
    } catch (error) {
      expect(error).toMatchObject({ code: 'INVALID_PHONE_NUMBER' });
      expect((error as Error).message).not.toContain(input || '0912');
    }
  });

  it('recognizes only the canonical representation', () => {
    expect(isCanonicalIranianMobile('+989123456789')).toBe(true);
    expect(isCanonicalIranianMobile('09123456789')).toBe(false);
    expect(isCanonicalIranianMobile('+98912345678')).toBe(false);
  });
});
