import { describe, expect, it } from 'vitest';
import { entryRequestAllowed } from '../src/modules/patients/entry/patient-entry.guard';
import { entryRequired } from '../src/modules/patients/entry/patient-entry.service';
describe('Entry boundaries', () => {
  const date = new Date('2026-01-01');
  it('enforces only the configured cohort or started entry and preserves completion', () => {
    expect(entryRequired(true, date, new Date('2025-01-01'), false, false)).toBe(false);
    expect(entryRequired(true, date, new Date('2026-01-02'), false, false)).toBe(true);
    expect(entryRequired(true, date, new Date('2025-01-01'), true, false)).toBe(true);
    expect(entryRequired(true, date, new Date('2026-01-02'), true, true)).toBe(false);
    expect(entryRequired(false, date, new Date('2026-01-02'), true, false)).toBe(false);
  });
  it('allows exact bound operations, never another assessment or resource', () => {
    expect(entryRequestAllowed('GET', '/v1/assessment-submissions/owned/questionnaire', 'owned')).toBe(true);
    expect(entryRequestAllowed('POST', '/v1/assessment-submissions/owned/submit', 'owned')).toBe(true);
    expect(entryRequestAllowed('GET', '/v1/assessment-submissions/other', 'owned')).toBe(false);
    expect(entryRequestAllowed('GET', '/v1/patients/me/journey', 'owned')).toBe(false);
    expect(entryRequestAllowed('POST', '/v1/patients/me/entry/profile', null)).toBe(true);
    expect(entryRequestAllowed('GET', '/v1/patients/me/entry/profile/other', null)).toBe(false);
  });
  it('keeps exact account security operations usable before entry without opening patient features', () => {
    expect(entryRequestAllowed('GET', '/v1/me', null)).toBe(true);
    expect(entryRequestAllowed('PATCH', '/v1/me', null)).toBe(true);
    expect(entryRequestAllowed('POST', '/v1/me/change-password', null)).toBe(true);
    expect(entryRequestAllowed('POST', '/v1/me/change-password/other', null)).toBe(false);
    expect(entryRequestAllowed('GET', '/v1/patients/me/cart', null)).toBe(false);
  });
});
