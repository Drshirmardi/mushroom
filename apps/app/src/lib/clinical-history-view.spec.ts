import { describe, expect, it } from 'vitest';
import { clinicalDate, recentClinicalHistory } from './clinical-history-view';
import type { PatientClinicalItem } from './clinical-history-api';

describe('clinical history presentation', () => {
  it('formats a valid Persian date and tolerates absent/malformed dates', () => {
    expect(clinicalDate('2026-11-01T10:00:00Z')).toMatch(/[۰-۹]/);
    expect(clinicalDate('invalid')).toBe('تاریخ ثبت نشده');
    expect(clinicalDate('')).toBe('تاریخ ثبت نشده');
  });
  it('sorts latest visits first without changing the server snapshot', () => {
    const items = ['2025-01-01', '2026-01-01', 'invalid'].map(
      (completedAt, index) =>
        ({ completedAt, appointmentId: String(index) }) as PatientClinicalItem,
    );
    expect(recentClinicalHistory(items).map((i) => i.appointmentId)).toEqual(['1', '0', '2']);
    expect(items[0].appointmentId).toBe('0');
  });
});
