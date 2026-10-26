import { describe, expect, it } from 'vitest';
import { priceFromInput, priceToInput } from './program-price';

describe('program price in toman', () => {
  it('converts Persian, Arabic, grouped and free prices to exact rial', () => {
    expect(priceFromInput('۱۵۰٬۰۰۰')).toBe('1500000');
    expect(priceFromInput('١٥٠,٠٠٠')).toBe('1500000');
    expect(priceFromInput('۰')).toBe('0');
  });
  it('round trips one-rial remainders and the exact financial maximum', () => {
    for (const rial of ['0', '1', '1500001', '9000000000000000000']) {
      expect(priceFromInput(priceToInput(rial))).toBe(rial);
    }
    expect(priceFromInput('۱۵۰۰۰۰٫۱')).toBe('1500001');
  });
  it('rejects negative, ambiguous, excessively precise and out-of-range amounts', () => {
    for (const value of ['', '-1', '1e5', '۱/۵', '1.25', '900000000000000000.1', 'abc']) expect(priceFromInput(value)).toBeNull();
  });
});
