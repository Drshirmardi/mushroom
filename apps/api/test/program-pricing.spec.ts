import { expect, it } from 'vitest';
import { programPrice } from '../src/modules/programs/publication/program-pricing';

it('applies a percentage with an inclusive start and exclusive end using integer rial', () => {
  const policy = { amountRial: '2050001', discountPercent: 25, discountStartsAt: '2026-11-07T08:00:00Z', discountEndsAt: '2026-11-07T09:00:00Z' };
  expect(programPrice(policy, new Date('2026-11-07T07:59:59Z')).amountRial).toBe('2050001');
  expect(programPrice(policy, new Date(policy.discountStartsAt))).toEqual({ baseAmountRial: '2050001', discountPercent: 25, amountRial: '1537500' });
  expect(programPrice(policy, new Date(policy.discountEndsAt)).discountPercent).toBe(0);
});
it('handles free activation and large amounts without floating point rounding', () => {
  expect(programPrice({ amountRial: '9000000000000000000', discountPercent: 99, discountStartsAt: null, discountEndsAt: null }, new Date()).amountRial).toBe('90000000000000000');
  expect(programPrice({ amountRial: '2050000', discountPercent: 100, discountStartsAt: null, discountEndsAt: null }, new Date()).amountRial).toBe('0');
});
