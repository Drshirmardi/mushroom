import { expect, it } from 'vitest';
import { pricePreview, tehranInput, tehranInstant } from './program-schedule';
it('uses Tehran rather than the browser timezone and validates impossible dates', () => {
  expect(tehranInstant('2026-11-07T12:00')).toBe('2026-11-07T08:30:00.000Z');
  expect(tehranInput('2026-11-07T08:30:00Z')).toBe('2026-11-07T12:00');
  expect(tehranInstant('2026-02-30T12:00')).toBeNull();
  expect(tehranInstant('')).toBeNull();
});
it('previews integer money with exclusive discount ending and free final prices', () => {
  expect(pricePreview('2050001',25)).toBe('1537500');
  expect(pricePreview('2050000',100)).toBe('0');
  expect(pricePreview('2050000',25,null,'2026-11-07T09:00:00Z',new Date('2026-11-07T09:00:00Z'))).toBe('2050000');
});
