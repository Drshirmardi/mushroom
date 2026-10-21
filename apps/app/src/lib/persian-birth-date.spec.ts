import { describe, expect, it } from 'vitest';
import { persianBirthDate, persianDateParts } from './persian-birth-date';
describe('Persian birth date', () => {
  it('preserves the Nowruz date without a timezone shift', () => { expect(persianBirthDate(1403, 1, 1)).toBe('2024-03-20'); expect(persianDateParts(new Date('2024-03-20T00:00:00Z'))).toEqual({ year: 1403, month: 1, day: 1 }); });
  it('rejects invalid days rather than silently moving into the next month', () => { expect(persianBirthDate(1403, 7, 31)).toBeNull(); expect(persianBirthDate(1403, 0, 1)).toBeNull(); });
  it('supports the Persian leap day', () => { expect(persianBirthDate(1403, 12, 30)).toBe('2025-03-20'); });
});
